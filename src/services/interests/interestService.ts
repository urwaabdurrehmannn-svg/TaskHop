import { supabase } from '../../lib/supabase';
import { fetchProfilesByIds } from '../profile/profileService';
import type { InterestInitiator, Task, TaskInterest } from '../../types';

interface InterestRow {
  id: string;
  task_id: string;
  helper_id: string;
  initiated_by: InterestInitiator;
  accepted: boolean;
  created_at: string;
}

const UNIQUE_VIOLATION = '23505';
const RLS_VIOLATION = '42501';

async function mapRows(rows: InterestRow[]): Promise<TaskInterest[]> {
  if (rows.length === 0) return [];

  const helpersById = await fetchProfilesByIds(rows.map((r) => r.helper_id));

  return rows
    .filter((r) => helpersById.has(r.helper_id))
    .map((r) => ({
      id: r.id,
      taskId: r.task_id,
      helper: helpersById.get(r.helper_id)!,
      initiatedBy: r.initiated_by,
      accepted: r.accepted,
      createdAt: r.created_at,
    }));
}

/** The current user's own interest row for a task, if they've expressed one. */
export async function fetchMyInterest(taskId: string, helperId: string): Promise<TaskInterest | null> {
  const { data, error } = await supabase
    .from('task_interests')
    .select('*')
    .eq('task_id', taskId)
    .eq('helper_id', helperId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [interest] = await mapRows([data]);
  return interest ?? null;
}

/** All helpers who've expressed interest in a task -- only readable by that task's owner (see RLS). */
export async function fetchInterestsForTask(taskId: string): Promise<TaskInterest[]> {
  const { data, error } = await supabase
    .from('task_interests')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return mapRows(data ?? []);
}

export async function expressInterest(task: Task, helperId: string): Promise<TaskInterest> {
  if (task.poster.id === helperId) {
    throw new Error("You can't express interest in your own task.");
  }
  if (task.status === 'completed' || task.status === 'cancelled') {
    throw new Error('This task is no longer accepting new interest.');
  }

  const existing = await fetchMyInterest(task.id, helperId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('task_interests')
    .insert({ task_id: task.id, helper_id: helperId })
    .select('*')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const already = await fetchMyInterest(task.id, helperId);
      if (already) return already;
    }
    if (error.code === RLS_VIOLATION) {
      throw new Error("You can't connect with this person right now.");
    }
    throw error;
  }

  const [interest] = await mapRows([data]);
  return interest;
}

/**
 * Owner-initiated counterpart to expressInterest(): the task owner invites a
 * specific matched candidate (e.g. from the Matches screen) instead of the
 * candidate opting in themselves. Writes the same task_interests row shape,
 * just tagged initiated_by = 'owner' -- RLS (see 0006_owner_invite.sql)
 * only allows this when the caller actually owns the referenced task.
 */
export async function inviteCandidate(task: Task, candidateId: string, ownerId: string): Promise<TaskInterest> {
  if (task.poster.id !== ownerId) {
    throw new Error('Only the task owner can invite a candidate.');
  }
  if (candidateId === ownerId) {
    throw new Error("You can't invite yourself.");
  }
  if (task.status === 'completed' || task.status === 'cancelled') {
    throw new Error('This task is no longer accepting new invites.');
  }

  const existing = await fetchMyInterest(task.id, candidateId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('task_interests')
    .insert({ task_id: task.id, helper_id: candidateId, initiated_by: 'owner' })
    .select('*')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const already = await fetchMyInterest(task.id, candidateId);
      if (already) return already;
    }
    if (error.code === RLS_VIOLATION) {
      throw new Error("You can't invite this person right now.");
    }
    throw error;
  }

  const [interest] = await mapRows([data]);
  return interest;
}

export async function withdrawInterest(taskId: string, helperId: string): Promise<void> {
  const { error } = await supabase
    .from('task_interests')
    .delete()
    .eq('task_id', taskId)
    .eq('helper_id', helperId);
  if (error) throw error;
}

/**
 * Marks this as the one connection the task owner actually worked with --
 * the prerequisite for either side becoming review-eligible later. Also
 * doubles as "reassign": if a different task_interest is currently
 * accepted, it's un-accepted as part of the same call.
 *
 * Calls the accept_helper() Postgres function (0010_reviews.sql) instead of
 * issuing two separate REST UPDATEs: the unaccept-old + accept-new pair now
 * runs as one transaction, so a dropped connection or a race between the
 * two writes can never leave the task with no accepted helper -- either
 * both happen or neither does. The function is SECURITY INVOKER, so the
 * same RLS policy that governed the old two-call version (owner-only,
 * status in ('open','matching')) still governs this -- the function adds
 * atomicity, not new authorization.
 */
export async function acceptHelper(taskId: string, taskInterestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_helper', {
    p_task_id: taskId,
    p_task_interest_id: taskInterestId,
  });
  if (error) {
    throw new Error(error.message || 'Could not accept this helper. Please try again.');
  }
}
