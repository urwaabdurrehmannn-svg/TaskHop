// TaskHop: AI match re-ranking.
//
// Takes the deterministic candidate list already produced by
// services/matches/matchService.ts (skill-overlap scoring, block exclusion)
// and asks Gemini to re-order that SAME fixed set by genuine relevance to
// the task -- it never generates, adds, or independently scores candidates.
// Runs server-side ONLY -- this is the one place the Gemini API key may
// live. It must be set as an Edge Function secret (`supabase secrets set
// GEMINI_API_KEY=...`), never as an EXPO_PUBLIC_* variable, never bundled
// into the React Native app.
//
// The deterministic matcher (src/services/ai/matching.ts's rankMatches) is
// the caller and the fallback: if this function errors, times out, or
// returns anything malformed, the caller returns the original deterministic
// matches unchanged. This function does not need its own fallback logic --
// it can simply fail loudly (502/500) and let the caller handle it.
//
// Deploy: supabase functions deploy rank-matches
// Secret: supabase secrets set GEMINI_API_KEY=...

/// <reference path="../deno.d.ts" />
export {}; // Marks this file as an ES module so its top-level consts don't
           // leak into a shared global scope with other loose Deno files
           // (e.g. analyze-task/index.ts, check-content/index.ts) in
           // editors that fall back to treating tsconfig-excluded scripts
           // as one merged program.

const GEMINI_MODEL = 'gemini-3.6-flash'; // same model as analyze-task/check-content

const GEMINI_TIMEOUT_MS = 5000;
const MAX_CANDIDATES = 25; // defensive cap -- the caller only ever sends up to 5 today

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface CandidateInput {
  id: string;
  name: string;
  skills: string[];
  availability: string;
  score: number;
  reasons: string[];
}

interface TaskInput {
  title: string;
  description: string;
  category: string;
  skills: string[];
}

interface RankingEntry {
  candidateId: string;
  reason: string | null;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function parseTask(value: unknown): TaskInput | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const title = typeof v.title === 'string' ? v.title.trim() : '';
  const description = typeof v.description === 'string' ? v.description.trim() : '';
  if (!title || !description) return null;
  return {
    title,
    description,
    category: typeof v.category === 'string' ? v.category : '',
    skills: toStringArray(v.skills),
  };
}

function parseCandidates(value: unknown): CandidateInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const candidates: CandidateInput[] = [];
  for (const item of value.slice(0, MAX_CANDIDATES)) {
    if (!item || typeof item !== 'object') continue;
    const v = item as Record<string, unknown>;
    const id = typeof v.id === 'string' ? v.id.trim() : '';
    if (!id) continue;
    candidates.push({
      id,
      name: typeof v.name === 'string' ? v.name : '',
      skills: toStringArray(v.skills),
      availability: typeof v.availability === 'string' ? v.availability : '',
      score: typeof v.score === 'number' ? v.score : 0,
      reasons: toStringArray(v.reasons),
    });
  }

  return candidates.length > 0 ? candidates : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Supabase's Edge Runtime verifies the caller's Supabase auth JWT before
  // this function even runs (default project setting) -- this is a
  // defense-in-depth check, not the primary guard. Same pattern as
  // analyze-task/check-content.
  if (!req.headers.get('Authorization')) {
    return jsonResponse({ error: 'Missing authorization' }, 401);
  }

  let body: { task?: unknown; candidates?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const task = parseTask(body.task);
  if (!task) {
    return jsonResponse({ error: 'task.title and task.description are required' }, 400);
  }

  const candidates = parseCandidates(body.candidates);
  if (!candidates) {
    return jsonResponse({ error: 'candidates must be a non-empty array' }, 400);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set as an Edge Function secret');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const validIds = new Set(candidates.map((c) => c.id));

  const systemInstruction =
    'You are a matching assistant for TaskHop, a campus skill-sharing and task marketplace for university ' +
    'students. You are given one task and a FIXED list of already-qualified candidate helpers -- your only job ' +
    'is to re-order that exact list by genuine relevance to the task, using each candidate\'s skills, ' +
    'availability, and the task\'s description/category. Do not simply prefer whichever candidate already has ' +
    'the highest existing score if another candidate\'s actual skills fit the task better -- judge real fit, not ' +
    'the score. You must return every candidate ID from the provided list exactly once, best fit first -- never ' +
    'invent, omit, duplicate, or rename an ID, and never introduce an ID that was not given to you. For each, ' +
    'optionally give one short reason (12 words or fewer) grounded in the task, or null if there is nothing more ' +
    'specific to say than "good fit."';

  const userContent = JSON.stringify({
    task: {
      title: task.title,
      description: task.description,
      category: task.category,
      requiredSkills: task.skills,
    },
    candidates: candidates.map((c) => ({
      candidateId: c.id,
      name: c.name,
      skills: c.skills,
      availability: c.availability,
      existingScore: c.score,
      existingReasons: c.reasons,
    })),
  });

  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: userContent }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          ranking: {
            type: 'ARRAY',
            description: 'Every provided candidateId exactly once, ordered best fit first.',
            items: {
              type: 'OBJECT',
              properties: {
                candidateId: { type: 'STRING' },
                reason: { type: 'STRING', nullable: true },
              },
              required: ['candidateId', 'reason'],
            },
          },
        },
        required: ['ranking'],
      },
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    if (!geminiResponse.ok) {
      console.error('Gemini API returned an error', geminiResponse.status);
      return jsonResponse({ error: 'Match ranking failed.' }, 502);
    }

    const data: GeminiResponse = await geminiResponse.json();
    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) {
      throw new Error('Model returned no structured output');
    }

    const parsed = JSON.parse(textOut) as { ranking?: unknown };
    if (!Array.isArray(parsed.ranking)) {
      throw new Error('Model returned no ranking array');
    }

    // Reject/ignore any id the model returns that wasn't in the supplied
    // candidate list, and drop duplicates -- this is a fixed, closed set,
    // never an open one the model can extend.
    const seen = new Set<string>();
    const ranking: RankingEntry[] = [];
    for (const entry of parsed.ranking) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      const candidateId = typeof e.candidateId === 'string' ? e.candidateId : '';
      if (!candidateId || !validIds.has(candidateId) || seen.has(candidateId)) continue;
      seen.add(candidateId);
      ranking.push({
        candidateId,
        reason: typeof e.reason === 'string' && e.reason.trim() ? e.reason.trim() : null,
      });
    }

    return jsonResponse({ result: { ranking } });
  } catch (err) {
    console.error('rank-matches failed', err instanceof Error ? err.message : err);
    return jsonResponse({ error: 'Match ranking failed.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
