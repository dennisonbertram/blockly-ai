# Tool Calling — Complete Reference

## Defining a Tool

```ts
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  // Required: description helps model decide when to call this tool
  description: 'Get the current weather in a city. Returns temperature in Fahrenheit.',
  
  // Required: input schema (Zod, Valibot, or JSON Schema)
  // NOTE: In v6, this is inputSchema — NOT parameters (old v3/v4 name)
  inputSchema: z.object({
    city: z.string().describe('The city name, e.g. "San Francisco" or "Tokyo"'),
    units: z.enum(['fahrenheit', 'celsius']).optional().describe('Temperature units'),
  }),
  
  // Optional: execute function — if omitted, tool becomes human-in-the-loop
  execute: async ({ city, units }) => {
    // Simulate API call
    const temp = 72 + Math.floor(Math.random() * 20) - 10;
    return {
      city,
      temperature: units === 'celsius' ? (temp - 32) * 5/9 : temp,
      units: units ?? 'fahrenheit',
      condition: 'partly cloudy',
    };
  },
  
  // Optional: limit tool output size returned to model
  // Optional: needsApproval — pause loop for human approval
  // Optional: strict — provider-side strict schema mode (OpenAI only)
});
```

**CRITICAL:** In v6, the parameter is `inputSchema`, NOT `parameters`. Tutorials using `parameters` are targeting v3/v4.

**Evidence:** All v6 docs and GitHub source (`examples/next-agent/tool/weather-tool.ts`): `tool({ description, inputSchema: z.object({...}), execute })`.

**Evidence (source):** `tool()` is a TypeScript-only type helper: "It does not have any runtime behavior, but it helps TypeScript infer the types of the input for the execute method."

---

## Using Tools with generateText

```ts
import { generateText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = await generateText({
  model: anthropic('claude-haiku-4-5'),
  
  // Pass tools as a record keyed by name
  tools: {
    getWeather: weatherTool,
    convertUnits: tool({
      description: 'Convert temperature between Fahrenheit and Celsius',
      inputSchema: z.object({
        value: z.number(),
        from: z.enum(['fahrenheit', 'celsius']),
      }),
      execute: async ({ value, from }) => ({
        result: from === 'fahrenheit' ? (value - 32) * 5/9 : value * 9/5 + 32,
        units: from === 'fahrenheit' ? 'celsius' : 'fahrenheit',
      }),
    }),
  },
  
  // REQUIRED for multi-step: stopWhen controls the loop
  stopWhen: stepCountIs(5),
  
  prompt: 'What is the weather in San Francisco in Celsius?',
  temperature: 0,  // recommended for tool calling
});

console.log(result.text);           // Final text response
console.log(result.toolCalls);      // All tool calls made
console.log(result.toolResults);    // All tool results
console.log(result.steps.length);   // Number of LLM invocations
```

### toolChoice Option

```ts
toolChoice: 'auto'      // model decides (default)
toolChoice: 'none'      // model must not call tools
toolChoice: 'required'  // model MUST call at least one tool
toolChoice: { type: 'tool', toolName: 'getWeather' }  // force specific tool
```

---

## How Tool Results Flow Through the Loop

**Step 1:** Model generates text with a tool call embedded:
```
Model output: [tool-call: getWeather({ city: "San Francisco" })]
finishReason: 'tool-calls'
```

**Step 2 (SDK automatic):** SDK invokes `weatherTool.execute({ city: "San Francisco" })` → returns result.

**Step 3:** SDK appends to message history:
```
messages: [
  { role: 'user', content: 'What is the weather in San Francisco?' },
  { role: 'assistant', content: [{ type: 'tool-call', toolName: 'getWeather', input: { city: 'San Francisco' }, toolCallId: 'tc_1' }] },
  { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'tc_1', result: { city: 'SF', temperature: 72 } }] },
]
```

**Step 4:** Model generates a new response using tool result → produces text.

