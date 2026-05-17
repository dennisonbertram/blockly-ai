# Lesson 05 — Deploy to Vercel

**Prerequisite:** [Lesson 04 — Multi-Step and Streaming](04-multi-step-and-streaming.md)
**Source:** L5 (deploy-to-vercel) implementation notes + surprises
**Risks retired:** R3 (Next.js 15 SSR), R10 (Edge 25s cap), R4 (sandbox security)

---

## The Route Handler Shape

The agent route handler has two mandatory declarations:

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'     // REQUIRED — not 'edge'
export const maxDuration = 60       // 60s on Hobby; increase on Pro

import { NextRequest } from 'next/server'
// block imports at module load time (side-effect imports register generators)
import 'lib/blocks/generate-text'
import 'lib/blocks/stream-text'
import 'lib/blocks/agent'
import 'lib/blocks/tool'
// ... etc.
import { runEmitted } from 'lib/execute/run-emitted'

export async function POST(req: NextRequest) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson)
}
```

**Why `runtime = 'nodejs'` is required:** A 5-step agent at 8s/step = 40s. Vercel Edge is capped at 25s on Hobby. Node runtime allows 60s on Hobby and more on Pro.

**Why block imports appear at module load time:** Blockly's block registry (`Blockly.Blocks`) is populated by side-effect imports. The route handler must import all block modules so they are registered before `workspaceToCode` runs server-side.

Source: `05-distillation/anti-patterns/edge-runtime-for-multi-step-agents.md`

---

## The `run-emitted` Executor

The executor performs four steps:

1. Load the workspace JSON into a headless `Blockly.Workspace` (no DOM needed for headless Blockly).
2. Call `generate(workspace)` to get the async module source string.
3. Strip `import`/`export` syntax; build a `new Function(argList, body)` with the AI SDK modules as positional parameters.
4. Return a `ReadableStream<Uint8Array>` — pipe `__sink` calls into it.

```ts
// lib/execute/run-emitted.ts (simplified)
import * as Blockly from 'blockly/core'
import { generate } from 'lib/codegen/generate'
import { generateText, streamText, tool, Output, stepCountIs, hasToolCall } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export function runEmitted(workspaceJson: object, extras?: { tools?: Record<string, Function> }) {
  const workspace = new Blockly.Workspace()
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(workspaceJson, workspace)
  Blockly.Events.enable()

  const source = generate(workspace)
  const body = source
    .split('\n')
    .filter(line => !line.startsWith('import '))
    .map(line => line.replace(/^export default /, ''))
    .join('\n') +
    '\nreturn run({ model: undefined, sink: __sink, tools: __tools });'

  const fn = new Function(
    'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __sink, __tools',
    body
  )

  let controller: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c },
  })

  const sink = (label: string, value: unknown) => {
    const chunk = JSON.stringify({ label, value }) + '\n'
    controller.enqueue(new TextEncoder().encode(chunk))
  }

  fn(generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, sink, extras?.tools ?? {})
    .then(() => controller.close())
    .catch((err: Error) => controller.error(err))

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
```

The generated code has zero access to `require`, `process`, `fs`, or any global not explicitly passed.

Source: `05-distillation/patterns/server-side-execution-via-import-map.md`

---

## `new Function` in Tests — The Two-Arg Form

When writing tests that call `new Function(...)` in a `happy-dom` environment, use the **comma-separated single string** form for arg names:

```ts
// WRONG — throws SyntaxError in happy-dom
const fn = new Function('generateText', 'streamText', 'tool', body)

// CORRECT — works everywhere including happy-dom
const fn = new Function('generateText, streamText, tool', body)
```

happy-dom's `Function` constructor does not implement the multi-string-arg form. The two-arg comma-list form works in Node, browsers, and happy-dom.

Source: `05-distillation/gotchas/new-function-two-arg-string-in-happy-dom.md`

---

## Environment Variables

Set these in Vercel Project Settings (never with `NEXT_PUBLIC_` prefix):

```
ANTHROPIC_API_KEY = sk-ant-...
OPENAI_API_KEY    = sk-...
```

In local development, put them in `.env.local` (never commit this file).

The provider factories read keys from `process.env` automatically:
```ts
anthropic('claude-haiku-4-5')  // reads ANTHROPIC_API_KEY from process.env
openai('gpt-4o-mini')          // reads OPENAI_API_KEY from process.env
```

Source: `05-distillation/anti-patterns/browser-side-llm-calls.md`

---

## `next build` Success Criteria

Before deploying:

```bash
npm run build
```

Must complete with exit code 0. The output table should show:
- `/api/run` — listed as a server function (not a client chunk)
- The page bundle size — Blockly should appear only in client chunks

**TypeScript strict mode surprises:** `next build` runs `tsc --noEmit` which is stricter than esbuild. Two specific issues found in L5:
1. Unused locals fail the build. Remove them.
2. `as const` on the toolbox configuration produces a `readonly` type that `Blockly.inject` rejects. Drop the `as const`.

Source: `03-pocs/L5-deploy-to-vercel/implementation-notes.md`

---

## Deploy Steps

```bash
npx vercel login          # one-time device-code flow
npx vercel link           # link local project to Vercel project
npx vercel deploy --prod --yes
```

The first deploy creates the project. Subsequent deploys promote a new build.

---

## Post-Deploy Verification

Run a live smoke test:

```bash
curl -X POST https://<your-project>.vercel.app/api/run \
  -H 'content-type: application/json' \
  --no-buffer \
  -d '{"workspaceJson": <workspace-json-here>}'
```

Expect streaming text chunks. If you get HTML, the route handler errored — check Vercel logs with `vercel logs --follow`.

---

## Pre-Deploy Checklist

Before every deploy, verify:
- [ ] `'use client'` on the page file importing `BlocklyEditor`
- [ ] `next/dynamic({ ssr: false })` for the `BlocklyEditor` component
- [ ] `runtime = 'nodejs'` on `app/api/run/route.ts`
- [ ] `maxDuration = 60` on the route
- [ ] Exact version pins in `package.json` (no caret on `ai`, `@ai-sdk/*`, `blockly`)
- [ ] `npm run build` passes locally
- [ ] All tests pass (pnpm test)
- [ ] API keys set in Vercel project settings

See [checklists/pre-deploy-checklist.md](../checklists/pre-deploy-checklist.md) for the full list.

---

## Exercise

1. Confirm your `app/api/run/route.ts` has `runtime = 'nodejs'` and `maxDuration = 60`.
2. Run `next build` and verify it completes without Blockly SSR errors.
3. Deploy to Vercel and run the live smoke test.
4. Tail the Vercel logs during the first real run and confirm `result.totalUsage` is logged.

See [labs/lab-04-swap-providers.md](../labs/lab-04-swap-providers.md) for a post-deploy provider swap exercise.

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Previous Lesson: Multi-Step and Streaming](04-multi-step-and-streaming.md)
- [Next Lesson: The Capstone Research Agent](06-the-capstone-research-agent.md)
- [Checklist: Pre-Deploy](../checklists/pre-deploy-checklist.md)
- [Recipe: Server-Side Execution Route Handler](../recipes/recipe-server-side-execution-route-handler.md)
- [Recipe: Async Function Body Injection](../recipes/recipe-async-function-body-injection.md)
- [Troubleshooting: Route Handler Times Out](../troubleshooting/symptom-route-handler-times-out.md)
