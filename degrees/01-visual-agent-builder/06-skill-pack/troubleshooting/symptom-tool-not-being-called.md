# Troubleshooting: Tool Not Being Called

## Symptom

The mock test passes (model called, no error), but the tool mock function was never invoked. `expect(toolMock).toHaveBeenCalled()` fails. Or the agent skips all tool steps and goes straight to a text response.

## Cause Table

| Cause | How to identify | Fix |
|---|---|---|
| `input` is an object instead of a JSON string in the mock | `doGenerateCalls[0].content[0].input` is `{}` (object) | Use `JSON.stringify({ key: value })` |
| `toolName` in mock doesn't match tool `NAME` field | Tool is registered under `'search'` but mock says `'Search'` (case mismatch) | Match exactly |
| `__tools` not injected in test | `buildRunnable(code)` called without `tools: { search: mockFn }` | Pass `tools` as third arg |
| Tool block `NAME` field doesn't match `__tools` key | `ai_tool` block emits `__tools.webSearch(...)` but executor injects `{ search: ... }` | Align names |
| `finishReason` is a string instead of object | `finishReason: 'tool-calls'` causes tool-dispatch to be skipped | Use `{ unified: 'tool-calls' }` |

## The Most Common Fix: JSON String Input

```ts
// WRONG — SDK calls toolCall.input.trim(); passing object throws or gives { invalid: true }
{
  type: 'tool-call',
  toolName: 'search',
  toolCallId: 'tc_001',
  input: { query: 'transformers' },   // object — breaks tool dispatch
}

// CORRECT
{
  type: 'tool-call',
  toolName: 'search',
  toolCallId: 'tc_001',
  input: JSON.stringify({ query: 'transformers' }),   // JSON string
}
```

## Checking the Mock Call Count

```ts
// After running the test:
console.log('model calls:', mockModel.doGenerateCalls.length)
console.log('tool mock calls:', toolMock.mock.calls)
```

A two-turn agent (tool then text) should show `doGenerateCalls.length === 2`. If it's `1`, the tool-call step completed but the model was not called again — check `finishReason` and `stopWhen` semantics.

## hasToolCall vs stepCountIs Semantics

If `stopWhen: hasToolCall('name')` is used, the tool DOES execute but the model is NOT called again afterward. `result.text` will be `''`. The answer is in `result.toolResults`. This is correct behavior, not a bug.

If you want the model to summarize the tool result, use `stopWhen: stepCountIs(5)` instead.

---

## Links

- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Recipe: Tools Injection Import Map](../recipes/recipe-tools-injection-import-map.md)
- [Back to Index](../index.md)
