# Anti-pattern: Trusting LLM-from-memory for AI SDK code

**Category:** anti-pattern — the most expensive habit in this degree

## Why it's tempting

The AI SDK looks like a stable library. `generateText`, `streamText`, `tool` — names you've seen on hundreds of blog posts. Surely an LLM that's seen all those blog posts will get this right.

## Why it fails

Every dominant LLM's training data is heavily skewed toward `ai@3.x` and `ai@4.x` patterns from 2023-2024, when the SDK was younger and the documentation more numerous. The current stable `ai@6.0.184` (May 2026) has *renamed nearly every load-bearing identifier* compared to the 2024 docs:

| What the LLM defaults to | What v6 actually wants |
|---|---|
| `parameters: z.object({...})` | `inputSchema: z.object({...})` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| `generateObject({ schema, prompt })` | `generateText({ output: Output.object({ schema }), prompt })` |
| `(await ...).object` | `(await ...).output` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` |
| `CoreMessage` | `ModelMessage` |
| `maxTokens` | `maxOutputTokens` |
| `MockLanguageModelV1` | `MockLanguageModelV3` |
| `result.usage` (multi-step) | `result.totalUsage` |
| `experimental_*` prefixes | (removed) |

The fail modes range from compile errors (cleanest) to silent runtime no-ops (worst — `finishReason: 'stop'` flat-strings still "work" for the simple-text path but break `Output.object` parsing).

## What to do instead

1. **Treat any AI-SDK code suggestion as untrusted until verified against `ai@6.0.184`.** Use [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md) to verify exports.
2. **Use [`patterns/forbidden-name-grep-regression.md`](../patterns/forbidden-name-grep-regression.md)** to mechanically reject the v3/v4 names every commit.
3. **Use [`patterns/golden-output-snapshots-as-sdk-drift-net.md`](../patterns/golden-output-snapshots-as-sdk-drift-net.md)** so an accidental v4 emission shows up as a snapshot diff.
4. **Use [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md)** so `npm update` cannot silently change the API surface.

## Evidence

- `02-planning/risk-register.md` lines 97-110 (R6 "Stale LLM Knowledge Bias"): "Likelihood: High (confirmed pattern: training data skews toward older API versions). Impact: High (generated programs silently break; the degree teaches the wrong patterns)." Mitigation table cites this exact strategy.
- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 53-70 (the "Old → New API Mapping" table): the very document that exists *because* the LLM memory is unreliable.
- `04-logs/error-log.md` lines 86-89 (E1): "Task spec said emit `(await generateText({...})).object`. Actual v6 SDK has `.output`." The task spec was written by an LLM relying on memory.
- `04-logs/expectation-gap-log.md` lines 67-88 (L3 G1-G4): four research-doc-vs-reality gaps surfaced by L3 alone, all in the AI SDK surface.

## Related

- [`anti-patterns/following-pre-2026-ai-sdk-tutorials.md`](following-pre-2026-ai-sdk-tutorials.md)
- [`gotchas/ai-sdk-v6-api-renames.md`](../gotchas/ai-sdk-v6-api-renames.md)
