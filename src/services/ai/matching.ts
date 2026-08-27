import type { Match, Task } from '../../types';
import { generateMatchesForTask } from '../matches/matchService';

/**
 * Boundary for AI-powered matching. Delegates to the real, deterministic
 * skill/availability scoring in services/matches/matchService.ts today.
 *
 * When a model-driven matcher is ready, swap this function's body to call a
 * server-side endpoint and merge/replace the deterministic score -- callers
 * (MatchesScreen) only depend on this signature, so the UI never needs to
 * change. Keep any model API key server-side.
 */
export async function rankMatches(task: Task): Promise<Match[]> {
  return generateMatchesForTask(task);
}
