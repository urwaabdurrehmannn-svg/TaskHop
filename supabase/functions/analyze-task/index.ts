// TaskHop: AI task understanding.
//
// Turns a user's free-text title/description into structured suggestions
// (category, skills, difficulty, requirements, a possible deadline). Runs
// server-side ONLY -- this is the one place the Gemini API key may live.
// It must be set as an Edge Function secret (`supabase secrets set
// GEMINI_API_KEY=...`), never as an EXPO_PUBLIC_* variable, never
// bundled into the React Native app.
//
// Deploy: supabase functions deploy analyze-task
// Secret: supabase secrets set GEMINI_API_KEY=...

/// <reference path="../deno.d.ts" />
export {}; // Marks this file as an ES module so its top-level consts don't
           // leak into a shared global scope with other loose Deno files
           // (e.g. check-content/index.ts) in editors that fall back to
           // treating tsconfig-excluded scripts as one merged program.

// Same model as check-content/index.ts -- each Edge Function is deployed
// independently, so this is intentionally a local constant, not shared.
const GEMINI_MODEL = 'gemini-3.6-flash';

const CATEGORIES = [
  'Design & Creative',
  'Video & Photo',
  'Writing & Editing',
  'Tech & Dev',
  'Tutoring & Academics',
  'Events & Errands',
  'Music & Audio',
  'Other',
] as const;

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

interface AnalyzeTaskResult {
  category: string;
  skills: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  deadline_hint: string | null;
  requirements: string[];
  summary: string;
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
  // defense-in-depth check, not the primary guard.
  if (!req.headers.get('Authorization')) {
    return jsonResponse({ error: 'Missing authorization' }, 401);
  }

  let body: { title?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!title || !description) {
    return jsonResponse({ error: 'title and description are required' }, 400);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set as an Edge Function secret');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const systemInstruction =
    'You analyze short task descriptions posted on TaskHop, a campus skill-sharing marketplace, and extract ' +
    'structured information that helps match the task with the right helper. Be concise and practical -- skills ' +
    'should be short, common skill names, not sentences.';

  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: `Task title: ${title}\n\nTask description: ${description}` }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: CATEGORIES as unknown as string[] },
          skills: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '3-6 concise skill names required to complete this task',
          },
          difficulty: {
            type: 'STRING',
            enum: ['beginner', 'intermediate', 'advanced'],
          },
          deadline_hint: {
            type: 'STRING',
            nullable: true,
            description:
              'An ISO 8601 date (YYYY-MM-DD) if the description implies a concrete deadline, otherwise null',
          },
          requirements: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '2-5 short bullet points a helper should know before accepting',
          },
          summary: { type: 'STRING', description: 'One tightened sentence restating the task' },
        },
        required: ['category', 'skills', 'difficulty', 'deadline_hint', 'requirements', 'summary'],
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
      return jsonResponse({ error: 'AI analysis failed. Please try again.' }, 502);
    }

    const data: GeminiResponse = await geminiResponse.json();
    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) {
      throw new Error('Model returned no structured output');
    }

    const result = JSON.parse(textOut) as AnalyzeTaskResult;
    return jsonResponse({ result });
  } catch (err) {
    console.error('analyze-task failed', err);
    return jsonResponse({ error: 'AI analysis failed. Please try again.' }, 502);
  }
});
