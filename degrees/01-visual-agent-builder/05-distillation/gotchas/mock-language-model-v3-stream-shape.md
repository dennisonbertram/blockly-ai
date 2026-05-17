# Gotcha: `MockLanguageModelV3` has very specific chunk and usage shapes — research docs got several wrong

**Category:** gotcha — Vercel AI SDK testing (the four-headed mock-shape gotcha)

## Why this exists as one entry

L3 and L4 each lost time on the same family of mistakes: passing the LM mock shapes that *look right*, *pass research-doc samples*, *compile cleanly*, and *fail silently or with confusing errors at runtime*. Four distinct shape mismatches, all in `MockLanguageModelV3`, all surfaced by running real tests. They are one cluster because the fix is the same: probe the installed SDK with `node -e`, then write the mock against runtime ground truth — never against a research doc.

## The four shape rules

### 1. `finishReason` is an object, not a string

```ts
// WRONG — silently breaks Output.object parsing and tool-call step detection
finishReason: 'stop'

// RIGHT (LanguageModelV3 spec)
finishReason: { unified: 'stop' }
// or { unified: 'tool-calls' } for a step that ends in a tool call
```

The v6 consumer reads `lastStep.finishReason === 'stop'` AND `result.finishReason.unified === 'tool-calls'` in different code paths. The flat string accidentally satisfies one path (so plain text emits correctly) while silently failing the other (so `Output.object` parsing is skipped because `'stop'.unified === undefined`).

### 2. `usage` is nested, not flat

```ts
// WRONG — undefined arithmetic silently produces NaN
usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }

// RIGHT
usage: {
  inputTokens:  { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total:  5, text:    undefined, reasoning: undefined },
}
```

### 3. `text-delta` stream chunks use `delta:`, not `text:` or `textDelta:`, and need matching `id:` on start/delta/end

```ts
// WRONG (matches research-doc shape; matches v4 muscle memory)
{ type: 'text-delta', text: 'Hello' }

// RIGHT — dist/index.js:7492 reads chunk.delta.length
{ type: 'text-start', id: 'text-1' },
{ type: 'text-delta', id: 'text-1', delta: 'Hello' },
{ type: 'text-end',   id: 'text-1' },
```

Missing `id` on `text-start` makes the stream transform fail; the stream is empty.

### 4. `tool-call` `content.input` must be a JSON **string**, not an object

```ts
// WRONG — quietly produces { invalid: true } and tool.execute never runs
{ type: 'tool-call', toolName: 'weather', toolCallId: 'tc_1', input: { city: 'Tokyo' } }

// RIGHT
{ type: 'tool-call', toolName: 'weather', toolCallId: 'tc_1',
  input: JSON.stringify({ city: 'Tokyo' }) }
```

The SDK calls `toolCall.input.trim()`; passing an object yields an invalid call.

## Bonus: `mockValues()` takes spread args, not an array

```ts
// WRONG — first call returns the array itself
doGenerate: mockValues([step1, step2])

// RIGHT
doGenerate: mockValues(step1, step2)
```

## Evidence

- `04-logs/error-log.md` lines 90-107 (E2, E3, E4): three of the four shape errors, with verbatim symptom (`Cannot read properties of undefined (reading 'inputTokens')`).
- `03-pocs/L3-tool-and-object-blocks/surprises.md` lines 19-55: the `finishReason`, `usage`, and `mockValues` mismatches with side-by-side wrong/right code.
- `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 3-33: the `text-delta` `delta:` field discovery, including the dist-source line ("at `dist/index.js` line 7492").
- `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 36-49: the tool-call input-must-be-JSON-string discovery — "Passing an object causes `{ invalid: true }` on the tool call, tool.execute() never runs."
- `04-logs/expectation-gap-log.md` lines 65-88: G2/G3/G4 — research docs (`testing-model.md`) showed the wrong shapes; ground-truth came from runtime probes.
- `04-logs/debug-log.md` lines 50-83: D1-D4 — the actual `node -e` probes used.

## Related

- [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md) — the workflow that found these.
- [`gotchas/streamtext-not-awaited.md`](streamtext-not-awaited.md) — the matching emitter-side gotcha.
