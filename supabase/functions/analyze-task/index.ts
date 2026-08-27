// TaskHop: AI task understanding.
//
// Turns a user's free-text title/description into structured suggestions
// (category, skills, difficulty, requirements, a possible deadline). Runs
// server-side ONLY -- this is the one place the Anthropic API key may live.
// It must be set as an Edge Function secret (`supabase secrets set
// ANTHROPIC_API_KEY=...`), never as an EXPO_PUBLIC_* variable, never
// bundled into the React Native app.
//
// Deploy: supabase functions deploy analyze-task
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from 'npm:@anthropic-ai/sdk@0.120.0';

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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set as an Edge Function secret');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system:
        'You analyze short task descriptions posted on TaskHop, a campus skill-sharing marketplace, and extract structured information that helps match the task with the right helper. Be concise and practical -- skills should be short, common skill names, not sentences.',
      messages: [
        {
          role: 'user',
          content: `Task title: ${title}\n\nTask description: ${description}`,
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: CATEGORIES as unknown as string[] },
              skills: {
                type: 'array',
                items: { type: 'string' },
                description: '3-6 concise skill names required to complete this task',
              },
              difficulty: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
              },
              deadline_hint: {
                type: ['string', 'null'],
                description:
                  'An ISO 8601 date (YYYY-MM-DD) if the description implies a concrete deadline, otherwise null',
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: '2-5 short bullet points a helper should know before accepting',
              },
              summary: { type: 'string', description: 'One tightened sentence restating the task' },
            },
            required: ['category', 'skills', 'difficulty', 'deadline_hint', 'requirements', 'summary'],
            additionalProperties: false,
          },
        },
      },
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Model returned no structured output');
    }

    const result = JSON.parse(textBlock.text);
    return jsonResponse({ result });
  } catch (err) {
    console.error('analyze-task failed', err);
    return jsonResponse({ error: 'AI analysis failed. Please try again.' }, 502);
  }
});
