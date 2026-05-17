# Gotcha: `stopWhen: hasToolCall('name')` runs the tool but does NOT send the result back to the model

**Category:** gotcha — Vercel AI SDK v6 agent stop conditions

## Symptom

You write an agent with `stopWhen: hasToolCall('finalAnswer')`. The tool *does* run. But `result.text` is the empty string and there is no LLM-authored summary. Confused, you assume the tool isn't firing — it is.

## Root cause

`hasToolCall(name)` and `stepCountIs(N)` apply at different points in the loop:

- `stepCountIs(N)` — loop ends *after step N completes*. If step N is a tool-call, step N+1 (the model summarizing the tool result) does happen if N+1 ≤ stop bound.
- `hasToolCall(name)` — loop ends as soon as the model emits the named tool call. **The tool executes**, but **the model is not called again** to post-process its result. `result.text` is therefore `''`; the answer lives in `result.toolResults`.

This is a feature, not a bug: it's the v6 idiom for "let the LLM decide, then hand off". But it surprises every newcomer.

## Fix — pick the stop semantics deliberately

```ts
// Pattern A — "let the model summarize the tool output"
stopWhen: stepCountIs(5)

// Pattern B — "stop the moment the model picks the finalAnswer tool;
//   take the structured tool result as the answer"
stopWhen: hasToolCall('finalAnswer')
// → read result.toolResults[<idx>].output instead of result.text
```

For the L4 fixture `agent-has-tool-call-stop.json`, the assertion is exactly:

```
result.text: ""
result.toolResults: [{ type: "tool-result", toolName: "weather", input: { city: "Tokyo" }, output: { ... } }]
doGenerateCalls: 1   // model called once, tool executed once, no second model call
```

## Evidence

- `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 52-68 (surprise 3): "hasToolCall semantics: tool DOES execute, model NOT called again. … `result.text: ""`, `result.toolResults: [{ ... }]`, `doGenerateCalls: 1`. Contrast with `stepCountIs(N)` where the model IS called again to process tool results."
- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 73-92: the verified v6 stop-condition surface (`stepCountIs`, `isLoopFinished`, `hasToolCall`).
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 136-148 (RT-L4-003 second assertion): the agent-has-tool-call-stop fixture is locked at `hasToolCall('weather')` and explicitly should NOT contain `stepCountIs(`.
