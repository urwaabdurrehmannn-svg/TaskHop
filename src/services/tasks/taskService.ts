import { supabase } from '../../lib/supabase';
import { normalizeSkillName } from '../../utils/skills';
import { fetchProfilesByIds } from '../profile/profileService';
import type {
  CreateTaskInput,
  ExchangeType,
  PaymentStatus,
  Skill,
  Task,
  TaskCategory,
  TaskStatus,
  User,
} from '../../types';

interface TaskRow {
  id: string;
  created_by: string;
  title: string;
  description: string;
  category: string;
  deadline: string | null;
  status: TaskStatus;
  exchange_type: ExchangeType;
  offered_skill: string | null;
  offered_amount: number | null;
  payment_status: PaymentStatus | null;
  created_at: string;
}

async function fetchSkillsForTasks(taskIds: string[]): Promise<Map<string, Skill[]>> {
  const map = new Map<string, Skill[]>();
  if (taskIds.length === 0) return map;

  const { data: links, error: linksError } = await supabase
    .from('task_skills')
    .select('task_id, skill_id')
    .in('task_id', taskIds);
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
    const existing = map.get(link.task_id) ?? [];
    existing.push(skill);
    map.set(link.task_id, existing);
  }

  return map;
}

function mapRowToTask(row: TaskRow, skills: Skill[], poster: User): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as TaskCategory,
    skills,
    deadline: row.deadline ?? '',
    status: row.status,
    poster,
    createdAt: row.created_at,
    matchCount: 0,
    exchangeType: row.exchange_type,
    offeredSkill: row.offered_skill,
    offeredAmount: row.offered_amount !== null ? Number(row.offered_amount) : null,
    paymentStatus: row.payment_status,
  };
}

/** The active-discovery feed excludes closed tasks -- direct lookups (fetchTaskById) intentionally don't, so history stays reachable. */
const ACTIVE_STATUSES: TaskStatus[] = ['open', 'matching', 'in_progress'];

export async function fetchTasks(): Promise<Task[]> {
  const { data: rows, error } = await supabase
    .from('tasks')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const taskIds = (rows ?? []).map((r) => r.id);
  const posterIds = (rows ?? []).map((r) => r.created_by);

  const [skillsByTask, postersById] = await Promise.all([
    fetchSkillsForTasks(taskIds),
    fetchProfilesByIds(posterIds),
  ]);

  return (rows ?? [])
    .filter((row) => postersById.has(row.created_by))
    .map((row) => mapRowToTask(row, skillsByTask.get(row.id) ?? [], postersById.get(row.created_by)!));
}

