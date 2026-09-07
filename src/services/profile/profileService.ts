import { supabase } from '../../lib/supabase';
import { avatarColorFromId, initialsFromName } from '../../utils/userDisplay';
import { normalizeSkillName } from '../../utils/skills';
import type { Availability, CompletedTaskSummary, Skill, User } from '../../types';
import type { ReviewStats } from '../../types/review';

interface ProfileRow {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  availability: string;
  created_at: string;
}

function formatMemberSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

async function fetchSkillsForUsers(userIds: string[]): Promise<Map<string, Skill[]>> {
  const map = new Map<string, Skill[]>();
  if (userIds.length === 0) return map;

  const { data: links, error: linksError } = await supabase
    .from('user_skills')
    .select('user_id, skill_id')
    .in('user_id', userIds);
  if (linksError) throw linksError;

  const skillIds = Array.from(new Set((links ?? []).map((l) => l.skill_id)));
  if (skillIds.length === 0) return map;

  const { data: skillRows, error: skillsError } = await supabase
    .from('skills')
    .select('id, name')
    .in('id', skillIds);
  if (skillsError) throw skillsError;

  const skillsById = new Map((skillRows ?? []).map((s) => [s.id, { id: s.id, name: s.name }]));

  for (const link of links ?? []) {
    const skill = skillsById.get(link.skill_id);
    if (!skill) continue;
    const existing = map.get(link.user_id) ?? [];
    existing.push(skill);
    map.set(link.user_id, existing);
  }

  return map;
}

/** Counts each user's non-deleted tasks (any status -- completed/cancelled still count as posted, only permanently-deleted tasks don't). */
async function fetchTasksPostedCounts(userIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase
    .from('tasks')
    .select('created_by')
    .in('created_by', userIds)
    .is('deleted_at', null);
  if (error) throw error;

  for (const row of data ?? []) {
    map.set(row.created_by, (map.get(row.created_by) ?? 0) + 1);
  }
  return map;
}

/**
 * Each user's genuinely completed tasks, as the *accepted* helper on a
 * completed task -- mere interest never counts, only task_interests.accepted
 * = true joined to a completed task (same rule the old count-only version of
 * this function used). Each entry's rating comes from the task owner's
 * review of that user for that specific task, if one exists yet (0
 * otherwise, same "no fabricated rating" convention as mapRowToUser's
 * avgRating below).
 */
async function fetchCompletedTasksForUsers(userIds: string[]): Promise<Map<string, CompletedTaskSummary[]>> {
  const map = new Map<string, CompletedTaskSummary[]>();
  if (userIds.length === 0) return map;

  const { data: links, error: linksError } = await supabase
    .from('task_interests')
    .select('helper_id, task_id')
    .eq('accepted', true)
    .in('helper_id', userIds);
  if (linksError) throw linksError;

  const taskIds = Array.from(new Set((links ?? []).map((l) => l.task_id)));
  if (taskIds.length === 0) return map;

  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, category')
    .in('id', taskIds)
    .eq('status', 'completed');
  if (tasksError) throw tasksError;

  const completedTasksById = new Map((taskRows ?? []).map((t) => [t.id, t]));
  if (completedTasksById.size === 0) return map;

  const { data: reviewRows, error: reviewsError } = await supabase
    .from('reviews')
    .select('task_id, reviewed_user_id, rating')
    .in('reviewed_user_id', userIds)
    .in('task_id', Array.from(completedTasksById.keys()));
  if (reviewsError) throw reviewsError;

  const ratingByTaskAndUser = new Map(
    (reviewRows ?? []).map((r) => [`${r.task_id}:${r.reviewed_user_id}`, r.rating])
  );

  for (const link of links ?? []) {
    const task = completedTasksById.get(link.task_id);
    if (!task) continue;
    const existing = map.get(link.helper_id) ?? [];
    existing.push({
      id: task.id,
      title: task.title,
      category: task.category,
      rating: ratingByTaskAndUser.get(`${task.id}:${link.helper_id}`) ?? 0,
    });
    map.set(link.helper_id, existing);
  }
  return map;
}

/**
 * Average rating + review count per user, computed client-side from raw
 * ratings (same aggregation style as fetchTasksPostedCounts above). Defined
 * locally rather than imported from reviewService.ts to avoid a circular
 * module dependency (reviewService already imports fetchProfilesByIds from
 * this file).
 */
async function fetchReviewStatsForUsers(userIds: string[]): Promise<Map<string, ReviewStats>> {
  const map = new Map<string, ReviewStats>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase.from('reviews').select('reviewed_user_id, rating').in('reviewed_user_id', userIds);
  if (error) throw error;

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const existing = totals.get(row.reviewed_user_id) ?? { sum: 0, count: 0 };
    existing.sum += row.rating;
    existing.count += 1;
    totals.set(row.reviewed_user_id, existing);
  }

  for (const [userId, { sum, count }] of totals) {
    map.set(userId, { average: count > 0 ? sum / count : 0, count });
  }
  return map;
}

