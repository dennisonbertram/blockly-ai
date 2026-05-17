# Anti-pattern: `maxSteps: N` as the multi-step agent bound

**Category:** anti-pattern — Vercel AI SDK v6

## Why it's tempting

The option name `maxSteps` reads like exactly what it does — "stop after N model steps". Every v4 tutorial uses it. Half of the model's own training data is v4 code.

## Why it fails

- **v5** renamed `maxSteps` → `continueUntil` (briefly).
- **v6** (current stable, `ai@6.0.184`) uses `stopWhen: stepCountIs(N)`.

Today, passing `maxSteps: 5` to `generateText` will either:
- TypeScript-error: `Property 'maxSteps' does not exist on type 'GenerateTextOptions'`, or
- Compile (with looser typings) and silently let the agent stop after the first natural-stop step — typically *one* step, not N.

You discover the bug after the LLM emits one response, the loop terminates, and no tools were ever called — even though you "set maxSteps to 5".

## What to do instead

```ts
import { generateText, stepCountIs } from 'ai'

const result = await generateText({
  model,
  tools,
  stopWhen: stepCountIs(5),     // ← v6 form
  prompt,
})
```

For other stop semantics:

```ts
stopWhen: hasToolCall('finalAnswer')        // ← stop when the LLM picks this tool
stopWhen: [stepCountIs(10), hasToolCall('done')]  // ← whichever fires first
stopWhen: isLoopFinished()                  // ← natural termination only (be careful)
```

## Mechanical enforcement

Add `'maxSteps:'` and bare `'maxSteps'` to your forbidden-name grep (see [pattern](../patterns/forbidden-name-grep-regression.md)). L4's regression test does this:

```ts
const forbiddenNames = [..., 'maxSteps:', 'maxSteps']
```

## Evidence

- `01-research/vercel-ai-sdk/known-failure-modes.md` lines 21-36 (item 2): "v5/v6 use `stopWhen: stepCountIs(N)` … `maxSteps` was removed in v5."
- `01-research/vercel-ai-sdk/version-and-current-api.md` line 59 (Old → New table): "`maxSteps: 5` → `stopWhen: stepCountIs(5)` — `maxSteps` removed in v5; use `stepCountIs` in v6."
- `01-research/known-failure-modes.md` line 18: synthesis "`maxSteps` instead of `stopWhen`. Symptom: agent stops after one step. Fix: `stopWhen: stepCountIs(N)`."
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 247-250: `maxSteps:` and `maxSteps` are forbidden in all L4 fixtures.

## Related

- [`gotchas/ai-sdk-v6-api-renames.md`](../gotchas/ai-sdk-v6-api-renames.md)
- [`gotchas/hastoolcall-stop-semantics.md`](../gotchas/hastoolcall-stop-semantics.md)
- [`anti-patterns/unbounded-agent-loop.md`](unbounded-agent-loop.md)
