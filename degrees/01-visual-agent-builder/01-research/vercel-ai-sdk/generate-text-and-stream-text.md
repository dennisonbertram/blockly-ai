# generateText and streamText — Full Reference

## generateText

### Signature (v6)

```ts
import { generateText } from 'ai';

const result = await generateText({
  // REQUIRED: model instance
  model: openai('gpt-4o-mini'),  // or anthropic(...), google(...), gateway(...)

  // REQUIRED: one of prompt OR messages
  prompt: 'string',                          // simple single-user-turn
  // OR
  messages: ModelMessage[],                  // multi-turn conversation history
  
  // Optional: system instructions
  system: 'You are a helpful assistant.',    // string

  // Optional: tools
  tools: { toolName: tool({...}), ... },     // ToolSet
  toolChoice: 'auto' | 'none' | 'required', // or { type: 'tool', toolName: '...' }
  activeTools: ['toolName'],                 // restrict which tools the model can use

  // Optional: agentic loop
  stopWhen: stepCountIs(5),                  // StopCondition | StopCondition[]
  prepareStep: async ({ steps }) => ({}),    // modify params per step

  // Optional: structured output
  output: Output.object({ schema: z.object({...}) }),

  // Optional: sampling
  maxOutputTokens: 1000,
  temperature: 0,          // 0 = deterministic, recommended for tools/structured
  topP: 0.95,
  topK: 40,
  presencePenalty: 0,
  frequencyPenalty: 0,
  stopSequences: ['\n\n'],
  seed: 42,

  // Optional: execution
  maxRetries: 2,           // default 2
  abortSignal: controller.signal,
  timeout: 30000,          // ms; or { totalMs, stepMs, chunkMs }
  headers: {},             // extra HTTP headers to the provider

  // Optional: observability
  experimental_telemetry: { isEnabled: true, functionId: 'my-call' },
  onStepFinish: async ({ steps }) => { console.log(steps) },
  onFinish: async ({ text, usage }) => { /* persist */ },

  // Optional: provider-specific
  providerOptions: {
    anthropic: { thinking: { type: 'enabled', budgetTokens: 10000 } },
  },
});
```

### Return Value

```ts
result.text            // string — final generated text
result.content         // Part[] — text, reasoning, files, tool calls
result.reasoning       // string | undefined
result.toolCalls       // ToolCall[]
result.toolResults     // ToolResult[]
result.steps           // StepResult[] — one per LLM invocation
result.finishReason    // 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other'
result.usage           // { inputTokens, outputTokens, totalTokens }
result.totalUsage      // same, summed across all steps
result.response        // { id, modelId, timestamp, headers, messages }
result.warnings        // any provider feature-support warnings
result.output          // typed output when using Output.*
```

**Evidence:** `ai-sdk.dev/docs/reference/ai-sdk-core/generate-text` — complete return value list.

---

## streamText

### Signature (v6)

All `generateText` options apply. Additional streaming-specific options:

```ts
import { streamText } from 'ai';

const result = streamText({
  model: anthropic('claude-haiku-4-5'),
  messages: [...],
  system: '...',
  tools: {...},
  stopWhen: stepCountIs(5),
  
  // Streaming-specific callbacks
  onChunk: (chunk) => { /* called for each chunk */ },
  onError: ({ error }) => { /* called on stream error — does NOT throw */ },
  onStepFinish: async ({ toolResults }) => { /* per step */ },
  onFinish: ({ text, usage }) => { /* whole run complete */ },
  onAbort: ({ steps }) => { /* AbortSignal fired */ },
});
```

Note: `streamText` is NOT awaited — it returns synchronously with a result object that contains async iterables.

### Iterating textStream (text only)

```ts
const { textStream } = streamText({
  model: openai('gpt-4o-mini'),
  prompt: 'Tell me a story.',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk); // chunk is a string delta
}
```

### Iterating fullStream (all events)

```ts
const { fullStream } = streamText({ model, prompt, tools });

for await (const part of fullStream) {
  switch (part.type) {
    case 'text':
      process.stdout.write(part.text);
      break;
    case 'tool-call':
      console.log('Tool called:', part.toolName, part.input);
      break;
    case 'tool-result':
      console.log('Tool result:', part.result);
      break;
    case 'start-step':
      console.log('New step started');
      break;
    case 'finish-step':
      console.log('Step done:', part.finishReason, part.usage);
      break;
    case 'finish':
      console.log('Run done:', part.finishReason, part.totalUsage);
      break;
    case 'error':
      console.error('Stream error:', part.error);
      break;
    case 'abort':
      console.log('Aborted after steps:', part.steps.length);
      break;
  }
}
```

**fullStream chunk types (complete list):**
`text`, `reasoning`, `source`, `file`, `tool-call`, `tool-call-streaming-start`, `tool-call-delta`, `tool-result`, `start-step`, `finish-step`, `start`, `finish`, `reasoning-part-finish`, `error`, `abort`.

**Evidence:** `ai-sdk.dev/docs/reference/ai-sdk-core/stream-text` — "fullStream: AsyncIterable<TextStreamPart<TOOLS>> & ReadableStream<TextStreamPart<TOOLS>> — emits typed chunks..."

---

## Response Helpers for Next.js Route Handlers

```ts
// For browser consumers using useChat hook (most common)
return result.toUIMessageStreamResponse();
// → Server-Sent Events stream; useChat parses it

// For plain text streaming
return result.toTextStreamResponse();
// → plain text response; manually readable

// For Node.js ServerResponse (not Next.js edge/app)
result.pipeUIMessageStreamToResponse(nodeServerResponse);
result.pipeTextStreamToResponse(nodeServerResponse);
```

**IMPORTANT:** `toDataStreamResponse()` from v4/v5 is RENAMED to `toUIMessageStreamResponse()` in v6.

**Evidence:** `ai-sdk.dev/docs/reference/ai-sdk-core/stream-text` — "toUIMessageStreamResponse(options?) → returns a Response for AI SDK UI consumers. Note: if you specifically need a method literally named toDataStreamResponse, it isn't present in this v6 reference."

### toUIMessageStreamResponse Options

```ts
result.toUIMessageStreamResponse({
  originalMessages: messages,
  generateMessageId: generateId,      // from 'ai'
  messageMetadata: ({ part }) => {
    if (part.type === 'start') return { createdAt: Date.now() };
  },
  onFinish: ({ messages }) => saveChat({ messages }),
  sendReasoning: true,
  sendSources: true,
  sendFinish: true,
  sendStart: true,
  onError: (error) => console.error(error),
  consumeSseStream: async ({ stream }) => { /* tee to resumable stream */ },
});
```

---

## prompt vs messages — When to Use Which

```ts
// Simple string prompt — single user turn
generateText({ model, prompt: 'Write a haiku about TypeScript.' });

// Multi-turn — explicit conversation history
generateText({
  model,
  system: 'You are a Haiku poet.',
  messages: [
    { role: 'user', content: 'Write a haiku about TypeScript.' },
    { role: 'assistant', content: 'Types align in rows...' },
    { role: 'user', content: 'Now make it more melancholic.' },
  ],
});
```

Message content can be strings (shorthand) or arrays of typed parts:

```ts
// Multi-modal user message
{
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image', image: 'https://example.com/img.png' },
    // or: image: new URL('...'), base64 string, ArrayBuffer, Uint8Array
  ]
}
```

**Evidence:** `ai-sdk.dev/docs/foundations/prompts` — user messages support text, image, and file parts.
