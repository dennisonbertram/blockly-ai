# Example 04 — Multi-Step Agent

**What it demonstrates:** A two-step agent that calls a tool in step 1 and summarizes the result in step 2. Shows `stopWhen: stepCountIs(N)`, `result.totalUsage`, and the two-turn `MockLanguageModelV3` test pattern.

**Complexity:** Intermediate — multi-step, tool call, mock with two turns.

---

## Expected Emitted Code

```ts
import { generateText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  const __agentResult = await generateText({
    model: (__model_provider ?? anthropic('claude-haiku-4-5')),
    tools: {
      weather: tool({
        description: 'Get weather for a city',
        inputSchema: z.object({ city: z.string() }),
        execute: async (input) => {
          return await __tools.weather(input.city);
        },
      }),
    },
    stopWhen: stepCountIs(5),
    prompt: 'What is the weather in Tokyo?',
  });
  __sink?.('output', __agentResult.text);
}
```

---

## Two-Turn Test

```ts
const weatherMock = vi.fn().mockResolvedValue({ temp: 22, condition: 'Sunny' })

const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues(
    // Turn 1: model calls the weather tool
    {
      content: [{
        type: 'tool-call',
        toolName: 'weather',
        toolCallId: 'tc_001',
        input: JSON.stringify({ city: 'Tokyo' }),   // JSON string, not object
      }],
      finishReason: { unified: 'tool-calls' },       // object, not string
      usage: { inputTokens: { total: 20 }, outputTokens: { total: 5 } },
    },
    // Turn 2: model uses the tool result and responds
    {
      content: [{ type: 'text', text: 'The weather in Tokyo is 22°C and Sunny.' }],
      finishReason: { unified: 'stop' },
      usage: { inputTokens: { total: 80 }, outputTokens: { total: 20 } },
    }
  ),
})

const sink = vi.fn()
const result = await buildRunnable(code)(...args, mockModel, sink, { weather: weatherMock })

expect(weatherMock).toHaveBeenCalledWith('Tokyo')
expect(mockModel.doGenerateCalls).toHaveLength(2)
expect(sink).toHaveBeenCalledWith('output', 'The weather in Tokyo is 22°C and Sunny.')
```

---

## Key Points

- `stopWhen: stepCountIs(5)` — model IS called again after tool result (contrast with `hasToolCall`)
- `result.totalUsage` not `result.usage` for multi-step token tracking
- `finishReason: { unified: 'tool-calls' }` triggers the tool dispatch step; `{ unified: 'stop' }` ends the loop
- Tool mock input must be `JSON.stringify(...)` not a plain object

---

## Links

- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Back to Index](../index.md)
