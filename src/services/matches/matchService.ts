import type { Match, MatchReason, Task, User } from '../../types';
import { fetchCandidateProfiles } from '../profile/profileService';
import { fetchBlockedUserIds } from '../trust/blockService';

function normalize(name: string) {
  return name.trim().toLowerCase();
}

/** A candidate must clear this score to appear in Matches at all -- this is a relevance gate, not just a sort order. */
const MIN_MATCH_SCORE = 1;
const MAX_RESULTS = 5;

function skillOverlap(task: Task, user: User) {
  const taskSkillNames = task.skills.map((s) => normalize(s.name));
  return user.skills.filter((userSkill) => {
    const normalized = normalize(userSkill.name);
    return taskSkillNames.some(
      (taskSkill) => taskSkill.includes(normalized) || normalized.includes(taskSkill)
    );
  });
}

// Rating/completion tracking doesn't exist yet (no reviews or assignments
// table -- see profileService), so scoring leans on signals we can actually
// back with data. Unlike the old formula, there's no flat baseline: a
// candidate who shares none of the task's required skills scores 0 and is
// filtered out below, rather than still landing in the 30-58% range.
function scoreForUser(task: Task, user: User, matchedSkillCount: number) {
  if (task.skills.length === 0 || matchedSkillCount === 0) return 0;

  // Up to 70 points for how much of what's required this person actually covers.
  const coverageRatio = matchedSkillCount / task.skills.length;
  let score = coverageRatio * 70;

  // Up to 20 points for availability -- a light signal, not the main driver.
  if (user.availability === 'available_now') score += 20;
  else if (user.availability === 'available_soon') score += 8;

  // Up to 10 points as a light platform-activity signal.
  score += Math.min(user.stats.tasksPosted, 10) * 1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildReasons(user: User, matchedSkills: ReturnType<typeof skillOverlap>): MatchReason[] {
  const reasons: MatchReason[] = matchedSkills
    .slice(0, 3)
    .map((s) => ({ id: `skill-${s.id}`, label: s.name }));

  if (user.availability === 'available_now') {
    reasons.push({ id: 'avail', label: 'Available before deadline' });
  } else if (user.availability === 'available_soon') {
    reasons.push({ id: 'avail', label: 'Free up soon, fits your timeline' });
  }

  if (user.stats.tasksPosted >= 3) {
    reasons.push({ id: 'active', label: 'Active TaskHop member' });
  }

  return reasons.slice(0, 4);
}

/**
 * Real (non-AI) matching: ranks other users against a task's required
 * skills, availability, and platform activity. A candidate with no overlap
 * with the task's required skills is excluded entirely -- Matches only ever
 * shows people who genuinely qualify, never padded up to a fixed count.
 */
export async function generateMatchesForTask(task: Task): Promise<Match[]> {
  const [candidates, blockedIds] = await Promise.all([
    fetchCandidateProfiles(task.poster.id),
    fetchBlockedUserIds(task.poster.id),
  ]);

  // Blocked either direction (by the task owner or of the task owner) never
  // shows up as a candidate -- purely an exclusion, the scoring below is untouched.
  const eligibleCandidates = candidates.filter((user) => !blockedIds.has(user.id));

  const matches: Match[] = eligibleCandidates
    .map((user) => {
      const matchedSkills = skillOverlap(task, user);
      const score = scoreForUser(task, user, matchedSkills.length);
      return {
        id: `match-${task.id}-${user.id}`,
        taskId: task.id,
        user,
        score,
        reasons: buildReasons(user, matchedSkills),
      };
    })
    .filter((match) => match.score >= MIN_MATCH_SCORE);

  return matches.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}