/** Every task the given user has posted, any status -- includes completed/cancelled as history. */
export async function fetchMyTasks(userId: string): Promise<Task[]> {
  const { data: rows, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('created_by', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const taskIds = (rows ?? []).map((r) => r.id);
  const [skillsByTask, postersById] = await Promise.all([
    fetchSkillsForTasks(taskIds),
    fetchProfilesByIds([userId]),
  ]);

  const poster = postersById.get(userId);
  if (!poster) return [];

  return (rows ?? []).map((row) => mapRowToTask(row, skillsByTask.get(row.id) ?? [], poster));
}

/**
 * Excludes soft-deleted tasks -- a permanently-deleted task must not be
 * reachable as an active/discoverable task anywhere in the app (Matches'
 * ownership check and TaskDetailsScreen's fallback lookup both go through
 * here). Existing conversation history is unaffected: messageService's
 * thread-meta lookup queries the tasks table independently and doesn't
 * filter on deleted_at, so an already-connected conversation keeps showing
 * the original task title/offer even after this.
 */
export async function fetchTaskById(taskId: string): Promise<Task | null> {
  const { data: row, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [skillsByTask, postersById] = await Promise.all([
    fetchSkillsForTasks([row.id]),
    fetchProfilesByIds([row.created_by]),
  ]);

  const poster = postersById.get(row.created_by);
  if (!poster) return null;

  return mapRowToTask(row, skillsByTask.get(row.id) ?? [], poster);
}

export async function createTask(input: CreateTaskInput, poster: User): Promise<Task> {
  const { data: insertedTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      created_by: poster.id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      deadline: input.deadline || null,
      status: 'open',
      exchange_type: input.exchangeType,
      offered_skill: input.exchangeType === 'skill' ? input.offeredSkill.trim() : null,
      offered_amount: input.exchangeType === 'money' ? Number(input.offeredAmount) : null,
      payment_status: input.exchangeType === 'money' ? 'payment_pending' : null,
    })
    .select('*')
    .single();
  if (insertError) throw insertError;

  const skillNames = Array.from(
    new Set(input.skills.map(normalizeSkillName).filter(Boolean))
  );

  let skills: Skill[] = [];
  if (skillNames.length > 0) {
    const { data: upsertedSkills, error: skillsError } = await supabase
      .from('skills')
      .upsert(
        skillNames.map((name) => ({ name })),
        { onConflict: 'name' }
      )
      .select('id, name');
    if (skillsError) throw skillsError;
    skills = upsertedSkills ?? [];

    const { error: linkError } = await supabase
      .from('task_skills')
      .insert(skills.map((s) => ({ task_id: insertedTask.id, skill_id: s.id })));
    if (linkError) throw linkError;
  }

  return mapRowToTask(insertedTask, skills, poster);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
}

/**
 * Soft delete: sets deleted_at instead of running DELETE FROM tasks. This
 * is deliberate -- task_interests.task_id is NOT NULL with ON DELETE
 * CASCADE (see 0002_task_interests.sql), so a real delete would cascade
 * into deleting every interest record and, through
 * messages.task_interest_id's own ON DELETE CASCADE (0004_messaging.sql),
 * every message in those threads. Never touching the row avoids that
 * entirely. Relies on the existing owner-only "users update their own
 * tasks" RLS policy -- if the caller doesn't own the task, this silently
 * updates zero rows rather than erroring, same as updateTaskStatus above.
 */
export async function permanentlyDeleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId);
  if (error) throw error;
}

export interface TaskValidationError {
  field: keyof CreateTaskInput;
  message: string;
}

export function validateTaskInput(input: CreateTaskInput): TaskValidationError[] {
  const errors: TaskValidationError[] = [];

  if (!input.title.trim()) {
    errors.push({ field: 'title', message: 'Give your task a clear title.' });
  } else if (input.title.trim().length < 6) {
    errors.push({ field: 'title', message: 'Title should be at least 6 characters.' });
  }

  if (!input.description.trim()) {
    errors.push({ field: 'description', message: 'Add a short description so helpers know what you need.' });
  } else if (input.description.trim().length < 20) {
    errors.push({ field: 'description', message: 'Add a bit more detail (20+ characters).' });
  }

  if (!input.category) {
    errors.push({ field: 'category', message: 'Choose a category.' });
  }

  if (input.skills.filter((s) => s.trim()).length === 0) {
    errors.push({ field: 'skills', message: 'Add at least one required skill.' });
  }

  if (!input.deadline) {
    errors.push({ field: 'deadline', message: 'Pick a deadline.' });
  }

  if (!input.exchangeType) {
    errors.push({ field: 'exchangeType', message: 'Choose what you\'re offering in exchange.' });
  } else if (input.exchangeType === 'skill') {
    if (!input.offeredSkill.trim()) {
      errors.push({ field: 'offeredSkill', message: 'Describe the skill or help you\'re offering in exchange.' });
    }
  } else if (input.exchangeType === 'money') {
    const amount = Number(input.offeredAmount);
    if (!input.offeredAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      errors.push({ field: 'offeredAmount', message: 'Enter a valid amount.' });
    }
  }

  return errors;
}
