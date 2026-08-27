import { supabase } from '../../lib/supabase';
import { fetchProfilesByIds } from '../profile/profileService';
import type { Review, ReviewStats } from '../../types/review';

const UNIQUE_VIOLATION = '23505';
const RLS_VIOLATION = '42501';

interface ReviewRow {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}

async function mapRows(rows: ReviewRow[]): Promise<Review[]> {
  if (rows.length === 0) return [];

  const reviewersById = await fetchProfilesByIds(rows.map((r) => r.reviewer_id));

  return rows
    .filter((r) => reviewersById.has(r.reviewer_id))
    .map((r) => ({
      id: r.id,
      taskId: r.task_id,
      reviewerId: r.reviewer_id,
      reviewer: reviewersById.get(r.reviewer_id)!,
      reviewedUserId: r.reviewed_user_id,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
    }));
}

/**
 * The RLS policy ("accepted participants can review each other after
 * completion", 0010_reviews.sql) independently re-verifies every condition
 * server-side -- reviewer identity, task completion, that `accepted = true`
 * on the connection, and that reviewedUserId is genuinely the other
 * participant. This function does not duplicate those checks; a mismatched
 * or premature attempt is rejected by the database, not by client logic.
 */
export async function submitReview(
  taskId: string,
  reviewerId: string,
  reviewedUserId: string,
  rating: number,
  body: string
): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    task_id: taskId,
    reviewer_id: reviewerId,
    reviewed_user_id: reviewedUserId,
    rating,
    body: body.trim() || null,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error("You've already reviewed this person for this task.");
    }
    if (error.code === RLS_VIOLATION) {
      throw new Error("This review can't be submitted right now.");
    }
    throw error;
  }
}

/** The current user's own review for a task, if they've already submitted one -- used to hide/disable the "Rate" action. */
export async function fetchMyReviewForTask(taskId: string, reviewerId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('task_id', taskId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [review] = await mapRows([data]);
  return review ?? null;
}

/** Every review a user has received, newest first -- for their profile's Reviews section. Publicly readable, see RLS. */
export async function fetchReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewed_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return mapRows(data ?? []);
}

/** Average rating + review count per user -- computed client-side from raw ratings, same pattern as fetchTasksPostedCounts. */
export async function fetchReviewStats(userIds: string[]): Promise<Map<string, ReviewStats>> {
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
