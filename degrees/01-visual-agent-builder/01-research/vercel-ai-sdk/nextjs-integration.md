# Next.js Integration — App Router

## Core Route Handler Pattern (v6)

```ts
// app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    messages: await convertToModelMessages(messages),
    system: 'You are a helpful assistant.',
  });
  
  return result.toUIMessageStreamResponse();
}
```

**Why `convertToModelMessages`?** v5+ requires explicit conversion from `UIMessage` (client shape with `parts` array) to `ModelMessage` (server shape for provider). This was automatic in v4.

**Evidence:** `ai-sdk.dev/docs/getting-started/nextjs-app-router` — "install command pnpm add ai @ai-sdk/react zod. Add your key to `.env.local`: AI_GATEWAY_API_KEY. Route handler reads `messages` from request, converts them with `convertToModelMessages`, calls `streamText`, and returns `result.toUIMessageStreamResponse()`."

---

## Route Handler with Tools and Multi-Step

```ts
// app/api/agent/route.ts
import { streamText, UIMessage, convertToModelMessages, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { after } from 'next/server';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: await convertToModelMessages(messages),
    tools: {
      getWeather: tool({
        description: 'Get the current weather',
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, temperature: 72, condition: 'sunny' }),
      }),
    },
    stopWhen: stepCountIs(5),
  });
  
  return result.toUIMessageStreamResponse();
}
```

---

## ToolLoopAgent in a Route Handler (v6 pattern)

```ts
// app/api/agent/route.ts
import { createAgentUIStreamResponse } from 'ai';
import { weatherAgent } from '@/agent/weather-agent';

export async function POST(request: Request) {
  const { messages } = await request.json();
  
  return createAgentUIStreamResponse({
    agent: weatherAgent,
    uiMessages: messages,
  });
}
```

**Evidence:** `examples/next-agent/app/api/chat/route.ts` — exact production pattern from the AI SDK examples repo.

---

## UIMessage → Client Side (useChat)

```tsx
// app/components/chat.tsx
'use client';
import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  
  return (
    <div>
      {messages.map(message => (
        <div key={message.id} data-role={message.role}>
          {message.parts.map((part, i) => {
            if (part.type === 'text') return <span key={i}>{part.text}</span>;
            // handle tool-call, reasoning, file parts...
            return null;
          })}
        </div>
      ))}
      
      <input
        onKeyDown={e => {
          if (e.key === 'Enter') {
            sendMessage({ text: e.currentTarget.value });
            e.currentTarget.value = '';
          }
        }}
        disabled={status === 'streaming'}
      />
    </div>
  );
}
```

**Key points:**
- `messages` is `UIMessage[]` — each has `parts: Part[]`, not a flat `content` string
- `sendMessage` replaces old `handleSubmit` + `input` pattern
- `status` is `'idle' | 'submitted' | 'streaming' | 'error'`

---

## Server Actions vs Route Handlers

| | Route Handler (`app/api/.../route.ts`) | Server Action |
|-|---------------------------------------|---------------|
| When to use | Streaming responses, long-running, external clients | Form submits, mutations, quick non-streaming calls |
| Streaming | Yes, via Response + SSE | Limited streaming support in Next.js |
| HTTP verb control | Yes (GET, POST, etc.) | POST only |
| Called from | `fetch()`, `useChat` hooks | `<form action={}>`, direct call |
| Edge runtime | Yes | More limited |
| AI SDK streaming | `toUIMessageStreamResponse()` works | Cannot return streaming Response easily |

**Recommendation for Blockly/AI codegen use case:** Use Route Handlers. Server Actions work for non-streaming invocations (e.g., `generateText` for one-shot completions), but streaming requires Route Handlers.

---

## Edge Runtime Caveats

```ts
// To run on Vercel Edge (global CDN, faster cold starts):
export const runtime = 'edge';  // add to route.ts

// Caveats on Edge:
// 1. No Node.js APIs (no fs, no net.Socket, no process.env for certain vars)
// 2. Maximum execution time: 25s on Vercel's edge
// 3. Bundle size limit: 1MB
// 4. SQLite, Prisma, heavy ORM — NOT compatible
// 5. Provider packages and AI SDK — compatible (pure JS)
// 6. crypto.subtle available; crypto.createHash is NOT

// Default (no runtime export): Node.js runtime
// Max execution: 10s Vercel Hobby, 60s Pro, 900s Enterprise
```

**Recommendation:** For agent loops with multiple steps, use Node.js runtime (no `export const runtime = 'edge'`). Edge is suitable for simple streaming chat completions.

---

## Request Validation Pattern

```ts
import { z } from 'zod';

const requestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    // minimal validation — UIMessage is complex
  })),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return new Response('Invalid request', { status: 400 });
  }
  
  // ... rest of handler
}
```

---

## Rate Limiting Hint (Upstash)

The AI SDK examples repo includes `next-openai-upstash-rate-limits`. Pattern:

```ts
// Before calling streamText, check rate limit:
const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10s') });
const { success } = await ratelimit.limit(userId);
if (!success) return new Response('Rate limit exceeded', { status: 429 });
```

**Evidence:** `examples/next-openai-upstash-rate-limits` exists in the vercel/ai examples directory.

---

## Deployment on Vercel

1. Add `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` to Vercel project settings (not `.env.local`)
2. These are available server-side only (not exposed to browser)
3. Framework preset: Next.js (auto-detected)
4. No special Vercel config needed for streaming — it's native HTTP streaming
5. Vercel's AI Gateway requires `AI_GATEWAY_API_KEY` from their dashboard

**Streaming on Vercel:** Vercel supports streaming responses. `toUIMessageStreamResponse()` returns a standard `Response` object with SSE — no special Vercel-specific code needed. The edge network passes through streaming.
