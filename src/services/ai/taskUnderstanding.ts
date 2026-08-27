import { supabase } from '../../lib/supabase';
import type { TaskCategory } from '../../types';

export type TaskDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TaskUnderstandingInput {
  title: string;
  description: string;
}

export interface TaskUnderstandingResult {
  suggestedCategory: TaskCategory;
  suggestedSkills: string[];
  summary: string;
  difficulty: TaskDifficulty;
  requirements: string[];
  /** ISO date (YYYY-MM-DD) if the model detected one, else null. Display-only for now -- not persisted. */
  suggestedDeadline: string | null;
}

interface AnalyzeTaskFunctionResult {
  category: TaskCategory;
  skills: string[];
  difficulty: TaskDifficulty;
  deadline_hint: string | null;
  requirements: string[];
  summary: string;
}

/**
 * Boundary for AI-powered task understanding. Calls the `analyze-task`
 * Supabase Edge Function, which holds the Anthropic API key server-side --
 * the key never enters the React Native app or an EXPO_PUBLIC_* variable.
 *
 * Takes just title/description (not the full CreateTaskInput): this runs
 * *before* the user has necessarily picked a category/skills/deadline --
 * that's the point, it suggests them.
 */
export async function analyzeTask(input: TaskUnderstandingInput): Promise<TaskUnderstandingResult> {
  const { data, error } = await supabase.functions.invoke<{ result: AnalyzeTaskFunctionResult }>(
    'analyze-task',
    { body: { title: input.title, description: input.description } }
  );

  if (error) throw error;
  if (!data?.result) throw new Error('AI analysis returned no result.');

  const result = data.result;
  return {
    suggestedCategory: result.category,
    suggestedSkills: result.skills,
    summary: result.summary,
    difficulty: result.difficulty,
    requirements: result.requirements,
    suggestedDeadline: result.deadline_hint,
  };
}
