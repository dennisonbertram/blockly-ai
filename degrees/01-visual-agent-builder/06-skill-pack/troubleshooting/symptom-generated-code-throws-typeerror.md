# Troubleshooting: Generated Code Throws TypeError at Runtime

## Symptom

The codegen test passes (code is emitted), but the execution test throws a `TypeError` or `NoOutputGeneratedError` when the generated code is run via `buildRunnable(code)(...)`.

## Cause Table

| Error message | Cause | Fix |
|---|---|---|
| `Cannot read properties of undefined (reading 'inputTokens')` | `usage` shape is flat instead of nested | Use `{ inputTokens: { total: N }, outputTokens: { total: N } }` |
| `NoOutputGeneratedError` | `finishReason: 'stop'` (string) instead of `{ unified: 'stop' }` | Use object form |
| `result.object is undefined` | Accessing `.object` on `generateText` result | Use `.output` — the accessor is `result.output` not `result.object` |
| `result.text is ''` | Using `hasToolCall('name')` stop condition | Tool ran but model not called again — use `result.toolResults` or switch to `stepCountIs` |
| `__tools.search is not a function` | Tool stubs not injected | Pass `tools: { search: mockFn }` in `buildRunnable(code)(...)` call |
| `Block type 'ai_greet' not defined` | Block module not imported before workspace load | Add `import '../src/blocks/greet'` at top of test file |
| `workspaceToCode returns empty string` | Workspace loaded but fixture `type` field doesn't match registered block type | Check block type strings match exactly |

## Checking Mock Shape Issues

When execution fails with confusing errors, probe the shape the SDK actually expects:

```bash
node -e "const {MockLanguageModelV3}=require('ai/test'); console.log(new MockLanguageModelV3({doGenerate:()=>{}}).spec)"
```

Or probe what exports exist:

```bash
node -e "console.log(Object.keys(require('ai/test')).join('\n'))"
```

## The `.output` vs `.object` Gotcha

```ts
// WRONG — .object was from the deprecated generateObject() function
const result = await generateText({ model, output: Output.object({ schema }), prompt })
console.log(result.object)   // undefined!

// CORRECT
console.log(result.output)   // the parsed object
```

## Structured Output Empty on `finishReason` String

When `finishReason` is a plain string `'stop'`, the SDK's internal `Output.object` parser checks `finishReason.unified` — which is `undefined` on a string. This causes the output parsing to be skipped silently. Use the object form:

```ts
finishReason: { unified: 'stop' }
```

---

## Links

- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Back to Index](../index.md)
