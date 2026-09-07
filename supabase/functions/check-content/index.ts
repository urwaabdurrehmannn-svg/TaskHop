// TaskHop: AI content safety check.
//
// Classifies user-generated text (a task description, or a chat message)
// for potentially unsafe content -- scams/fraud, harassment, requests for
// illegal or dangerous activity, exploitation, suspicious off-platform
// payment requests, or other clearly unsafe content. Runs server-side
// ONLY -- this is the one place the Gemini API key may live. It must be set
// as an Edge Function secret (`supabase secrets set GEMINI_API_KEY=...`),
// never as an EXPO_PUBLIC_* variable, never bundled into the React Native
// app.
//
// This function only classifies -- it never blocks or deletes anything
// itself. The caller (src/services/ai/safety.ts) decides what, if
// anything, to do with the result. To disable this feature entirely without
// touching any code, just don't call it (or remove the secret so it
// fails closed via safety.ts's own error handling) -- no other feature
// depends on it.
//
// Deploy: supabase functions deploy check-content
// Secret: supabase secrets set GEMINI_API_KEY=...

/// <reference path="../deno.d.ts" />
export {}; // Marks this file as an ES module so its top-level consts don't
           // leak into a shared global scope with other loose Deno files
           // (e.g. analyze-task/index.ts) in editors that fall back to
           // treating tsconfig-excluded scripts as one merged program.

const GEMINI_MODEL = 'gemini-3.6-flash';

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

interface CheckContentResult {
  flagged: boolean;
  reason: string | null;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
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
  // analyze-task.
  if (!req.headers.get('Authorization')) {
    return jsonResponse({ error: 'Missing authorization' }, 401);
  }

  let body: { text?: unknown; contentType?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return jsonResponse({ error: 'text is required' }, 400);
  }

  const contentType = body.contentType === 'message' ? 'message' : 'task';

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set as an Edge Function secret');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const contentLabel = contentType === 'message' ? 'a chat message between two students' : 'a task description';

  const systemInstruction =
    'You are a content safety classifier for TaskHop, a campus skill-sharing and task marketplace for university ' +
    'students. You review ' +
    contentLabel +
    ' and decide whether it contains clearly unsafe content: scams or fraud, harassment or abuse, requests for ' +
    'illegal activity, requests for dangerous activities, inappropriate or exploitative requests, suspicious ' +
    'off-platform payment requests (e.g. wire transfers, gift cards, crypto to a stranger), or other clearly unsafe ' +
    'content. Ordinary tasks, casual conversation, and normal payment/skill-exchange terms for a peer marketplace ' +
    'are NOT unsafe -- only flag genuine safety concerns, not merely unusual or informal wording. Be conservative: ' +
    'when in doubt, do not flag.';

  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          flagged: {
            type: 'BOOLEAN',
            description: 'True only if the text contains clearly unsafe content as described above.',
          },
          reason: {
            type: 'STRING',
            nullable: true,
            description: 'A short (one sentence) explanation if flagged, otherwise null.',
          },
        },
        required: ['flagged', 'reason'],
      },
    },
  };

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
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => '');
      console.error('Gemini API returned an error', geminiResponse.status, errText);
      return jsonResponse({ error: 'Content safety check failed. Please try again.' }, 502);
    }

    const data: GeminiResponse = await geminiResponse.json();
    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) {
      throw new Error('Model returned no structured output');
    }

    const parsed = JSON.parse(textOut) as Partial<CheckContentResult>;
    const result: CheckContentResult = {
      flagged: parsed.flagged === true,
      reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : null,
    };

    return jsonResponse({ result });
  } catch (err) {
    console.error('check-content failed', err);
    return jsonResponse({ error: 'Content safety check failed. Please try again.' }, 502);
  }
});
