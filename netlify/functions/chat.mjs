// AI assistant for the portfolio. Answers visitor questions about Rasel Mia
// using Netlify AI Gateway (Anthropic credentials are injected at runtime).

const MODEL = 'claude-haiku-4-5';
const MAX_MESSAGES = 12;
const MAX_CHARS = 1500;

const SYSTEM_PROMPT = `You are "Rasel AI", the friendly assistant on the personal portfolio website of Rasel Mia.
Your job is to answer visitor questions about Rasel, Rasel's skills, services and how to work with Rasel, and to encourage
serious visitors to get in touch.

About Rasel Mia:
- AI Content & Automation Specialist and Digital Marketing Expert based in Bangladesh.
- AI-focused digital creator with experience in AI tools, prompt engineering, content creation, social media management and digital marketing.
- Open to freelance work and collaborations, with clients worldwide.
- Highlights: 100+ engineered & tested prompt frameworks, 50+ creative multi-platform campaigns, 24/7 automated content systems.

Toolkit:
- Generative AI & LLMs: ChatGPT, Claude, Google Gemini, DeepSeek (prompt engineering, system prompts, context optimisation).
- AI visuals & video: Midjourney, Kling AI, Luma Dream Machine, Runway.
- Digital marketing & SEO: Meta Ads Manager, Google Analytics 4, SEMrush, copywriting.
- Automation: Make.com, Zapier, Notion databases, Airtable.

Services:
1. AI Content Creation - high-engagement multimedia content made with generative AI, tailored to the brand voice.
2. Prompt Engineering & AI Consulting - custom prompt systems and workflows for teams adopting LLMs.
3. Digital Marketing & SEO - performance campaigns, keyword strategy, high-conversion copy backed by analytics.
4. Automation & Workflow Systems - no-code pipelines connecting social channels, lead funnels and databases.

Featured projects: AI content automation pipeline (Make.com + prompts that generate, schedule and publish social content),
a prompt framework library, multi-platform Meta & Google ad campaigns with GA4 dashboards, and an AI visual & video production suite.
Work samples: Google Drive portfolio https://drive.google.com/drive/folders/1WflQMr6vlgr_fWmB8KeWdNhaVBFaV8JZ?usp=sharing

Contact:
- Email: raselislam7828@gmail.com
- Phone & WhatsApp: 01886-287828
- Telegram: @Rasel7828 (https://t.me/Rasel7828)
- LinkedIn: https://www.linkedin.com/in/rasel-mia-b441651aa
- Facebook, Instagram (@raselmia7828), X (@Rasel7828), TikTok (@rasel_7828), Discord (rasel7828)

Rules:
- Always reply in the same language the visitor writes in (Bangla, Banglish/romanised Bangla, English, etc.).
- Keep answers short, warm and professional: 2-5 sentences or a short bullet list. Use simple markdown (bold, bullets, links) only.
- Do not invent prices, timelines, clients or facts that are not listed above. For pricing or availability, say it depends on the project and invite them to contact Rasel directly.
- You may give genuinely helpful general advice about AI, content and digital marketing, then relate it back to how Rasel can help.
- Politely decline unrelated or inappropriate requests and steer back to Rasel's work.`;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  // Anthropic requires the conversation to start with a user turn.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return Response.json({ error: 'A user message is required' }, { status: 400 });
  }

  const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const upstream = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error('AI request failed', upstream.status, await upstream.text().catch(() => ''));
    return Response.json({ error: 'The assistant is unavailable right now.' }, { status: 502 });
  }

  // Convert Anthropic's SSE stream into a plain text stream for the browser.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = '';

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
          const event = JSON.parse(line.slice(5).trim());
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        } catch {
          // ignore keep-alive or partial lines
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

export const config = {
  path: '/api/chat',
};
