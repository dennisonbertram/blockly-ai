# Anti-pattern: Following any AI SDK tutorial pre-2026 without verifying

**Category:** anti-pattern — research hygiene

## Why it's tempting

The internet is full of "How to build a chatbot with the Vercel AI SDK" tutorials. They use exactly the SDK identifiers you searched for; the code looks idiomatic; they have positive comments.

## Why it fails

The SDK shipped four major versions in three years (`v3` → `v4` → `v5` → `v6`), each with renames. Tutorials published **before mid-2025** almost certainly use v4 patterns; tutorials published **before early-2026** may use v5 patterns. The renames most likely to bite:

- `maxSteps` (v4) → removed in v5 → `stopWhen: stepCountIs(N)` (v5/v6)
- `parameters:` in `tool()` (v3/v4) → `inputSchema:` (v5/v6)
- `generateObject` (v4) → deprecated in v6 in favor of `generateText({ output: Output.object({...}) })`
- `toDataStreamResponse` (v4) → `toUIMessageStreamResponse` (v5+)
- `CoreMessage` → `ModelMessage` (v5)

A tutorial published in 2024 that says "always set `maxSteps`" will compile in some v5 contexts (where `maxSteps` is still recognized as an unknown option and ignored — silently capping the agent at one step).

## What to do instead

1. **Date-check every source.** If undated, treat as v3/v4 by default.
2. **Probe the installed SDK** (see [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md)) before copying anything.
3. **Cross-reference against `01-research/vercel-ai-sdk/version-and-current-api.md`** which carries the rename table and a runtime-verified export list.
4. **Pin and gate** with the [exact-version-pin pattern](../patterns/exact-version-pins-on-ai-sdk.md) and the [forbidden-name grep](../patterns/forbidden-name-grep-regression.md).

## Evidence

- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 16-25 (Era table): four major versions in three years, each with breaking changes. "v6 (current, stable) | `ai@6.0.x` | `generateObject`/`streamObject` deprecated in favor of … Route handlers use `toUIMessageStreamResponse()`. Stop condition function is `stepCountIs`."
- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 115-123 (v7 canary status): "**v7 canary exists** but is NOT stable. `stepCountIs` renamed to `isStepCount` (again — naming flip from v5 history)." Even v6→v7 will flip names — tutorials written today against v7 canary will be wrong for v6 stable users.
- `04-logs/expectation-gap-log.md`: every entry under L3 (G1-G4) is an instance where the *project's own research doc* turned out to be stale within months of being written.

## Related

- [`anti-patterns/trusting-llm-from-memory-for-ai-sdk.md`](trusting-llm-from-memory-for-ai-sdk.md)
- [`gotchas/ai-sdk-v6-api-renames.md`](../gotchas/ai-sdk-v6-api-renames.md)
