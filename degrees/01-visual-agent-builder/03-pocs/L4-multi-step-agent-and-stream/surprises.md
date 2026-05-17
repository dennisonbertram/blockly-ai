# Surprises — L4 multi-step-agent-and-stream

## 1. text-delta chunk field is 'delta', not 'text' or 'textDelta'

The testing-model.md research doc showed:
```ts
{ type: 'text-delta', text: 'Hello' }
// or
{ type: 'text-delta', textDelta: 'Hello' }
```

The actual `ai@6.0.184` LanguageModelV3 stream part shape (verified via runtime probe of `dist/index.js`):
```ts
{ type: 'text-delta', id: 'text-1', delta: 'Hello' }
```

The dist source at line 7492:
```js
case "text-delta": {
  if (chunk.delta.length > 0) {   // <-- .delta not .text or .textDelta
    controller.enqueue({ type: "text-delta", id: chunk.id, text: chunk.delta, ... });
```

Fix: Use `delta:` field in `text-delta` chunks when creating `simulateReadableStream` chunks.

Also: `text-start` and `text-end` chunks need an `id` field that matches the `text-delta` `id`. Without the `id` field on `text-start`, the transform fails.

Correct chunk format:
```ts
{ type: 'text-start', id: 'text-1' },
{ type: 'text-delta', id: 'text-1', delta: 'chunk1' },
{ type: 'text-end', id: 'text-1' },
```

## 2. tool-call content.input must be a JSON string, not an object

The `LanguageModelV3` content item for a tool call has `input` as a string (JSON), not a parsed object:

```ts
// WRONG (silently produces invalid: true tool call):
{ type: 'tool-call', toolName: 'weather', toolCallId: 'tc_1', input: { city: 'Tokyo' } }

// CORRECT:
{ type: 'tool-call', toolName: 'weather', toolCallId: 'tc_1', input: JSON.stringify({ city: 'Tokyo' }) }
```

The dist source calls `toolCall.input.trim()` — so `.input` must be a string. Passing an object causes `{ invalid: true }` on the tool call, tool.execute() never runs, and the step loop terminates without executing the tool.

This is a carry-forward from L3 (the L3 execute tests had this correct, but the testing-model.md research doc did not document it clearly).

## 3. hasToolCall semantics: tool DOES execute, model NOT called again

When `stopWhen: hasToolCall('weather')` is used, the v6 semantics are:
- The loop runs one step (model called once)
- The tool-call is detected → `hasToolCall` fires
- The tool's `execute` function IS called (tool has a result)
- The loop stops BEFORE calling the model again to process the tool result
- `result.text` is `''` (no text response generated)
- `result.toolResults` has the tool output

This was verified via runtime probe:
```
result.text: ""
result.toolResults: [{ type: "tool-result", toolName: "weather", input: { city: "Tokyo" }, output: { temp: 70, city: "Tokyo" } }]
doGenerateCalls: 1
```

Contrast with `stepCountIs(N)` where the model IS called again to process tool results.

## 4. simulateReadableStream is exported from both 'ai' and 'ai/test'

The main `ai` package exports `simulateReadableStream` directly (not just from `ai/test`).
Both work: `import { simulateReadableStream } from 'ai'` and `import { simulateReadableStream } from 'ai/test'`.

The test file imports from `ai/test` following the research doc's recommendation.

## 5. L3 finishReason surprise applies here too

As documented in L3 `surprises.md`, `MockLanguageModelV3` uses structured finishReason and nested usage:
```ts
finishReason: { unified: 'stop' }  // NOT 'stop' string
usage: { inputTokens: { total: 5, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, ... }
```

All L4 execute tests use the V3 nested format.
