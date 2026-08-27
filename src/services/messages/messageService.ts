import { supabase } from '../../lib/supabase';
import { fetchProfilesByIds } from '../profile/profileService';
import type { ChatMessage, Conversation, ExchangeType, User } from '../../types';

interface MessageRow {
  id: string;
  task_interest_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface InterestRow {
  id: string;
  task_id: string;
  helper_id: string;
  created_at: string;
}

interface TaskRefRow {
  id: string;
  title: string;
  created_by: string;
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    taskInterestId: row.task_interest_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

async function fetchLatestMessageByThread(taskInterestIds: string[]): Promise<Map<string, ChatMessage>> {
  const map = new Map<string, ChatMessage>();
  if (taskInterestIds.length === 0) return map;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .in('task_interest_id', taskInterestIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  for (const row of data ?? []) {
    if (!map.has(row.task_interest_id)) {
      map.set(row.task_interest_id, mapMessageRow(row));
    }
  }
  return map;
}

/** Every thread the user is part of, either as the interested helper or as the owner of the task the interest is on. */
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const [{ data: asHelper, error: helperError }, { data: myTasks, error: myTasksError }] = await Promise.all([
    supabase.from('task_interests').select('id, task_id, helper_id, created_at').eq('helper_id', userId),
    supabase.from('tasks').select('id').eq('created_by', userId),
  ]);
  if (helperError) throw helperError;
  if (myTasksError) throw myTasksError;

  const myTaskIds = (myTasks ?? []).map((t) => t.id);
  let asOwner: InterestRow[] = [];
  if (myTaskIds.length > 0) {
    const { data, error } = await supabase
      .from('task_interests')
      .select('id, task_id, helper_id, created_at')
      .in('task_id', myTaskIds);
    if (error) throw error;
    asOwner = data ?? [];
  }

  const interests = [...(asHelper ?? []), ...asOwner];
  if (interests.length === 0) return [];

  const taskIds = Array.from(new Set(interests.map((i) => i.task_id)));
  const { data: taskRows, error: taskRowsError } = await supabase
    .from('tasks')
    .select('id, title, created_by')
    .in('id', taskIds);
  if (taskRowsError) throw taskRowsError;

  const tasksById = new Map((taskRows ?? []).map((t) => [t.id, t as TaskRefRow]));

  const otherUserIds = interests
    .map((i) => {
      const task = tasksById.get(i.task_id);
      if (!task) return null;
      return i.helper_id === userId ? task.created_by : i.helper_id;
    })
    .filter((id): id is string => !!id);

  const [othersById, lastMessageByThread] = await Promise.all([
    fetchProfilesByIds(otherUserIds),
    fetchLatestMessageByThread(interests.map((i) => i.id)),
  ]);

  const conversations: Conversation[] = interests
    .map((interest) => {
      const task = tasksById.get(interest.task_id);
      if (!task) return null;
      const otherUserId = interest.helper_id === userId ? task.created_by : interest.helper_id;
      const otherUser = othersById.get(otherUserId);
      if (!otherUser) return null;

      const lastMessage = lastMessageByThread.get(interest.id) ?? null;
      return {
        taskInterestId: interest.id,
        taskId: interest.task_id,
        taskTitle: task.title,
        otherUser,
        lastMessage,
        isUnread: lastMessage !== null && lastMessage.senderId !== userId,
      } satisfies Conversation;
    })
    .filter((c): c is Conversation => c !== null);

  return conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? '';
    const bTime = b.lastMessage?.createdAt ?? '';
    return bTime.localeCompare(aTime);
  });
}

export interface ThreadMeta {
  taskInterestId: string;
  taskId: string;
  taskTitle: string;
  /** The exchange agreed when the task was posted -- preserved here as the record both participants see. */
  exchangeType: ExchangeType;
  offeredSkill: string | null;
  offeredAmount: number | null;
  otherUser: User;
}

/** Header info for a single thread (other participant + task context), without pulling every conversation. */
export async function fetchThreadMeta(taskInterestId: string, userId: string): Promise<ThreadMeta | null> {
  const { data: interest, error: interestError } = await supabase
    .from('task_interests')
    .select('id, task_id, helper_id, created_at')
    .eq('id', taskInterestId)
    .maybeSingle();
  if (interestError) throw interestError;
  if (!interest) return null;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, created_by, exchange_type, offered_skill, offered_amount')
    .eq('id', interest.task_id)
    .maybeSingle();
  if (taskError) throw taskError;
  if (!task) return null;

  const otherUserId = interest.helper_id === userId ? task.created_by : interest.helper_id;
  const othersById = await fetchProfilesByIds([otherUserId]);
  const otherUser = othersById.get(otherUserId);
  if (!otherUser) return null;

  return {
    taskInterestId,
    taskId: task.id,
    taskTitle: task.title,
    exchangeType: task.exchange_type,
    offeredSkill: task.offered_skill,
    offeredAmount: task.offered_amount !== null ? Number(task.offered_amount) : null,
    otherUser,
  };
}

export async function fetchMessages(taskInterestId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('task_interest_id', taskInterestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
}

const RLS_VIOLATION = '42501';

export async function sendMessage(taskInterestId: string, senderId: string, body: string): Promise<ChatMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');

  const { data, error } = await supabase
    .from('messages')
    .insert({ task_interest_id: taskInterestId, sender_id: senderId, body: trimmed })
    .select('*')
    .single();
  if (error) {
    if (error.code === RLS_VIOLATION) {
      throw new Error("This message couldn't be sent.");
    }
    throw error;
  }

  return mapMessageRow(data);
}

/** Subscribes to new messages in a thread; returns an unsubscribe function for effect cleanup. */
export function subscribeToNewMessages(taskInterestId: string, onInsert: (message: ChatMessage) => void): () => void {
  const channel = supabase
    .channel(`messages:${taskInterestId}`)
    .on<MessageRow>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_interest_id=eq.${taskInterestId}` },
      (payload) => {
        onInsert(mapMessageRow(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
