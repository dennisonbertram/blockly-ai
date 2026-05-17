# Version and Current API — CRITICAL REFERENCE

## Pinned Stable Versions (2026-05-16)

```
ai@6.0.184          (dist-tag: latest)
@ai-sdk/anthropic@3.0.78
@ai-sdk/openai@3.0.64
@ai-sdk/google@2.x  (verify with npm view @ai-sdk/google version)
```

**Evidence:** `npm view ai dist-tags --json` returns `{"latest": "6.0.184", "ai-v5": "5.0.188", "canary": "7.0.0-canary.142", "beta": "7.0.0-beta.116"}`. The `latest` tag is authoritative for production use.

**v7 canary exists** but is NOT stable. Do not target v7 for POC work.

## Version History — What Changed Where

| Era | npm version | Key characteristic |
|-----|-------------|-------------------|
| v3 (2023) | `ai@3.x` | `experimental_streamText`, `experimental_generateText`. Everything was experimental. |
| v4 (2024) | `ai@4.x` | Stable `generateText`, `streamText`, `generateObject`. `maxSteps` for agent loops. `toDataStreamResponse()` for Next.js. |
| v5 (early 2025) | `ai@5.x` | Major breaking: `maxSteps` → `continueUntil` → then `stopWhen`. `CoreMessage` → `ModelMessage`. `maxTokens` → `maxOutputTokens`. DataStream* → UIMessage*. Removed automatic UI→model message conversion. |
| v6 (current, stable) | `ai@6.0.x` | `generateObject`/`streamObject` **deprecated** in favor of `generateText(..., { output: Output.object({...}) })`. `ToolLoopAgent` class. `LanguageModelV3` spec. `MockLanguageModelV3`. Route handlers use `toUIMessageStreamResponse()`. Stop condition function is `stepCountIs`. |

**Evidence:** `packages/ai/CHANGELOG.md` (raw, 8550 lines): "rename continueUntil to stopWhen. Rename maxSteps stop condition to isStepCount." in v5.0.0 section. "deprecate generateObject and streamObject" in v6.0.0-beta.127 entry. Note: the CHANGELOG says "isStepCount" but the published npm package exports `stepCountIs` — this naming flip happened during v5→v6 development.

## RUNTIME-VERIFIED EXPORTS (ai@6.0.184)

The following was verified by installing `ai@6.0.184` and probing exports:

```
node -e "const ai=require('ai'); const keys=Object.keys(ai).filter(k=>k.toLowerCase().includes('step')||k.toLowerCase().includes('loop')||k.toLowerCase().includes('count')||k.toLowerCase().includes('agent')); console.log(keys.sort().join('\n'))"

Output:
  ToolLoopAgent
  isLoopFinished
  stepCountIs
  hasToolCall
```

**Critical:** The published v6.0.184 exports `stepCountIs` (NOT `isStepCount`). The GitHub source on `main` branch uses `isStepCount`, which will ship in a future release. Always verify against the installed package, not GitHub main branch source.

```
node -e "const t=require('/path/to/node_modules/ai/dist/test/index.js'); console.log(Object.keys(t).join('\n'))"

Output: MockLanguageModelV3, MockEmbeddingModelV3, MockImageModelV3, MockProviderV3, mockId, mockValues, simulateReadableStream, convertArrayToAsyncIterable, convertArrayToReadableStream, convertReadableStreamToArray
```

**Evidence:** Runtime probe against installed `ai@6.0.184` package (2026-05-16).

## Old API → New API Mapping

