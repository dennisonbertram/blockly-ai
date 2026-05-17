# Gotcha: AI SDK v6 renamed many top-line options — stale names compile, fail silently at runtime

**Category:** gotcha — Vercel AI SDK (the single largest source of bugs in this degree)

## Why this is one entry, not seven

Between v3/v4 (which dominates LLM training data) and the **v6.0.184** stable pinned in this degree, the SDK renamed nearly every load-bearing identifier. A coding LLM with default knowledge will reach for the old names; many of them either compile (because Zod-typed options are loose) or fail with cryptic runtime errors. The fix is to memorize the rename table and to enforce it mechanically via a forbidden-name grep — see the related pattern.

## Rename table — what to use today (ai@6.0.184)

| Old (v3/v4 — DO NOT emit) | New (v6 — emit) | Failure mode if you use the old name |
|---|---|---|
| `parameters: z.object({...})` in `tool()` | `inputSchema: z.object({...})` | tool silently miswired; `execute` receives `any` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` | TS error or agent stops after one step |
| `generateObject({ ... })` | `generateText({ ..., output: Output.object({ schema }) })` | deprecation warning today, removal tomorrow |
| `result.object` | `result.output` | `NoOutputGeneratedError` |
| `result.toDataStreamResponse()` | `result.toUIMessageStreamResponse()` | `TypeError: ... is not a function` |
| pass raw `UIMessage[]` | `await convertToModelMessages(uiMessages)` | `AI_InvalidPromptError` or silent mismatch |
| `result.usage` for multi-step | `result.totalUsage` | per-step double-counting or under-counting |
| `import { CoreMessage } from 'ai'` | `import { ModelMessage } from 'ai'` | TS compile error |
| `maxTokens` | `maxOutputTokens` | option silently ignored |
| `MockLanguageModelV1` | `MockLanguageModelV3` | import not found |

## How to enforce mechanically

Pair every emitted-code generator with a forbidden-name regression test that greps the output for the v4 names. The L3 and L4 regression tests already do this — see `RT-006` and `RT-L4-006`.

## Evidence

- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 53-70 ("Old API → New API Mapping" table) — primary source.
- `01-research/vercel-ai-sdk/known-failure-modes.md` items 1, 2, 4, 5, 6, 11, 12 — each rename with symptom + cause + fix.
- `01-research/known-failure-modes.md` lines 17-22 — synthesis: same 7 renames listed.
- `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 14-15: "RT-004: inputSchema: appears in emitted tool definitions. Catches accidental regression to v4 'parameters:' API name."
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 240-250: the forbidden list (`'parameters:'`, `'generateObject('`, `'toDataStreamResponse'`, `'CoreMessage'`, `'experimental_streamText'`, `'experimental_output'`, `'maxSteps:'`, `'maxSteps'`).
- `04-logs/error-log.md` lines 86-89 (E1): "GenerateTextResult.object does not exist (NoOutputGeneratedError) … Task spec said emit `(await generateText({...})).object`. Actual v6 SDK has `.output`."

## Related

- [`patterns/forbidden-name-grep-regression.md`](../patterns/forbidden-name-grep-regression.md)
- [`anti-patterns/trusting-llm-from-memory-for-ai-sdk.md`](../anti-patterns/trusting-llm-from-memory-for-ai-sdk.md)
- [`anti-patterns/maxsteps-as-loop-bound.md`](../anti-patterns/maxsteps-as-loop-bound.md)
