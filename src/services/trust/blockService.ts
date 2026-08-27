import { supabase } from '../../lib/supabase';
import { fetchProfilesByIds } from '../profile/profileService';
import type { BlockedUser } from '../../types/trust';

const UNIQUE_VIOLATION = '23505';

interface BlockRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) {
    throw new Error("You can't block yourself.");
  }

  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return; // already blocked -- treat as success
    throw error;
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw error;
}

/** Every user the given user has blocked, with profile info -- for the Blocked Users screen. */
export async function fetchMyBlocks(userId: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('id, blocker_id, blocked_id, created_at')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as BlockRow[];
  const profilesById = await fetchProfilesByIds(rows.map((r) => r.blocked_id));

  return rows
    .filter((r) => profilesById.has(r.blocked_id))
    .map((r) => ({ id: r.id, user: profilesById.get(r.blocked_id)!, createdAt: r.created_at }));
}

/**
 * Union of "users I've blocked" and "users who've blocked me" -- used to
 * exclude blocked pairs from Matches. Relies on the blocks SELECT policy
 * being visible to both sides of a block (0009_trust_safety.sql), so this
 * correctly picks up blocks initiated by the other party too.
 */
export async function fetchBlockedUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) throw error;

  const ids = new Set<string>();
  (data ?? []).forEach((r) => {
    ids.add(r.blocker_id === userId ? r.blocked_id : r.blocker_id);
  });
  return ids;
}
