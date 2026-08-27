export interface SafetyCheckResult {
  flagged: boolean;
  reasons: string[];
}

/**
 * Boundary for content safety/risk detection (e.g. scam, harassment, or
 * off-platform-payment detection on task descriptions and messages before
 * they're posted).
 *
 * Always passes today -- no model is wired in yet. When one is, this should
 * call a server-side endpoint rather than an AI provider directly from the
 * app, for the same reason as taskUnderstanding.ts and matching.ts: the app
 * bundle is public, so provider API keys can never live in it.
 */
export async function checkContent(_text: string): Promise<SafetyCheckResult> {
  return { flagged: false, reasons: [] };
}
