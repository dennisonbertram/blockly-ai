# POC L4 — Multi-Step Agent and Stream

## Goal

Validate that Blockly can generate v6-correct multi-step agent code and streaming code, including:
- `streamText()` with async iteration over `.textStream`
- `generateText()` with `stopWhen: stepCountIs(N)` and `stopWhen: hasToolCall('name')`
- `ForEach` iteration over arrays

## New Blocks

### StopCondition
Expression block with dropdown:
- `stepCountIs(N)` — stops after N steps (N = numeric field)
- `hasToolCall('name')` — stops when the named tool is called (name = text field)

### StreamText
Expression block: `streamText({ model, prompt, system?, tools?, stopWhen? })`
Returns a result handle. Wire to `StreamSink` to iterate chunks.

### StreamSink
Statement block: iterates `source.textStream` with `for await`:
```js
for await (const __chunk of (source).textStream) {
  __sink?.('label', __chunk);
}
```

### Agent
Expression block: multi-step agent via `generateText` with `stopWhen`.
Returns `(await generateText({ model, prompt, system?, tools, stopWhen })).text`.
Default stop condition: `stepCountIs(5)` if no `StopCondition` connected.

### ForEach
Statement block: `for (const VAR of ITERABLE) { BODY }`.
For synchronous iterables (arrays). For async iterables, use `StreamSink`.

## v6 Semantics Validated

- `stopWhen: stepCountIs(N)` is the correct v6 API (NOT `maxSteps`)
- `stopWhen: hasToolCall('name')` stops after the tool-call step (tool executes, model not called again)
- `streamText` returns synchronously (NOT awaited)
- `.textStream` is an `AsyncIterable<string>` (text deltas only)
- `MockLanguageModelV3` stream chunks use `{ type: 'text-delta', id: '...', delta: '...' }` format

## Key Limitations

- `UseTools` block still has fixed N=3 inputs (mutator deferred — see decision-log.md)
- `StreamSink` iterates `.textStream` only, not `.fullStream` (no tool-call events visible)
- Agent uses `generateText` not `ToolLoopAgent` (correct for one-shot programs)

## Test Results

```
Test Files  3 passed (3)
Tests  28 passed (28)
```

## Files

- `source/src/blocks/stop-condition.ts` — StopCondition block
- `source/src/blocks/stream-text.ts` — StreamText block
- `source/src/blocks/stream-sink.ts` — StreamSink block
- `source/src/blocks/agent.ts` — Agent block
- `source/src/blocks/for-each.ts` — ForEach block
- `source/src/codegen/async-generator.ts` — Extended import detection
- `source/test/codegen.test.ts` — Codegen behavioral tests (BT-L4-001 to BT-L4-008)
- `source/test/execute.test.ts` — Integration execute tests
- `source/test/regression.test.ts` — Regression tests (RT-L4-001 to RT-L4-008)
