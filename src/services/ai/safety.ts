import { supabase } from '../../lib/supabase';

export interface SafetyCheckResult {
  flagged: boolean;
  reasons: string[];
}

export type ContentType = 'task' | 'message';

interface CheckContentFunctionResult {
  flagged: boolean;
  reason: string | null;
}

/**
 * Boundary for content safety/risk detection (e.g. scam, harassment, or
 * off-platform-payment detection on task descriptions and messages before
 * they're posted).
 *
 * Calls the `check-content` Supabase Edge Function, which holds the Gemini
 * API key server-side -- the key never enters the React Native app or an
 * EXPO_PUBLIC_* variable, same pattern as taskUnderstanding.ts's
 * analyze-task boundary.
 *
 * This only classifies -- it never blocks a post itself, and no caller
 * currently exists yet (wiring it into a screen is a separate step). Fails
 * open (never flags) on any error -- an AI outage or missing secret must
 * never prevent someone from posting a legitimate task/message.
 */
export async function checkContent(text: string, contentType: ContentType = 'task'): Promise<SafetyCheckResult> {
  const trimmed = text.trim();
  if (!trimmed) return { flagged: false, reasons: [] };

  try {
    const { data, error } = await supabase.functions.invoke<{ result: CheckContentFunctionResult }>(
      'check-content',
      { body: { text: trimmed, contentType } }
    );

    if (error || !data?.result) return { flagged: false, reasons: [] };

    const { flagged, reason } = data.result;
    return { flagged, reasons: reason ? [reason] : [] };
  } catch {
    return { flagged: false, reasons: [] };
  }
}
