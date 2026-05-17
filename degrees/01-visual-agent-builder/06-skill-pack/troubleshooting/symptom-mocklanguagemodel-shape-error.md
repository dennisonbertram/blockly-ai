# Troubleshooting: MockLanguageModelV3 Shape Errors

## Symptom

Test fails with one of:
- `Cannot read properties of undefined (reading 'inputTokens')`
- `Cannot read properties of undefined (reading 'total')`
- Tool mock never called despite mock returning a tool-call content item
- `doGenerateCalls` has length 1 when 2 were expected
- Stream test yields zero chunks

## The Four Shape Rules — Quick Reference

### 1. `finishReason` is an object

```ts
// WRONG
finishReason: 'stop'
finishReason: 'tool-calls'

// CORRECT
finishReason: { unified: 'stop' }
finishReason: { unified: 'tool-calls' }
```

### 2. `usage` is nested

```ts
// WRONG
usage: { inputTokens: 10, outputTokens: 5 }

// CORRECT
usage: {
  inputTokens:  { total: 10 },
  outputTokens: { total: 5 },
}
```

### 3. `mockValues` takes spread args (not array)

```ts
// WRONG — first call returns the array itself, not step1
doGenerate: mockValues([step1, step2])

// CORRECT
doGenerate: mockValues(step1, step2)
```

### 4. Tool-call `input` is a JSON string

```ts
// WRONG — SDK calls toolCall.input.trim(); object causes silent failure
input: { query: 'hello' }

// CORRECT
input: JSON.stringify({ query: 'hello' })
```

## Stream-Specific: `text-delta` chunk fields

```ts
// WRONG (v4 muscle memory)
{ type: 'text-delta', text: 'Hello' }
{ type: 'text-delta', textDelta: 'Hello' }

// CORRECT — use delta: and matching id: on start/delta/end
{ type: 'text-start', id: 'ts_1' }
{ type: 'text-delta', id: 'ts_1', delta: 'Hello' }
{ type: 'text-end',   id: 'ts_1' }
```

Missing `id` on `text-start` causes the stream transform to drop all subsequent chunks.

## Probing the Actual Shape

When in doubt, probe the installed package directly:

```bash
node -e "console.log(Object.keys(require('ai/test')).join('\n'))"
node -e "const ai=require('ai'); console.log(Object.keys(ai).filter(k=>k.includes('step')).join('\n'))"
```

The installed package is authoritative — research docs and changelogs may be wrong.

## Upgrade Impact

After bumping the AI SDK, re-verify these shapes. `MockLanguageModelV3` shapes have changed between patch releases. The installed package probe above is the fastest check.

---

## Links

- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Troubleshooting: Tool Not Being Called](symptom-tool-not-being-called.md)
- [Back to Index](../index.md)
