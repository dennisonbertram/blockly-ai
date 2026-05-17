# Gotcha: `streamText()` must NOT be awaited — `generateText()` MUST be

**Category:** gotcha — Vercel AI SDK v6

## Symptom

You write `const result = await streamText({ ... })` to mirror the `generateText` pattern. The stream is consumed before you can iterate it, or `result.textStream` is no longer an `AsyncIterable`, or the for-await loop yields nothing. Conversely, you forget to await `generateText` and read `.text` on a `Promise`.

## Root cause

In v6 the two top-level functions have *opposite* call shapes by design:

- `streamText({...})` returns synchronously with a result object whose `textStream` (and `fullStream`) properties are async iterables. The whole point is that the response is hot — the caller streams chunks lazily.
- `generateText({...})` returns a `Promise<GenerateTextResult>`. You must await it before reading `.text`, `.output`, `.toolCalls`, etc.

## Fix — emit the two shapes correctly

```ts
// CORRECT
const result = streamText({ model, prompt });
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

const finalText = (await generateText({ model, prompt })).text;
```

The L4 regression test `RT-L4-008` permanently locks this: it greps the emitted code for `await streamText(` and fails if found.

## Evidence

- `03-pocs/L4-multi-step-agent-and-stream/implementation-notes.md` lines 36-46: "`streamText()` is NOT awaited. It returns synchronously with a result object containing async iterables (`textStream`, `fullStream`). … Wrong (breaks the stream): `const result = await streamText({...})`."
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 302-323 (RT-L4-008): "streamText emits WITHOUT await … 'Found "await streamText(" — streamText must NOT be awaited (returns synchronously with async iterables)'."
- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 98-107 — the "DO THIS / NOT THAT" table shows `streamText` and `generateText` with their distinct shapes.
- `03-pocs/L4-multi-step-agent-and-stream/README.md` lines 41-46 — "v6 semantics validated: `streamText` returns synchronously (NOT awaited), `.textStream` is an `AsyncIterable<string>`."

## Related

- [`gotchas/mock-language-model-v3-stream-shape.md`](mock-language-model-v3-stream-shape.md) — the matching test-side gotcha.
