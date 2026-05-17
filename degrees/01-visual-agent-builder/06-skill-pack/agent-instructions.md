# Agent Instructions — Visual Agent Builder Skill Pack

You are an LLM agent about to build a visual-AI tool that combines Google Blockly with the Vercel AI SDK to create a drag-and-drop programming interface for LLM programs.

---

## Mandatory Pre-Work (do not skip)

Before you write any code, read these files in this exact order:

1. `../05-distillation/before-you-build/before-you-build.md` — the pre-flight checklist; reads in under 10 minutes and prevents the most expensive mistakes.
2. `reference/v6-api-cheatsheet.md` — the v6 API rename table; memorize the "DO NOT emit" column.
3. The lesson corresponding to the feature you are building (e.g., `lessons/01-mount-blockly-safely.md` before touching Blockly mounts).

---

## The Single Biggest Risk: Stale API Names

Your training data is dominated by `ai@3.x` and `ai@4.x` patterns. The current pinned version is `ai@6.0.184`. These identifiers have been **renamed and you must not use them**:

| If you reach for this... | Use this instead |
|---|---|
| `parameters:` in `tool()` | `inputSchema:` |
| `maxSteps: N` | `stopWhen: stepCountIs(N)` |
| `generateObject(...)` | `generateText({ ..., output: Output.object({ schema }) })` |
| `result.object` | `result.output` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` |
| `CoreMessage` | `ModelMessage` |
| `maxTokens` | `maxOutputTokens` |
| `MockLanguageModelV1` | `MockLanguageModelV3` |
| `result.usage` (multi-step) | `result.totalUsage` |

**If you find yourself typing any identifier from the left column, STOP. Look up the right column in `reference/v6-api-cheatsheet.md`.**

---

## Verify the SDK Surface Before Writing Imports

Run this probe against the installed package before writing any import statement:

```bash
node -e "const ai=require('ai'); console.log(Object.keys(ai).filter(k=>k.toLowerCase().includes('step')||k.toLowerCase().includes('stop')||k.toLowerCase().includes('count')).sort().join('\n'))"
```

This is how the degree discovered that `stepCountIs` is the correct export, not `isStepCount` (the CHANGELOG was wrong). **The installed package beats every doc, including this one.**

---

## Day-One Regression Tests (first commit, not last)

Your project must have all of these before the first feature block is written:

1. **Forbidden-name grep** — greps every emitted code fixture for the left-column names above. See `recipes/recipe-forbidden-name-grep-test.md`.
2. **Version-pin assertion** — re-reads `package.json` and asserts exact version strings. See `recipes/recipe-pinning-ai-sdk-exactly.md`.
3. **Golden-output snapshots** — one per workspace fixture. See `lessons/00-tdd-discipline.md`.

The first commit should add these three test types. They are cheaper to add at the start than to retrofit.

---

## Architecture Non-Negotiables

These three decisions are not debatable. They are validated by six POCs and a production deployment:

### 1. All LLM calls run server-side

```
Browser -> workspace JSON -> POST /api/run (Node runtime) -> AI SDK -> provider
```

Never put `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in client-reachable code. Never use `NEXT_PUBLIC_` prefix for these keys.

### 2. Agent route is `runtime = 'nodejs'`, not `'edge'`

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60
```

A 5-step agent with 8s/step latency = 40s. Vercel Edge cap is 25s. The agent will be killed mid-run on Edge.

### 3. Generated code runs in an injected-import sandbox

```ts
const fn = new Function('generateText, streamText, tool, Output, z, stepCountIs, anthropic, openai, __model, __sink, __tools', body)
```

No `require`, no `process`, no `fs`. Only the modules you explicitly pass.

---

## Blockly in Next.js — Required Pattern

```tsx
// app/page.tsx
'use client'  // REQUIRED in Next.js 15 App Router

import dynamic from 'next/dynamic'

const BlocklyEditor = dynamic(() => import('../components/BlocklyEditor'), { ssr: false })
```

The `'use client'` directive is mandatory because `ssr: false` is not allowed in Server Components in Next.js 15. The dynamic import is mandatory because Blockly references `window` at module-load time.

---

## MockLanguageModelV3 Shape (four rules, all non-obvious)

When constructing test mocks:

```ts
// finishReason is an OBJECT, not a string
finishReason: { unified: 'stop' }       // correct
finishReason: 'stop'                     // WRONG — breaks Output.object parsing

// usage is NESTED
usage: { inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
         outputTokens: { total: 5, text: undefined, reasoning: undefined } }
// NOT: usage: { inputTokens: 10, outputTokens: 5 }

// text-delta chunks use delta:, not text:
{ type: 'text-start', id: 'text-1' }
{ type: 'text-delta', id: 'text-1', delta: 'Hello' }    // delta:, not text:
{ type: 'text-end',   id: 'text-1' }

// tool-call input is a JSON STRING, not an object
{ type: 'tool-call', toolCallId: 'tc_1', toolName: 'weather',
  input: JSON.stringify({ city: 'Tokyo' }) }    // string, not object

// mockValues takes spread args, not an array
doGenerate: mockValues(step1, step2)    // correct
doGenerate: mockValues([step1, step2])  // WRONG — first call returns the array
```

---

## Blockly Code Generator Rules

- Expression blocks (value inputs) return `[code, Order.FUNCTION_CALL]` — a 2-tuple.
- Statement blocks (stack connections) return `'code;\n'` — a string.
- Wrap programmatic workspace loads: `Blockly.Events.disable(); load(state, ws); Blockly.Events.enable()`.
- Field validators must return `null` to reject (not `undefined` — `undefined` silently accepts).

---

## Cost Safety

Every `generateText` call that includes `tools` must include `stopWhen`:

```ts
stopWhen: stepCountIs(5)  // always — default is isLoopFinished() which never stops
```

Log `result.totalUsage` (not `result.usage`) for multi-step runs. The difference matters.

---

## Version Pins (exact, no caret)

```json
{
  "ai":                "6.0.184",
  "@ai-sdk/anthropic": "3.0.78",
  "@ai-sdk/openai":    "3.0.64",
  "blockly":           "12.5.1",
  "next":              "15.3.2",
  "zod":               "^3.25.76"
}
```

Note: `@ai-sdk/openai@3.0.75` does not exist on npm. The correct pin is `3.0.64`.

---

## How to Use This Pack

- Start at `quickstart.md` for a 5-minute working program.
- Follow `curriculum.md` for the progressive learning path.
- Use `troubleshooting/` when you see an error you don't understand.
- Use `recipes/` for copy-paste patterns.
- Use `reference/v6-api-cheatsheet.md` every time you write an import or API call.

The full table of contents is at `index.md`.

---

## Links

- [Quickstart](quickstart.md)
- [Curriculum](curriculum.md)
- [v6 API Cheatsheet](reference/v6-api-cheatsheet.md)
- [Before You Build](../05-distillation/before-you-build/before-you-build.md)
- [Index](index.md)
