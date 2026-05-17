# Observability and Error Handling

## Telemetry — experimental_telemetry (v6)

The AI SDK wraps OpenTelemetry. It's marked experimental but is the only first-party telemetry API.

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/telemetry` — "This feature is currently experimental and subject to change."

### Basic Usage

```ts
import { generateText } from 'ai';

const result = await generateText({
  model: anthropic('claude-haiku-4-5'),
  prompt: 'Tell me a joke.',
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'my-generation-fn',     // identifies this call in traces
    metadata: {
      userId: 'user-123',
      requestId: 'req-abc',
    },
    recordInputs: true,   // default: true (disable for PII)
    recordOutputs: true,  // default: true (disable for large outputs)
  },
});
```

### OpenTelemetry Spans Created

| Function | Spans emitted |
|----------|--------------|
| `generateText` | `ai.generateText`, `ai.generateText.doGenerate`, `ai.toolCall` (per tool) |
| `streamText` | `ai.streamText`, `ai.streamText.doStream`, `ai.toolCall`, events: `ai.stream.firstChunk`, `ai.stream.finish` |
| `embed` | `ai.embed`, `ai.embed.doEmbed` |

### Telemetry Integrations Interface (TelemetryIntegration)

```ts
experimental_telemetry: {
  isEnabled: true,
  integrations: [
    devToolsIntegration(),  // AI SDK DevTools
    {
      onStart: ({ model, messages }) => { /* log start */ },
      onStepStart: ({ step }) => { /* log step */ },
      onStepFinish: ({ step }) => { /* log step result */ },
      onToolCallStart: ({ toolCall }) => { /* log tool invocation */ },
      onToolCallFinish: ({ toolCall, result }) => { /* log result */ },
      onFinish: ({ result }) => { /* log final result */ },
    },
  ],
},
```

**Note:** Errors in integration callbacks are caught and do not disrupt generation.

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/telemetry` — "Telemetry integrations let you hook into the generation lifecycle."

### Deprecation Note

`generateObject` and `streamObject` are deprecated in v6. If you still use them, their legacy span names (`ai.generateObject`, etc.) still fire, but they won't be maintained.

---

## Lifecycle Callbacks (Without OpenTelemetry)

Simpler than full OTel for logging:

```ts
const result = await generateText({
  model,
  prompt: '...',
  onStepFinish: ({ steps, toolResults, text, usage }) => {
    console.log(`Step ${steps.length}: ${usage.outputTokens} output tokens`);
    if (toolResults.length) {
      console.log('Tools:', toolResults.map(r => `${r.toolName}(${JSON.stringify(r.result)})`));
    }
  },
  onFinish: ({ text, totalUsage, steps, finishReason }) => {
    console.log(`Done. ${steps.length} steps, ${totalUsage.inputTokens}→${totalUsage.outputTokens} tokens`);
  },
});

// For streamText only:
const result = streamText({
  model,
  prompt: '...',
  onChunk: (chunk) => { /* per chunk */ },
  onError: ({ error }) => { console.error('Stream error:', error); },
  onAbort: ({ steps }) => { console.log('Aborted after:', steps.length); },
});
```

---

## Error Classes — Complete Reference

All errors are in `ai/src/error` and follow `AI_*` naming. Each has a static `.isInstance(err)` discriminator.

```ts
import { APICallError, NoObjectGeneratedError, /* etc. */ } from 'ai';

// Note: import names drop the AI_ prefix
// AI_APICallError → import { APICallError }
// AI_NoObjectGeneratedError → import { NoObjectGeneratedError }
```

### Common Errors and Their Properties

| Error Class | Trigger | Key Properties |
|-------------|---------|----------------|
| `APICallError` | HTTP failure from provider | `statusCode`, `isRetryable`, `url`, `requestBodyValues`, `responseBody` |
| `NoObjectGeneratedError` | generateText with Output.object fails | `text` (raw model output), `response`, `usage`, `cause` |
| `TypeValidationError` | Schema validation failure | `value`, `cause` |
| `InvalidToolInputError` | Tool received args not matching schema | `toolName`, `toolArgs`, `cause` |
| `NoSuchToolError` | Model called a tool not in `tools:` | `toolName`, `availableTools` |
| `RetryError` | Max retries exhausted | `reason`, `errors` (each attempt's error) |
| `InvalidPromptError` | Malformed prompt/message structure | `prompt`, `message` |
| `LoadAPIKeyError` | API key env var missing | `keyName` |
| `JSONParseError` | Model output not parseable as JSON | `text`, `cause` |
| `NoContentGeneratedError` | Model returned empty response | `message` |
| `UnsupportedFunctionalityError` | Provider doesn't support requested feature | `functionality` |

### Rate Limit Handling Pattern

```ts
import { APICallError } from 'ai';

async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (APICallError.isInstance(err) && err.statusCode === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited; retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}
```

Note: The SDK's built-in `maxRetries` (default: 2) handles some retryable errors automatically via `isRetryable` on `APICallError`. Rate limits (429) are marked retryable.

### Context Length Error Detection

```ts
try {
  const result = await generateText({ model, messages: veryLongHistory, prompt: '...' });
} catch (err) {
  if (APICallError.isInstance(err) && err.statusCode === 400) {
    // Check responseBody for context length message
    const body = JSON.parse(err.responseBody ?? '{}');
    if (body?.error?.code === 'context_length_exceeded') {
      // Trim messages and retry
    }
  }
}
```

Context length errors surface as `APICallError` with `statusCode: 400`, not a dedicated error class.

---

## Logging Tool Calls and Timings

```ts
const startTime = Date.now();

const result = await generateText({
  model,
  tools: { myTool },
  stopWhen: stepCountIs(5),
  prompt: '...',
  experimental_telemetry: {
    isEnabled: true,
    integrations: [{
      onToolCallStart: ({ toolCall }) => {
        console.log(`[TOOL START] ${toolCall.toolName}(${JSON.stringify(toolCall.input)})`);
        toolCall['_startTime'] = Date.now();
      },
      onToolCallFinish: ({ toolCall, result }) => {
        const elapsed = Date.now() - (toolCall['_startTime'] ?? Date.now());
        console.log(`[TOOL DONE] ${toolCall.toolName} in ${elapsed}ms → ${JSON.stringify(result)}`);
      },
    }],
  },
});

console.log(`Total: ${Date.now() - startTime}ms, ${result.totalUsage.inputTokens}→${result.totalUsage.outputTokens} tokens`);
```
