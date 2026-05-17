# Open Questions — For POC Validation

## 1. Is `instructions` Stable in v6 on `generateText`/`streamText`?

The CHANGELOG mentions "add `instructions` as the primary prompt option and deprecate `system`" in the v7 canary context. `ToolLoopAgent` in v6 stable uses `instructions:` as a constructor param. It's unclear whether `instructions` is also accepted as an option on `generateText`/`streamText` in v6 (it's NOT currently visible in the docs for those functions — only `system` is listed).

**Working assumption:** Use `system:` for `generateText`/`streamText` in v6 POC. Use `instructions:` only for `ToolLoopAgent` constructor.

---

## 2. `stepCountIs` vs `isStepCount` — RESOLVED

**RESOLVED by runtime probe (2026-05-16):**

```bash
node -e "const ai=require('ai'); console.log(typeof ai.stepCountIs, typeof ai.isStepCount)"
# Output: function undefined
```

`stepCountIs` is the correct name in `ai@6.0.184`. The GitHub `main` branch source uses `isStepCount` which will ship in a future (v7?) version. All code in these artifacts has been updated to use `stepCountIs`.

---

## 3. `MockLanguageModelV3` — Which `ai/test` Exports Are Available? — PARTIALLY RESOLVED

The test directory has V2, V3, AND V4 mock classes. Runtime probe shows `ai/dist/test/index.js` (the actual module behind `ai/test`) exports:

```
MockLanguageModelV3, MockEmbeddingModelV3, MockImageModelV3, MockProviderV3,
MockRerankingModelV3, MockSpeechModelV3, MockTranscriptionModelV3,
mockId, mockValues, simulateReadableStream, convertArrayToAsyncIterable, 
convertArrayToReadableStream, convertReadableStreamToArray
```

Note: `MockLanguageModelV4` is NOT yet exported in v6.0.184 stable. Use `MockLanguageModelV3`.

The `ai/test` subpath export may not work with CommonJS require — use `import { MockLanguageModelV3 } from 'ai/test'` with ESM or TypeScript.

---

## 4. OpenAI Pricing

OpenAI's pricing page returned 403 during research. Current prices for `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `o3-mini` should be verified at `platform.openai.com/pricing` before budgeting the POC.

---

## 5. ToolLoopAgent `generate()` Full Return Type

The `ToolLoopAgent.generate()` method — specifically whether `steps`, `toolCalls`, `totalUsage` are all present in the return value (same as `generateText` result). The TypeScript type should be checkable with `InferAgentUIMessage` and the source, but wasn't fully traced.

---

## 6. AI Gateway Latency vs Direct Provider

The AI Gateway adds a proxy hop. For streaming latency-sensitive applications (Blockly visual editor with real-time AI feedback), the p50/p99 latency difference between `gateway('anthropic/claude-haiku-4-5')` vs `anthropic('claude-haiku-4-5')` direct is unknown.

**Validation:** A simple benchmark with 20 calls each, measuring time-to-first-chunk.

---

## 7. Streaming Tool Execute (Async Generator) — UI Events in fullStream

The `weather-tool.ts` example uses `async *execute` (generator) that yields `{ state: 'loading' }` and `{ state: 'ready', ... }`. How these intermediate yields surface in `fullStream` during `streamText` (vs `generateText`) is unclear — do they appear as `tool-result` chunks or as special streaming chunks?

**Validation:** Run the `next-agent` example and observe `fullStream` chunk types when a tool yields multiple times.

---

## 8. Zod v4 Compatibility for Structured Output

The peer dep is `zod@^3.25.76 || ^4.1.8`. Whether `Output.object({ schema: zodV4Schema })` works identically with Zod v4 vs Zod v3, particularly around `.nullable()`, `.optional()`, and `.describe()`, is untested.

**Validation:** `npm install zod@^4.1.8 && node -e "const z=require('zod'); const {Output,generateText}=require('ai'); /* test with mock model */"`

---

## 9. Edge Runtime with Multi-Step Tool Calls

Can a Next.js App Router route handler with `export const runtime = 'edge'` run a `streamText` with `stopWhen: stepCountIs(5)` and multiple tool calls within Vercel's 25-second edge timeout? For agents with slow external tool calls, this may be a hard constraint.

---

## 10. `experimental_repairToolCall` — Reliability and Cost

The `generateText` API includes `experimental_repairToolCall` as an option. Docs mention it but detail is sparse. Unknown whether it's reliable enough for production, and whether it adds latency/cost via repair LLM calls.