**Step 5:** `stopWhen` is evaluated. If not met, loop continues. If met or `finishReason !== 'tool-calls'`, returns.

---

## Streaming with Tools

```ts
import { streamText, stepCountIs } from 'ai';

const result = streamText({
  model: openai('gpt-4o-mini'),
  tools: { getWeather: weatherTool },
  stopWhen: stepCountIs(5),
  prompt: 'What is the weather in Paris?',
  onStepFinish: async ({ toolResults }) => {
    console.log('Step tools:', toolResults);
  },
});

// In fullStream, tool-related events:
for await (const part of result.fullStream) {
  if (part.type === 'tool-call') {
    console.log('Tool:', part.toolName, 'Input:', part.input);
  }
  if (part.type === 'tool-result') {
    console.log('Result:', part.result);
  }
}
```

---

## Human-in-the-Loop Tools (No execute function)

```ts
const approvalTool = tool({
  description: 'Send an email — requires human approval',
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  // No execute() → SDK pauses and returns tool call for human handling
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools: { sendEmail: approvalTool },
  prompt: 'Send a welcome email to alice@example.com',
});

// result.finishReason === 'tool-calls' but no execute ran
// result.toolCalls contains the pending call for you to handle
if (result.toolCalls[0]?.toolName === 'sendEmail') {
  const args = result.toolCalls[0].input;
  // Show args to human, get approval, then run the action
}
```

---

## Tool Approval (needsApproval: true)

In v6, tools can have `needsApproval: true` to signal they need UI-level approval before executing. This integrates with the approval flow in route handlers. This is more structured than the "no execute" pattern:

```ts
const dangerousTool = tool({
  description: 'Delete a file — requires explicit user confirmation',
  inputSchema: z.object({ path: z.string() }),
  needsApproval: true,
  execute: async ({ path }) => { /* runs only after approval */ },
});
```

---

## Dynamic Tools (v6 addition)

```ts
import { dynamicTool } from 'ai';

// Schema resolved at runtime
const dynamicSearch = dynamicTool({
  description: 'Search the knowledge base',
  // inputSchema is a function, not a value
  inputSchema: async () => z.object({ query: z.string() }),
  execute: async ({ query }) => ({ results: [] }),
});
```

---

## Streaming Tool Execute (Async Generator)

Tools can stream intermediate states using async generators — seen in the v6 `next-agent` example:

```ts
const weatherTool = tool({
  description: 'Get weather with loading state',
  inputSchema: z.object({ city: z.string() }),
  async *execute({ city }) {
    yield { state: 'loading' as const };          // intermediate update
    await new Promise(r => setTimeout(r, 1000));   // simulate API latency
    yield { state: 'ready' as const, temperature: 72, condition: 'sunny' };
  },
});
```

This yields `UIToolInvocation` states that appear in the stream, enabling progressive UI updates for long-running tool calls.

**Evidence:** `examples/next-agent/tool/weather-tool.ts` — uses `async *execute({ city })` with `yield { state: 'loading' }` then `yield { state: 'ready', ... }`.

---

## Complete Working Example: Weather Tool with generateText

```ts
import { generateText, tool, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o-mini'),
  tools: {
    weather: tool({
      description: 'Get the weather in a location (returns mock data)',
      inputSchema: z.object({
        location: z.string().describe('City name'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
        units: 'fahrenheit',
        condition: 'partly cloudy',
      }),
    }),
  },
  stopWhen: stepCountIs(5),
  prompt: 'What is the weather in San Francisco?',
  temperature: 0,
});

// Assertions:
console.assert(result.steps.length >= 2, 'Should have taken at least 2 steps');
console.assert(result.toolCalls.some(tc => tc.toolName === 'weather'), 'weather tool should have been called');
console.assert(result.toolResults.length > 0, 'Should have tool results');
console.assert(result.text.length > 0, 'Should have final text response');
console.log('Final answer:', result.text);
```

**Evidence:** Pattern confirmed by `ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling` and source `stop-condition.ts`.