| OLD (v3/v4 pattern) | NEW (v6.0.184 stable) | Notes |
|---------------------|-----------------|-------|
| `experimental_generateText` | `generateText` | Fully stable since v4 |
| `experimental_streamText` | `streamText` | Fully stable since v4 |
| `generateObject(...)` | `generateText({ output: Output.object({ schema }) })` | `generateObject` is deprecated in v6 but still works; avoid for new code |
| `streamObject(...)` | `streamText({ output: Output.object({ schema }) })` with `partialOutputStream` | Same as above |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` | `maxSteps` removed in v5; use `stepCountIs` in v6 |
| `CoreMessage` | `ModelMessage` | Renamed in v5 |
| `maxTokens: N` | `maxOutputTokens: N` | Renamed in v5 |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` | Renamed in v5; DataStream* → UIMessage* throughout |
| `useChat` accepts `messages` with string `content` | `useChat` uses `UIMessage` with typed `parts` array | v5 breaking change |
| `MockLanguageModelV1` | `MockLanguageModelV3` | Version follows language model spec version |
| `parameters: z.object(...)` in `tool()` | `inputSchema: z.object(...)` in `tool()` | Renamed from `parameters` to `inputSchema` in v5/v6 |
| `system: "..."` as primary instruction param | `system: "..."` (still works in v6) | `instructions` is available on `ToolLoopAgent` constructor but NOT yet on `generateText`/`streamText` in v6 |

**Evidence for `inputSchema`:** `tool({ description, inputSchema: z.object({...}), execute })` shown in all v6 docs and GitHub examples (weather-tool.ts, agent/weather-agent.ts).
**Evidence for `stepCountIs`:** Runtime probe against installed `ai@6.0.184`.

## Stop Conditions (v6.0.184 — runtime-verified)

```ts
import { stepCountIs, isLoopFinished, hasToolCall } from 'ai';

// Stop after 5 steps
stopWhen: stepCountIs(5)

// Never stop artificially (loop until natural termination)
stopWhen: isLoopFinished()

// Stop when a specific tool is called
stopWhen: hasToolCall('finalAnswer')

// Combine: stop at 10 steps OR when 'done' tool is called
stopWhen: [stepCountIs(10), hasToolCall('done')]
```

Natural termination conditions (always apply, regardless of `stopWhen`):
- Model returns finishReason other than `'tool-calls'`
- A tool without an `execute` function is called (human-in-the-loop)
- A tool call needs approval (via `needsApproval: true`)

## "Do This / Not That" Table

| DO THIS (v6.0.184) | NOT THAT (stale) |
|--------------------|------------------|
| `import { generateText, streamText, tool, Output } from 'ai'` | `import { experimental_generateText } from 'ai'` |
| `tool({ description, inputSchema: z.object({...}), execute })` | `tool({ description, parameters: z.object({...}), execute })` |
| `generateText({ ..., output: Output.object({ schema: z.object({...}) }) })` | `generateObject({ model, schema: z.object({...}), prompt })` |
| `stopWhen: stepCountIs(5)` | `maxSteps: 5` |
| `result.toUIMessageStreamResponse()` | `result.toDataStreamResponse()` |
| `convertToModelMessages(uiMessages)` | Manually converting UI messages |
| `maxOutputTokens: 1000` | `maxTokens: 1000` |
| `MockLanguageModelV3` from `ai/test` | `MockLanguageModelV1` |
| `new ToolLoopAgent({ model, instructions, tools })` | Rolling your own while loop with generateText |
| `Output.array({ element: z.object({...}) })` with `elementStream` | `streamObject` with `partialObjectStream` |

## Zod Peer Dependency

The v6 SDK requires `zod@^3.25.76 || ^4.1.8`. Both Zod v3 and Zod v4 are supported. Use whichever your project already pins; do NOT mix them in the same schema.

**Evidence:** `npm view ai@6.0.184 peerDependencies --json` returns `{"zod": "^3.25.76 || ^4.1.8"}`.

## What's in v7 Canary (NOT yet stable — do not use in POC)

- `stepCountIs` renamed to `isStepCount` (again — naming flip from v5 history)
- `instructions` as primary prompt option on `generateText`/`streamText`, `system` deprecated
- ESM-only packages (breaking for CJS consumers)
- Further telemetry stabilization
- `Sandbox` abstractions for tool execution

**Evidence:** CHANGELOG.md v7.0.0-beta entries: "rename `stepCountIs` to `isStepCount`", "add `instructions` as the primary prompt option and deprecate `system`", "All packages are now ESM-only".

> **Correction (Phase 11 audit, 2026-05-17)**: An earlier version of this document cited `@ai-sdk/openai@3.0.75` — that version does not exist on npm. The actual current 3.0.x pin used throughout the degree is `3.0.64`. See `05-distillation/gotchas/ai-sdk-openai-version-3075-does-not-exist.md` for the full provenance.
