# Recipe: Server-Side Execution Route Handler

**Use when:** Wiring the Next.js App Router API route that receives workspace JSON and returns a streamed response from AI SDK calls.

---

## The Minimal Route Handler

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60   // seconds — Vercel Hobby: 60s max

// Import block modules at module load time (NOT inside the handler)
import 'lib/blocks/generate-text'
import 'lib/blocks/model'
import 'lib/blocks/stream-text'
import 'lib/blocks/agent'
import 'lib/blocks/tool'
import 'lib/blocks/zod'

import { runEmitted } from 'lib/execute/run-emitted'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson)
}
```

## With Tool Stubs (Capstone / Agent Programs)

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60

import 'lib/blocks/generate-text'
import 'lib/blocks/model'
import 'lib/blocks/agent'
import 'lib/blocks/tool'
import 'lib/blocks/zod'

import { runEmitted }  from 'lib/execute/run-emitted'
import { searchStub }  from 'lib/tools/search'
import { fetchStub }   from 'lib/tools/fetch'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson, {
    tools: {
      search: searchStub,
      fetch:  fetchStub,
    },
  })
}
```

## What `runEmitted` Does Internally

```
1. Load Blockly workspace from workspaceJson
2. Call generateAsyncModule(workspace) → emitted ES module string
3. Strip import/export lines from the string
4. new Function('generateText, streamText, tool, ... __tools', strippedBody + '\nreturn run({...})')
5. Call with actual SDK modules + model factory + sink callback + tools
6. Pipe sink('output', value) calls into a ReadableStream
7. Return new Response(stream)
```

Generated code has zero access to `require`, `process`, `fs`, or any global not passed explicitly.

---

## Critical Rules

### Block imports MUST be at module load time

```ts
// WRONG — inside the handler, re-registers every request
export async function POST(req) {
  await import('lib/blocks/generate-text')  // wrong
  ...
}

// CORRECT — top-level, runs once at startup
import 'lib/blocks/generate-text'
export async function POST(req) { ... }
```

Blockly's block registry is a module-level singleton. Registering inside the handler either causes "block not defined" errors on the first request (if the import hasn't resolved yet) or re-registration warnings on subsequent requests.

### `runtime = 'nodejs'` is mandatory

Edge runtime lacks Node.js APIs that Blockly and the AI SDK require. Always set:

```ts
export const runtime = 'nodejs'
```

### Set `maxDuration` for multi-step agents

Multi-step agent calls can take 30–90 seconds. Set `maxDuration` to at least `60` (Hobby plan limit). Pro plan allows up to `800`.

---

## Environment Variables Required

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...        # only if using OpenAI blocks
```

---

## Links

- [Lesson 05: Deploy to Vercel](../lessons/05-deploy-to-vercel.md)
- [Recipe: Async Function Body Injection](recipe-async-function-body-injection.md)
- [Recipe: Tools Injection Import Map](recipe-tools-injection-import-map.md)
- [Checklist: Pre-Deploy](../checklists/pre-deploy-checklist.md)
- [Back to Index](../index.md)
