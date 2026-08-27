import { supabase } from '../../lib/supabase';
import type { ReportReason } from '../../types/trust';

const UNIQUE_VIOLATION = '23505';

/**
 * reporter_id is always sent explicitly from the caller's own session id
 * (same pattern as expressInterest/sendMessage elsewhere in this app) --
 * RLS ("users create their own reports", 0009_trust_safety.sql) is what
 * actually prevents a mismatched value from being written, not this code.
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: ReportReason,
  description: string
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: 'user',
    reported_user_id: reportedUserId,
    reason,
    description: description.trim() || null,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error("You've already reported this person. Our team will review it.");
    }
    throw error;
  }
}

export async function reportTask(
  reporterId: string,
  taskId: string,
  reason: ReportReason,
  description: string
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: 'task',
    reported_task_id: taskId,
    reason,
    description: description.trim() || null,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error("You've already reported this task. Our team will review it.");
    }
    throw error;
  }
}
