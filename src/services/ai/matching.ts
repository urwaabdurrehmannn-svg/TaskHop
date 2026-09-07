import type { Match, Task } from '../../types';
import { generateMatchesForTask } from '../matches/matchService';
import { supabase } from '../../lib/supabase';

const RANK_TIMEOUT_MS = 6000;
const MAX_REASONS = 4; // mirrors matchService's buildReasons() cap, so AI-boosted cards stay visually consistent

interface RankingEntry {
  candidateId: string;
  reason: string | null;
}

interface RankMatchesFunctionResult {
  ranking?: unknown;
}

function isValidRankingEntry(value: unknown): value is RankingEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.candidateId === 'string' &&
    (v.reason === null || v.reason === undefined || typeof v.reason === 'string')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('rank-matches timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * AI-powered re-ranking of the deterministic matches from
 * services/matches/matchService.ts. That deterministic matcher remains the
 * only source of *which* candidates qualify at all -- this function never
 * adds, removes, or independently scores candidates; it only sends that
 * same already-vetted, already-qualified set to the `rank-matches` Edge
 * Function and asks Gemini to reorder it by genuine task relevance, with an
 * optional one-line reason per candidate.
 *
 * Fails open to the deterministic result, completely unchanged, on any
 * error, timeout, or malformed/invalid response -- Find Matches must keep
 * working even if this call never succeeds. Only public, already-visible
 * data is sent (task title/description/category/skills, and each
 * candidate's id/name/skills/availability/existing score/existing reasons)
 * -- no email, tokens, keys, or unrelated profile data.
 */
export async function rankMatches(task: Task): Promise<Match[]> {
  const deterministicMatches = await generateMatchesForTask(task);
  if (deterministicMatches.length === 0) return deterministicMatches;

  try {
    const payload = {
      task: {
        title: task.title,
        description: task.description,
        category: task.category,
        skills: task.skills.map((s) => s.name),
      },
      candidates: deterministicMatches.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        skills: m.user.skills.map((s) => s.name),
        availability: m.user.availability,
        score: m.score,
        reasons: m.reasons.map((r) => r.label),
      })),
    };

    const { data, error } = await withTimeout(
      supabase.functions.invoke<{ result: RankMatchesFunctionResult }>('rank-matches', { body: payload }),
      RANK_TIMEOUT_MS
    );

    if (error || !data?.result || !Array.isArray(data.result.ranking)) {
      return deterministicMatches;
    }

    const matchById = new Map(deterministicMatches.map((m) => [m.user.id, m]));
    const validIds = new Set(matchById.keys());

    const seen = new Set<string>();
    const orderedIds: string[] = [];
    const reasonById = new Map<string, string>();

    for (const entry of data.result.ranking) {
      if (!isValidRankingEntry(entry)) continue;
      if (!validIds.has(entry.candidateId)) continue; // never allow AI to introduce/invent a candidate
      if (seen.has(entry.candidateId)) continue;
      seen.add(entry.candidateId);
      orderedIds.push(entry.candidateId);
      if (entry.reason && entry.reason.trim()) {
        reasonById.set(entry.candidateId, entry.reason.trim());
      }
    }

    // Any deterministic candidate the model didn't mention is appended at
    // the end, preserving its original relative order -- the AI can
    // reorder and annotate, but a qualified candidate can never vanish.
    for (const match of deterministicMatches) {
      if (!seen.has(match.user.id)) {
        seen.add(match.user.id);
        orderedIds.push(match.user.id);
      }
    }

    if (orderedIds.length !== deterministicMatches.length) {
      // Shouldn't be reachable given the loops above, but guard against any
      // future edit breaking that invariant -- never show an incomplete list.
      return deterministicMatches;
    }

    return orderedIds.map((id) => {
      const original = matchById.get(id)!;
      const aiReason = reasonById.get(id);
      if (!aiReason) return original;
      return {
        ...original,
        reasons: [{ id: `ai-${original.id}`, label: aiReason }, ...original.reasons].slice(0, MAX_REASONS),
      };
    });
  } catch {
    return deterministicMatches;
  }
}
