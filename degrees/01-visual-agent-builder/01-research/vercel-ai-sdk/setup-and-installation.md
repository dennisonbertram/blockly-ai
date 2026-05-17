# Setup and Installation

## Node.js Requirement

Node.js >= 18 is required.

**Evidence:** `npm view ai@6.0.184 --json` returns `"engines": { "node": ">=18" }`.

## Packages to Install

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic zod
```

Pinned versions (2026-05-16):
```
ai@6.0.184
@ai-sdk/anthropic@3.0.78
@ai-sdk/openai@3.0.75
zod@^3.25.76 (or zod@^4.1.8)
```

For Next.js chat UIs:
```bash
npm install @ai-sdk/react
```

## TypeScript Configuration

Minimum `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2020"]
  }
}
```

The SDK uses modern TypeScript. `moduleResolution: "bundler"` is recommended for Next.js 13+ App Router projects. `strict: true` is strongly recommended — the tool() helper's type inference degrades without it.

## Environment Variables

```bash
# .env.local (Next.js) or .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AI...

# For AI Gateway (Vercel-hosted proxy — alternative to per-provider keys)
AI_GATEWAY_API_KEY=...
```

**CRITICAL:** These env vars must NEVER be exposed to the browser. In Next.js, only environment variables prefixed with `NEXT_PUBLIC_` are sent to the client. Do NOT use `NEXT_PUBLIC_OPENAI_API_KEY`.

## Minimal Working Example (Non-Streaming, Cheap Model)

```ts
// minimal-test.ts
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

async function main() {
  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    prompt: 'Say hello in exactly 5 words.',
    maxOutputTokens: 50,
  });
  
  console.log(result.text);
  console.log('Tokens used:', result.usage);
  console.log('Finish reason:', result.finishReason);
}

main().catch(console.error);
```

Run with:
```bash
ANTHROPIC_API_KEY=sk-ant-... npx tsx minimal-test.ts
```

Or with OpenAI:
```ts
import { openai } from '@ai-sdk/openai';
// replace: model: openai('gpt-4o-mini'),
```

## Using the AI Gateway (No per-provider key needed)

```ts
import { generateText, gateway } from 'ai';

const result = await generateText({
  model: gateway('anthropic/claude-haiku-4-5'),
  prompt: 'Say hello.',
});
```

Requires `AI_GATEWAY_API_KEY`. The Gateway is Vercel-hosted and routes to the right provider automatically.

## Directory Structure for Next.js Projects

```
my-app/
  app/
    api/
      chat/
        route.ts          ← AI SDK route handler (server)
    page.tsx              ← Client page with useChat
  components/
    chat.tsx              ← Chat UI component
  .env.local              ← API keys (NEVER commit)
  package.json
  tsconfig.json
```

## Verify Your Setup

After installation, verify imports resolve:

```bash
node -e "const {generateText} = require('ai'); console.log(typeof generateText)"
# Should print: function
```

Or for ESM:
```bash
node --input-type=module -e "import {generateText} from 'ai'; console.log(typeof generateText)"
```
