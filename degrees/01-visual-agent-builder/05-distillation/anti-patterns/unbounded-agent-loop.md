# Anti-pattern: Calling `generateText` with tools but no `stopWhen`

**Category:** anti-pattern — Vercel AI SDK v6, cost & reliability

## Why it's tempting

The simplest agent example reads `generateText({ model, tools, prompt })`. It works. The SDK's default stop condition (`isLoopFinished()`) sounds reasonable — "stop when there's nothing left to do."

## Why it fails

`isLoopFinished()` stops only on *natural* termination — when the model emits a non-`tool-calls` finishReason. Models that are confused, badly prompted, or tool-eager will keep emitting tool calls indefinitely. The conversation history grows quadratically (each step re-sends prior steps as input), so cost compounds. There is no platform-level circuit breaker until Vercel's request timeout fires — by which point you might have paid for 30+ steps and look at a $5–$20 bill for one botched request, or hit a rate-limit ban.

## What to do instead — always bound multi-step loops

```ts
import { generateText, stepCountIs } from 'ai'

await generateText({
  model,
  tools,
  prompt,
  stopWhen: stepCountIs(5),           // ← always bound
  maxOutputTokens: 2000,              // ← cap per-step output
})
```

For complex agents, `stepCountIs(10)` or `stepCountIs(15)`. Anything past 20 needs justification. For exploratory tools, combine multiple conditions:

```ts
stopWhen: [stepCountIs(10), hasToolCall('finalAnswer')]
```

The visual builder enforces this mechanically: the Agent block emits `stepCountIs(5)` *by default* when no StopCondition is connected. The L4 regression `RT-L4-003` permanently locks this: every Agent-using fixture must contain `stepCountIs(` in the emitted code.

## Evidence

- `01-research/vercel-ai-sdk/known-failure-modes.md` lines 105-119 (item 7 "Infinite Agent Loop"): "`stopWhen` not set. Default is `isLoopFinished()` (never stops artificially)."
- `01-research/known-failure-modes.md` line 25: synthesis "No `stopWhen` set. Symptom: unbounded loops, runaway cost. Fix: always set a `stopWhen`."
- `02-planning/risk-register.md` lines 78-93 (R5 "Cost Runaway from Unbounded Multi-Step Agents"): "Likelihood: Medium … Impact: High (unexpected API bill; potential rate-limit ban). All generated code from `Agent` blocks must emit `stopWhen: stepCountIs(N)` where N is a configurable field … The code generator must never emit an agent loop without `stopWhen`."
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 116-148 (RT-L4-003): the regression that enforces this.
- `03-pocs/L4-multi-step-agent-and-stream/README.md` line 31: "Default stop condition: `stepCountIs(5)` if no `StopCondition` connected."

## Related

- [`anti-patterns/maxsteps-as-loop-bound.md`](maxsteps-as-loop-bound.md)
- [`anti-patterns/edge-runtime-for-multi-step-agents.md`](edge-runtime-for-multi-step-agents.md)
- [`gotchas/total-usage-vs-usage.md`](../gotchas/total-usage-vs-usage.md)
