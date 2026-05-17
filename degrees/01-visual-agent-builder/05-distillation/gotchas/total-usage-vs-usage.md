# Gotcha: For multi-step agents, use `result.totalUsage` — `result.usage` is the *last step only*

**Category:** gotcha — Vercel AI SDK v6 (multi-step / agent loop)

## Symptom

Token usage logged from a tool-using agent is wildly wrong. Either it's much smaller than expected ("agent ran 5 LLM steps but the token bill is for 1"), or wildly larger ("agent ran 5 steps but the dashboard shows 15× more tokens than my logs"). Cost-tracking dashboards disagree with logs.

## Root cause

When `generateText` runs a tool-using loop (because `tools` and `stopWhen` are set), the result carries two usage fields:

- `result.usage` — usage from the **final step only**.
- `result.totalUsage` — usage summed across **all steps**.

The right one for budget/cost telemetry is `result.totalUsage`. The naming follows the convention "result properties without `total` describe the last LM call; `total*` describes the whole loop." Note also that each step's input tokens include the growing conversation history, so input cost compounds quadratically with step count — another reason to bound steps with `stopWhen: stepCountIs(N)`.

## Fix

```ts
// WRONG — under-counts whenever steps > 1:
const cost = result.usage.inputTokens + result.usage.outputTokens;

// RIGHT:
const cost = result.totalUsage.inputTokens + result.totalUsage.outputTokens;
```

## Evidence

- `01-research/vercel-ai-sdk/known-failure-modes.md` lines 85-100 (item 6, "Double-Counting Tokens in Multi-Step Agents") — explicit `result.usage` vs `result.totalUsage` contrast, with the same code snippets.
- `01-research/known-failure-modes.md` line 22: synthesis entry "`result.usage` for multi-step tokens. Symptom: only counts last step. Fix: `result.totalUsage`."
- `02-planning/risk-register.md` lines 88-93 (R5): mitigation step 5 — "Log `result.totalUsage` after every run. Add a session budget cap …"

## Related

- [`anti-patterns/unbounded-agent-loop.md`](../anti-patterns/unbounded-agent-loop.md)
