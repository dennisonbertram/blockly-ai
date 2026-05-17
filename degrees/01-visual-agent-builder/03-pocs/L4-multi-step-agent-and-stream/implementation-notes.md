# Implementation Notes — L4 multi-step-agent-and-stream

## Architecture

L4 extends L3 by adding 5 new block types plus extending GenerateText:

### New Blocks

| Block | Type | Output | Notes |
|-------|------|--------|-------|
| `StopCondition` | Expression | `[code, Order.FUNCTION_CALL]` | Dropdown: stepCountIs/hasToolCall |
| `StreamText` | Expression | `[code, Order.FUNCTION_CALL]` | Returns synchronous result handle |
| `StreamSink` | Statement | `string` | `for await` loop over `.textStream` |
| `Agent` | Expression | `[code, Order.AWAIT]` | `(await generateText({...})).text` |
| `ForEach` | Statement | `string` | `for (const X of Y) { ... }` |

### Extended Blocks

- `GenerateText` — added `STOP_WHEN` input. If connected, emits `stopWhen: <code>`. If tools connected but no stop condition, defaults to `stopWhen: stepCountIs(5)`. If neither, omits stopWhen.

### Import Detection (async-generator.ts)

The import header builder now detects:
- `streamText(` → adds `streamText` to ai imports
- `generateText(` → adds `generateText` to ai imports (was always included in L3)
- `hasToolCall(` → adds `hasToolCall` to ai imports
- `stepCountIs(` → already handled in L3

Key invariant: `streamText` and `generateText` are mutually exclusive in most programs (one or the other is used). The builder adds only what's needed.

## Key Design Choices

### StreamText is synchronous

`streamText()` is NOT awaited. It returns synchronously with a result object containing async iterables (`textStream`, `fullStream`). This is a v6 API characteristic:

```ts
// Correct:
const result = streamText({ model, prompt })
for await (const chunk of result.textStream) { ... }

// Wrong (breaks the stream):
const result = await streamText({ model, prompt })
```

The `StreamText` block emits `streamText(...)` (no await). The `StreamSink` block iterates with `for await`.

### Agent uses generateText, not ToolLoopAgent

See decision-log.md entry `2026-05-17T01:09:00Z`.

### Mutator deferred

See decision-log.md entry `2026-05-17T01:09:10Z`.

## Test Infrastructure Notes

### ForEach test workaround

The `ai_prompt` block wraps text in single quotes, making it a string literal, not a code expression. The ForEach test (BT-L4-007) needs an array `['a','b','c']` as the iterable. Since there's no "array literal" block in L4, the test:
1. Uses a placeholder string `'__L4_TEST_ARRAY__'` as the iterable prompt text
2. Post-processes the generated source to replace `'__L4_TEST_ARRAY__'` with `['a','b','c']`
3. Also replaces the empty sink value with the loop variable `__item`

This is documented in the test file itself. The test correctly validates the `for (const X of Y)` loop structure and iteration behavior.

### buildRunnable injection

The `buildRunnable()` helper injects all needed modules:
- `generateText`, `streamText` — main AI SDK functions
- `tool`, `Output`, `z` — L3 inherited
- `stepCountIs`, `hasToolCall` — L4 new
- `anthropic`, `openai` — provider factories

The function signature uses a comma-separated argument string to avoid happy-dom `new Function` multi-argument parsing issues (inherited from L3 surprise #4).

## Block Color Scheme

| Block family | Color |
|-------------|-------|
| StopCondition | 45 (amber) |
| StreamText | 90 (teal-green) |
| StreamSink | 90 (teal-green) |
| Agent | 30 (orange) |
| ForEach | 120 (green) |

These extend the L3 color scheme: model/generate-text (160 blue), tools (270 purple), zod (varies).
