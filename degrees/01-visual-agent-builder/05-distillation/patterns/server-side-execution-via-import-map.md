# Pattern: Server-side execution via injected import map (`run({ model, sink, tools })`)

**Category:** pattern — sandboxed execution architecture

## Problem it solves

A user-authored Blockly program is compiled to a JavaScript module that must be executed somewhere. Browser execution leaks API keys; full `vm` sandboxing is out of scope; `new Function(source)()` against the raw Node globals is too permissive (can `require()`, read `process.env`, etc.).

The compromise: emit a *parameterized* module with a single entry function `run({ ... })`. The executor passes in **exactly** the modules and side-effect channels the program is allowed to touch.

## The pattern

### What the emitter produces

```ts
import { generateText, streamText, tool, Output, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai }    from '@ai-sdk/openai'
import { z } from 'zod'

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  // ... user program ...
  __sink?.('output', (await generateText({ model: __model_provider('claude-haiku-4-5'), prompt: 'Hello' })).text)
}
```

### What the route handler does

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'

import 'lib/blocks/...'                        // module-load-time block registration
import { runEmitted } from 'lib/execute/run-emitted'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson)            // returns a streaming Response
}
```

### What `runEmitted` does

1. Load Blockly workspace from JSON, regenerate the source string.
2. Strip `import`/`export` syntax (the modules are injected, not imported).
3. Build a `new Function('argNames', body)` whose parameters are the SDK modules + a `sink` callback + a `tools` map of stubs (capstone).
4. Pipe `sink` calls into a `ReadableStream<Uint8Array>` and return `new Response(stream)`.

Generated code has zero access to `require`, `process`, `fs`, or any global it wasn't handed.

## Why the unified-sink shape

The same handler runs programs that may call `generateText` *or* `streamText` *or* a multi-step Agent. The route handler can't know in advance which. Every block routes its output through `__sink('label', value)` — the handler sees only the stream of (label, value) pairs and forwards them.

## Evidence

- `01-research/integration-blueprint.md` lines 11-37: the layered architecture diagram — Blockly is "authoring surface", the AI SDK runs server-side.
- `02-planning/risk-register.md` lines 60-74 (R4 "Sandbox Security"): "The executor passes a restricted import map — only `{ ai, @ai-sdk/anthropic, @ai-sdk/openai, zod }` — as the sole argument to `new Function`. Generated code cannot access `require`, `process`, `fs`, or any other Node global."
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 4-44: full data-flow diagram and `run-emitted.ts` responsibilities.
- `04-logs/decision-log.md` lines 139-145: L5 decision "Server-side Blockly headless execution strategy" — `new Blockly.Workspace()` works in Node; route handler imports block modules at module load time.
- `04-logs/decision-log.md` lines 147-153: L5 decision "Stream-back transport" — chose custom ReadableStream with sink callback over `toUIMessageStreamResponse` precisely because the unified-sink shape handles all three call types.
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 46-58: the signature extension `tools: __tools` was backward-compatible.

## Related

- [`patterns/tools-injection-stub-or-real.md`](tools-injection-stub-or-real.md)
- [`patterns/asyncfunction-body-injection-vs-temp-file.md`](asyncfunction-body-injection-vs-temp-file.md)
- [`anti-patterns/edge-runtime-for-multi-step-agents.md`](../anti-patterns/edge-runtime-for-multi-step-agents.md)
- [`anti-patterns/browser-side-llm-calls.md`](../anti-patterns/browser-side-llm-calls.md)
