# Example 05 — Streaming Output

**What it demonstrates:** A `streamText` block that pipes chunks to `__sink` via a `for await` loop. The key rule: `streamText` is NOT awaited.

**Complexity:** Intermediate — streaming, chunk handling, `doStream` mock shape.

---

## Expected Emitted Code

```ts
import { generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  const __stream = streamText({                              // no await
    model: (__model_provider ?? anthropic('claude-haiku-4-5')),
    prompt: 'Write a short poem about code',
  });
  for await (const __chunk of __stream.textStream) {
    __sink?.('chunk', __chunk);
  }
}
```

---

## The `doStream` Mock Shape

For streaming tests, use `doStream` (not `doGenerate`) in the mock:

```ts
const mockModel = new MockLanguageModelV3({
  doStream: mockValues({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-start',  id: 'ts_1' })
        controller.enqueue({ type: 'text-delta',  id: 'ts_1', delta: 'Roses' })
        controller.enqueue({ type: 'text-delta',  id: 'ts_1', delta: ' are red' })
        controller.enqueue({ type: 'text-end',    id: 'ts_1' })
        controller.enqueue({
          type: 'finish',
          finishReason: { unified: 'stop' },
          usage: { inputTokens: { total: 10 }, outputTokens: { total: 8 } },
        })
        controller.close()
      }
    })
  })
})
```

**Rules for stream chunks:**
- `type: 'text-delta'` uses `delta:` field (not `text:` or `textDelta:`)
- `id:` must be present and matching on `text-start`, `text-delta`, and `text-end`
- Missing `id` on `text-start` causes the stream transform to drop all chunks

---

## Regression Test Lock

The snapshot test should lock that `await streamText(` does NOT appear. Add to forbidden patterns:

```ts
// In addition to forbidden-name grep:
it('stream-text-basic does not await streamText', () => {
  const code = generateAsyncModule(workspace)
  expect(code).not.toContain('await streamText(')
  expect(code).toContain('const __stream = streamText(')
})
```

---

## Links

- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Troubleshooting: streamText Not Iterable](../troubleshooting/symptom-streamtext-not-iterable.md)
- [Back to Index](../index.md)
