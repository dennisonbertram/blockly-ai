# Testing AI SDK Code

## Core Principle: Test Without Real API Calls

Real LLM calls in tests are:
- Slow (seconds per call)
- Flaky (network, rate limits, model non-determinism)
- Expensive (tokens cost money)
- Non-deterministic (hard to assert)

The AI SDK ships test utilities in `ai/test` specifically for this.

---

## MockLanguageModelV3 — The Core Test Utility

**Current export name:** `MockLanguageModelV3` (not V1, not V2). The version number tracks the internal language model spec version.

**Evidence (source):** `packages/ai/src/test/mock-language-model-v3.ts` — implements `LanguageModelV3`, tracks `doGenerateCalls` and `doStreamCalls` arrays.

```ts
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';

// Basic mock returning fixed text
const mockModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ type: 'text', text: 'Hello, world!' }],
    finishReason: 'stop',
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  }),
});

// Mock with streaming
const streamingMockModel = new MockLanguageModelV3({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'text-start' },
        { type: 'text-delta', text: 'Hello' },
        { type: 'text-delta', text: ', world!' },
        { type: 'text-end' },
        { type: 'finish', finishReason: 'stop', usage: { inputTokens: 10, outputTokens: 5 } },
      ],
      initialDelayInMs: 0,
      chunkDelayInMs: 5,
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
    request: {},
  }),
});
```

---

## Other Test Utilities

```ts
import { 
  MockLanguageModelV3,
  MockEmbeddingModelV3,
  mockId,
  mockValues,
} from 'ai/test';
import { simulateReadableStream } from 'ai';

// mockId: returns incrementing integers as strings ('0', '1', '2', ...)
// mockValues: cycles through an array of values
const idGen = mockId();
console.log(idGen()); // '0'
console.log(idGen()); // '1'

const values = mockValues([10, 20, 30]);
console.log(values()); // 10
console.log(values()); // 20
console.log(values()); // 30  (returns last when exhausted)
```

---

## Testing generateText with Tool Calls

```ts
import { generateText, tool } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

describe('weather tool', () => {
  it('calls the weather tool and returns a response', async () => {
    // Mock: simulate model calling the weather tool, then responding
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues([
        // Step 1: model requests weather tool
        {
          content: [{
            type: 'tool-call',
            toolName: 'getWeather',
            toolCallId: 'tc_1',
            input: { city: 'Paris' },
          }],
          finishReason: 'tool-calls',
          usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
        },
        // Step 2: model responds after seeing tool result
        {
          content: [{ type: 'text', text: 'The weather in Paris is 22°C and sunny.' }],
          finishReason: 'stop',
          usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
        },
      ]),
    });
    
    const weatherToolExecute = jest.fn().mockResolvedValue({
      city: 'Paris', temperature: 22, condition: 'sunny',
    });
    
    const result = await generateText({
      model: mockModel,
      tools: {
        getWeather: tool({
          description: 'Get weather',
          inputSchema: z.object({ city: z.string() }),
          execute: weatherToolExecute,
        }),
      },
      stopWhen: stepCountIs(5),
      prompt: 'What is the weather in Paris?',
    });
    
    // Assert tool was called
    expect(weatherToolExecute).toHaveBeenCalledWith({ city: 'Paris' }, expect.any(Object));
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].toolName).toBe('getWeather');
    expect(result.toolResults[0].result.city).toBe('Paris');
    
    // Assert final response
    expect(result.text).toBe('The weather in Paris is 22°C and sunny.');
    expect(result.steps).toHaveLength(2);
    
    // Assert model was called correctly
    expect(mockModel.doGenerateCalls).toHaveLength(2);
  });
});
```

---

## Testing streamText

```ts
import { streamText } from 'ai';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';

it('streams text chunks correctly', async () => {
  const mockModel = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start' },
          { type: 'text-delta', text: 'Hello' },
          { type: 'text-delta', text: ' world' },
          { type: 'text-end' },
          { type: 'finish', finishReason: 'stop', usage: { inputTokens: 5, outputTokens: 5 } },
        ],
        initialDelayInMs: 0,
        chunkDelayInMs: 0,
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
      request: {},
    }),
  });
  
  const result = streamText({ model: mockModel, prompt: 'Hello' });
  
  const chunks: string[] = [];
  for await (const chunk of result.textStream) {
    chunks.push(chunk);
  }
  
  expect(chunks.join('')).toBe('Hello world');
});
```

---

## Asserting Tool Was Called (Pattern)

Since `MockLanguageModelV3` stores all calls in `.doGenerateCalls[]` and `.doStreamCalls[]`, you can inspect what was sent:

```ts
const call = mockModel.doGenerateCalls[0];
// call contains the full LanguageModelV3CallOptions sent by generateText
// This includes: messages, tools, toolChoice, temperature, etc.
expect(call.tools).toBeDefined();
expect(Object.keys(call.tools!)).toContain('getWeather');
```

---

## Cost-Aware Test Strategy

| Test type | Use real API? | When |
|-----------|--------------|------|
| Unit: logic around `generateText` calls | NO — use MockLanguageModelV3 | Always |
| Unit: tool execute() functions | NO — test independently | Always |
| Unit: schema validation | NO — test Zod schema directly | Always |
| Integration: does the route handler stream correctly? | NO — use mock + simulateReadableStream | Always |
| E2E/smoke: does the full stack produce sensible output? | YES — use cheap model (claude-haiku-4-5, gpt-4o-mini) | Manually or slow CI gate |
| Golden/snapshot: does output quality hold after prompt changes? | YES — run on schedule, not per-PR | Weekly or pre-release |

---

## Testing Structured Output

```ts
it('validates Output.object schema', async () => {
  const mockModel = new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: '{"name": "Alice", "age": 30}' }],
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    }),
  });
  
  const { output } = await generateText({
    model: mockModel,
    output: Output.object({
      schema: z.object({ name: z.string(), age: z.number() }),
    }),
    prompt: 'Generate a user.',
  });
  
  expect(output.name).toBe('Alice');
  expect(output.age).toBe(30);
});

it('throws NoObjectGeneratedError on invalid JSON', async () => {
  const mockModel = new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: 'not valid JSON' }],
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }),
  });
  
  await expect(
    generateText({
      model: mockModel,
      output: Output.object({ schema: z.object({ name: z.string() }) }),
      prompt: 'Generate a user.',
    })
  ).rejects.toSatisfy(NoObjectGeneratedError.isInstance);
});
```
