# Mental Model — Vercel AI SDK v6

## The Core Abstraction: A Language Model is a Black Box

Every provider (OpenAI, Anthropic, Google) exposes the same interface — `LanguageModelV3`. When you write:

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: 'Hello',
});
```

You could swap `openai('gpt-4o-mini')` for `anthropic('claude-haiku-4-5')` with zero other changes. The SDK normalizes the API call, the streaming protocol, and error handling. This is the core value proposition.

**Mental rule:** Think of `model: <provider>('<model-id>')` as "pick a language model black box." The rest of your code is provider-agnostic.

---

## How a Single generateText Call Works

```
Your code
  → generateText({ model, prompt/messages, tools?, output?, stopWhen? })
    → SDK builds LanguageModelV3CallOptions
      → model.doGenerate(options) [provider translates to vendor API]
        → Vendor API returns raw response
      → SDK parses response: text, toolCalls, finishReason, usage
    → If finishReason === 'tool-calls' AND stopWhen not met:
        → execute each tool's execute() function
        → append tool results to message history
        → loop: call model.doGenerate() again with updated history
    → When loop ends: return GenerateTextResult
```

**Key insight:** `generateText` with `stopWhen` is an AGENTIC LOOP. The loop lives in the SDK, not your code. You just configure it.

---

## Steps, Runs, and the Loop Model

A **step** = one LLM invocation. A **run** = one `generateText`/`streamText` call with all its steps.

Each step produces:
- Text content (possibly empty)
- Tool calls (possibly empty)
- `finishReason` — WHY the model stopped

The loop continues until:
1. `finishReason !== 'tool-calls'` (model is done calling tools)
2. A tool without `execute` is encountered (human-in-the-loop trigger)
3. A tool requires approval (`needsApproval: true`)
4. Any `stopWhen` condition returns `true`

**Evidence:** `stop-condition.ts` source: "A tool calling loop continues until one of the following conditions is met: The model returns a finish reason other than `tool-calls`; A tool without an execute function is called; A tool call needs approval; One of the provided stop conditions returns true."

---

## Tool Calling is Request/Response Wrapped Around Model Output

A tool is NOT a special API feature — it's a structured negotiation:

1. You tell the model: "you can call these functions with this schema"
2. The model may output a special token sequence (provider-specific) meaning "call X with args Y"
3. The SDK parses this as a `toolCall` and invokes your `execute` function
4. The result goes back into the conversation as a `tool-result` message
5. The model generates a human-readable response based on the result

**The model never runs your execute() function.** Your SDK code does. The model only sees text inputs and outputs. `tool()` is a TypeScript type-helper that connects your `execute`'s arg types to the Zod schema — it has no runtime magic.

**Evidence:** AI SDK docs: "It does not have any runtime behavior, but it helps TypeScript infer the types of the input for the `execute` method."

---

## Streaming: Three Layers

```
Layer 1: textStream     — yields string chunks of text only
Layer 2: fullStream     — yields typed StreamPart objects (text, tool-call, tool-result, finish, error, etc.)
Layer 3: Response       — toUIMessageStreamResponse() serializes fullStream as SSE for the browser
```

For the browser to receive streaming AI responses:
- Route handler calls `streamText(...)` 
- Returns `result.toUIMessageStreamResponse()`
- Browser receives SSE; `useChat` hook parses it into `UIMessage[]`

**Mental rule:** `textStream` is for CLIs and simple loggers. `fullStream` is for anything needing tool call visibility. `toUIMessageStreamResponse()` is for browser consumers.

---

## UIMessage vs ModelMessage: The Boundary

There are two message formats in the SDK:

| Type | Lives in | Shape | Purpose |
|------|----------|-------|---------|
| `UIMessage` | Client/frontend | `{ id, role, parts: Part[] }` | Rendering; carries metadata, timestamps |
| `ModelMessage` | Server/provider | `{ role, content: string|Part[] }` | What the LLM actually receives |

`UIMessage` is richer — it has `parts` (typed array including text, tool invocations, reasoning, files). `ModelMessage` is leaner — what the provider API expects.

**You MUST convert between them.** The SDK provides `convertToModelMessages(uiMessages)` for server-side route handlers. In v4 this conversion happened automatically; v5 removed automatic conversion as a breaking change.

---

## generateObject is Deprecated — What Replaced It

In v6, structured output is expressed through the `output` property on `generateText`/`streamText`:

```ts
// v6 CORRECT
const { output } = await generateText({
  model: anthropic('claude-haiku-4-5'),
  output: Output.object({ schema: z.object({ name: z.string() }) }),
  prompt: 'Generate a user',
});

// v4/v5 pattern (deprecated, avoid)
const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5'),
  schema: z.object({ name: z.string() }),
  prompt: 'Generate a user',
});
```

**Rationale:** Unifying structured output and text generation into one function enables combining tools AND structured output in a single call.

---

## Provider-Specific Options: The Escape Hatch

When you need provider features that don't map to common settings (e.g., Anthropic's extended thinking, OpenAI's reasoning effort), use `providerOptions`:

```ts
generateText({
  model: anthropic('claude-sonnet-4-6'),
  providerOptions: {
    anthropic: { thinking: { type: 'enabled', budgetTokens: 32000 } }
  },
  prompt: '...',
});
```

**Mental rule:** `providerOptions` is the escape hatch. Common settings (`temperature`, `maxOutputTokens`, etc.) are portable. Anything in `providerOptions` is NOT portable — it's provider-specific and won't work if you swap providers.

---

## The ToolLoopAgent: Reusable Agent Configuration

`ToolLoopAgent` is a v6 class that bundles model + tools + stop conditions into a reusable object:

```ts
const agent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.',
  tools: { weather: weatherTool },
  stopWhen: stepCountIs(5),
});

// Use many times:
const result = await agent.generate({ prompt: 'What is the weather in Paris?' });
const stream = agent.stream({ prompt: 'What is the weather in Berlin?' });
```

vs. `generateText` which is a one-shot function. `ToolLoopAgent` is better when the same agent config is reused across requests (e.g., in a route handler that receives many messages).

---

## Error Propagation Model

- **Non-streaming errors:** Thrown as exceptions. Catch with `try/catch`. Use `AI_APICallError.isInstance(error)` to distinguish.
- **Streaming errors in textStream:** Thrown as exceptions during iteration.
- **Streaming errors in fullStream:** Appear as `{ type: 'error', error: ... }` and `{ type: 'tool-error', error: ... }` chunks. Do NOT throw — you must check chunk type.
- **Structured output errors:** `AI_NoObjectGeneratedError` thrown when model can't produce valid schema-conforming output.

**Mental rule:** For `fullStream`, ALWAYS check `part.type` and handle `'error'` chunks alongside your `try/catch`. Both are needed.