function mapRowToUser(
  row: ProfileRow,
  skills: Skill[],
  tasksPosted: number,
  completedTasks: CompletedTaskSummary[],
  reviewStats: ReviewStats | undefined
): User {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
    avatarColor: avatarColorFromId(row.id),
    initials: initialsFromName(row.name),
    bio: row.bio && row.bio.trim().length > 0 ? row.bio : 'No bio yet.',
    university: row.location ?? undefined,
    skills,
    availability: (row.availability as Availability) ?? 'available_now',
    stats: {
      tasksCompleted: completedTasks.length,
      tasksPosted,
      avgRating: reviewStats?.average ?? 0,
      reviewCount: reviewStats?.count ?? 0,
      // Response-time tracking still doesn't exist (no message-latency
      // aggregation) -- left at 0 rather than fabricated.
      responseTimeMins: 0,
    },
    completedTasks,
    memberSince: formatMemberSince(row.created_at),
  };
}

export async function fetchProfile(userId: string): Promise<User> {
  const { data: row, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;

  const [skillsByUser, postedByUser, completedByUser, reviewStatsByUser] = await Promise.all([
    fetchSkillsForUsers([userId]),
    fetchTasksPostedCounts([userId]),
    fetchCompletedTasksForUsers([userId]),
    fetchReviewStatsForUsers([userId]),
  ]);

  return mapRowToUser(
    row,
    skillsByUser.get(userId) ?? [],
    postedByUser.get(userId) ?? 0,
    completedByUser.get(userId) ?? [],
    reviewStatsByUser.get(userId)
  );
}

/** Single-user convenience wrapper for viewing someone else's profile. */
export async function fetchUserProfile(userId: string): Promise<User | null> {
  const map = await fetchProfilesByIds([userId]);
  return map.get(userId) ?? null;
}

export interface ProfilePatch {
  name?: string;
  bio?: string;
  location?: string;
  availability?: Availability;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

/**
 * Uploads a locally-picked image as the user's avatar and points their
 * profile at it. Always stored as "<userId>/avatar.jpg" (overwritten on
 * every re-upload via upsert) so old photos don't pile up in storage; a
 * cache-busting query param is appended to the stored URL so the new image
 * shows up immediately instead of a stale cached copy of the old one.
 */
export async function uploadAvatar(userId: string, fileUri: string): Promise<string> {
  const response = await fetch(fileUri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return avatarUrl;
}

/** Replaces the user's full skill set with the given names (upserts new skills as needed). */
export async function setUserSkills(userId: string, rawNames: string[]): Promise<Skill[]> {
  const names = Array.from(new Set(rawNames.map(normalizeSkillName).filter(Boolean)));

  let skills: Skill[] = [];
  if (names.length > 0) {
    const { data: upserted, error: upsertError } = await supabase
      .from('skills')
      .upsert(
        names.map((name) => ({ name })),
        { onConflict: 'name' }
      )
      .select('id, name');
    if (upsertError) throw upsertError;
    skills = upserted ?? [];
  }

  const { error: deleteError } = await supabase.from('user_skills').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (skills.length > 0) {
    const { error: insertError } = await supabase
      .from('user_skills')
      .insert(skills.map((s) => ({ user_id: userId, skill_id: s.id })));
    if (insertError) throw insertError;
  }

  return skills;
}

/** Other users' profiles for matching / discovery, excluding the given user. */
export async function fetchCandidateProfiles(excludeUserId: string, limit = 25): Promise<User[]> {
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', excludeUserId)
    .limit(limit);
  if (error) throw error;

  const ids = (rows ?? []).map((r) => r.id);
  const [skillsByUser, postedByUser, completedByUser, reviewStatsByUser] = await Promise.all([
    fetchSkillsForUsers(ids),
    fetchTasksPostedCounts(ids),
    fetchCompletedTasksForUsers(ids),
    fetchReviewStatsForUsers(ids),
  ]);

  return (rows ?? []).map((row) =>
    mapRowToUser(
      row,
      skillsByUser.get(row.id) ?? [],
      postedByUser.get(row.id) ?? 0,
      completedByUser.get(row.id) ?? [],
      reviewStatsByUser.get(row.id)
    )
  );
}

/** Batch profile lookup keyed by id, e.g. to resolve task posters in one round trip. */
export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, User>> {
  const uniqueIds = Array.from(new Set(ids));
  const map = new Map<string, User>();
  if (uniqueIds.length === 0) return map;

  const { data: rows, error } = await supabase.from('profiles').select('*').in('id', uniqueIds);
  if (error) throw error;

  const [skillsByUser, postedByUser, completedByUser, reviewStatsByUser] = await Promise.all([
    fetchSkillsForUsers(uniqueIds),
    fetchTasksPostedCounts(uniqueIds),
    fetchCompletedTasksForUsers(uniqueIds),
    fetchReviewStatsForUsers(uniqueIds),
  ]);

  for (const row of rows ?? []) {
    map.set(
      row.id,
      mapRowToUser(
        row,
        skillsByUser.get(row.id) ?? [],
        postedByUser.get(row.id) ?? 0,
        completedByUser.get(row.id) ?? [],
        reviewStatsByUser.get(row.id)
      )
    );
  }
  return map;
}
