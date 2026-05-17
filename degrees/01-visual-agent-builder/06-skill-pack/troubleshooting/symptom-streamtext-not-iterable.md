# Troubleshooting: `streamText` Result is Not Iterable / Stream is Empty

## Symptom

One of:
- `TypeError: result.textStream is not async iterable`
- The `for await` loop over `result.textStream` yields zero chunks
- `result.text` (after collecting) is empty string

## Cause

`streamText()` must NOT be awaited. It returns synchronously with a result object whose `.textStream` is an `AsyncIterable`. Awaiting it consumes the promise in a way that loses the stream.

```ts
// WRONG — await consumes the promise; textStream is no longer available
const result = await streamText({ model, prompt })
for await (const chunk of result.textStream) { ... }

// CORRECT — no await; result is the synchronous return value
const result = streamText({ model, prompt })
for await (const chunk of result.textStream) { ... }
```

This is the opposite of `generateText`, which MUST be awaited.

## Contrast with `generateText`

```ts
// generateText — MUST await
const result = await generateText({ model, prompt })
console.log(result.text)   // string

// streamText — MUST NOT await
const result = streamText({ model, prompt })
for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}
```

## In Emitted Code

The StreamText block should emit:

```ts
const result = streamText({ model: (__model_provider ?? anthropic('claude-haiku-4-5')), prompt: '...' });
for await (const chunk of result.textStream) {
  __sink?.('chunk', chunk);
}
```

The regression test `RT-L4-008` locks this by checking that `await streamText(` does NOT appear in any fixture's emitted code.

## Mock for `streamText` Tests

```ts
// Use doStream (not doGenerate) in the mock
const mockModel = new MockLanguageModelV3({
  doStream: mockValues({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-start',  id: 'ts_1' })
        controller.enqueue({ type: 'text-delta',  id: 'ts_1', delta: 'Hello' })
        controller.enqueue({ type: 'text-end',    id: 'ts_1' })
        controller.enqueue({ type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } } })
        controller.close()
      }
    })
  })
})
```

Note: `text-delta` chunks use `delta:` (not `text:` or `textDelta:`), and `id:` must match on start/delta/end.

---

## Links

- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Back to Index](../index.md)
