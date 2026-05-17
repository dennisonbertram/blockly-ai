# AI SDK v6 — Capability Map

## AI SDK Core (server/edge-runnable, no React dependency)

### Text Generation

| Function | Description | Limits |
|----------|-------------|--------|
| `generateText` | Non-streaming text + tool calls | Returns when model finishes; multi-step via `stopWhen` |
| `streamText` | Streaming text + tool calls | Returns `textStream`, `fullStream`, response helpers |
| `embed` | Single-text embedding | Provider must support embeddings |
| `embedMany` | Batch embeddings | Limit depends on provider; throws `AI_TooManyEmbeddingValuesForCallError` |

### Structured Output (v6 — via `output` property, NOT `generateObject`)

| Mode | How | Description |
|------|-----|-------------|
| `Output.text()` | `generateText({ output: Output.text() })` | Default; plain string |
| `Output.object({ schema })` | `generateText({ output: Output.object({...}) })` | Zod/Valibot/JSON schema validated object |
| `Output.array({ element })` | `generateText({ output: Output.array({...}) })` | Validated array; `elementStream` for streaming |
| `Output.choice({ options })` | `generateText({ output: Output.choice({...}) })` | Classification — forces one of N strings |
| `Output.json()` | `generateText({ output: Output.json() })` | Valid JSON, no schema validation |

**DEPRECATED (still works, avoid):** `generateObject(...)`, `streamObject(...)`. Evidence: CHANGELOG v6.0.0-beta.127 "deprecate generateObject and streamObject".

### Tool Calling

| Export | Purpose |
|--------|---------|
| `tool({ description, inputSchema, execute })` | Define a tool; TypeScript type helper only — no runtime behavior |
| `dynamicTool(...)` | Define a tool with dynamic (runtime-resolved) schema |
| `tools:` param on generateText/streamText | Pass a `ToolSet` (record of tool name → tool definition) |
| `stopWhen: stepCountIs(n)` | Cap multi-step loops |
| `stopWhen: hasToolCall('name')` | Stop when named tool fires |
| `stopWhen: isLoopFinished()` | Loop until natural termination |
| `prepareStep` | Hook to modify params before each step in loop |

### Agent Classes

| Export | Purpose |
|--------|---------|
| `ToolLoopAgent` | Reusable agent instance with `generate()` and `stream()` methods |
| `createAgentUIStreamResponse` | Create a streaming HTTP response from a ToolLoopAgent |
| `InferAgentUIMessage<T>` | Type helper for agent UI messages |

**Evidence:** `packages/ai/src/agent/index.ts` exports `ToolLoopAgent`, `createAgentUIStreamResponse`, `createAgentUIStream`, `pipeAgentUIStreamToResponse`. Weather agent example (`examples/next-agent`) uses `ToolLoopAgent` with OpenAI.

### Other Core Capabilities

| Capability | Export | Notes |
|------------|--------|-------|
| Image generation | `generateImage` | Separate from text; needs image-capable provider |
| Speech synthesis | `generateSpeech` | TTS |
| Transcription | `transcribe` | STT |
| Video generation | `generateVideo` | Limited provider support |
| Reranking | `rerank` | For RAG ranking |
| File upload | `uploadFile`, `uploadSkill` | Multimodal input prep |
| Embeddings | `embed`, `embedMany` | Vector representations |

### Middleware

| Export | Purpose |
|--------|---------|
| `wrapLanguageModel` | Wrap a model with middleware chain |
| `LanguageModelV3Middleware` | Interface with `transformParams`, `wrapGenerate`, `wrapStream` |
| Built-in middleware | Reasoning extraction, JSON fence stripping, simulated streaming, default settings |

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/middleware` — "Middleware is model-agnostic, so the same middleware can be reused across different providers."

### Error Classes (from `ai/src/error`)

All errors follow the `AI_*` prefix pattern and expose static `.isInstance(error)` method:

- `AI_APICallError` — HTTP failures; has `statusCode`, `isRetryable`
- `AI_NoObjectGeneratedError` — structured output failure; has `text`, `response`, `usage`
- `AI_TypeValidationError` — schema validation failures
- `AI_InvalidToolInputError` — tool input doesn't match schema
- `AI_NoSuchToolError` — model called a tool that doesn't exist in `tools` param
- `AI_RetryError` — all retries exhausted
- `AI_InvalidPromptError` — malformed prompt structure
- `AI_LoadAPIKeyError` — API key missing/malformed
- `AI_JSONParseError` — model output couldn't be parsed as JSON

**Evidence:** `ai-sdk.dev/docs/reference/ai-sdk-errors` lists 31 error classes.

---

## AI SDK UI (React/Next.js required — client-side hooks)

| Hook | Package | Purpose |
|------|---------|---------|
| `useChat` | `@ai-sdk/react` | Manages chat state; sends to `/api/chat` route |
| `useCompletion` | `@ai-sdk/react` | Simpler single-completion hook |
| `useObject` | `@ai-sdk/react` | Streams structured objects |

**`useChat` v6 shape:**
```ts
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});
```

`messages` are `UIMessage[]` — each has `id`, `role`, and `parts: Part[]` (not a single `content` string). This is a v5 breaking change.

**Evidence:** `ai-sdk.dev/docs/ai-sdk-ui/chatbot` — "The UI messages have a new `parts` property that contains the message parts."

### What AI SDK UI Does NOT Do

- Does NOT work in server-only environments (no React = no hooks)
- `useChat` does NOT accept old string-content messages without conversion
- `useAssistant` hook was removed in v5 — no replacement in v6

---

## Provider Packages

| Package | Models | Notes |
|---------|--------|-------|
| `@ai-sdk/openai` | GPT-4o, GPT-4o-mini, o1, o3, GPT-5.x | `openai('gpt-4o-mini')` |
| `@ai-sdk/anthropic` | Claude 4.x (Opus, Sonnet, Haiku) | `anthropic('claude-haiku-4-5')` |
| `@ai-sdk/google` | Gemini 1.5/2.x, Gemini Flash | `google('gemini-2.0-flash')` |
| `@ai-sdk/mistral` | Mistral 7B, Mixtral | `mistral('mistral-small-latest')` |
| `@ai-sdk/gateway` | Bundled in `ai`; 100+ models via `gateway('provider/model')` | Built into `ai` package |

### AI Gateway (Vercel-hosted proxy)

The `gateway()` function (exported from `ai`) routes through Vercel's AI Gateway — a unified proxy to 100+ models. Uses `AI_GATEWAY_API_KEY` env var. Avoids per-provider SDK installs.

```ts
import { gateway } from 'ai';
const result = await generateText({
  model: gateway('anthropic/claude-sonnet-4-6'),
  prompt: 'Hello',
});
```

**Evidence:** `ai-sdk.dev` homepage: "AI Gateway — access to 100+ models via a unified endpoint." `ai/src/index.ts` exports `createGateway, gateway` from `@ai-sdk/gateway`.

---

## Language Model Interface (v3 spec)

Every model (from any provider) implements `LanguageModelV3` from `@ai-sdk/provider`:
- `doGenerate(options)` — non-streaming generation
- `doStream(options)` — streaming generation
- `provider: string`
- `modelId: string`
- `supportedUrls()` — for multimodal URL support

This interface is what makes provider-swapping seamless. The SDK calls `doGenerate`/`doStream`; the provider translates to vendor API format.

---

## What the AI SDK Does NOT Do

- No built-in conversation persistence (bring your own store)
- No built-in rate limiting or token budget tracking (must implement via middleware or external tools)
- No prompt templates or prompt management
- No vector database integration (bring Pinecone, pgvector, etc.)
- No fine-tuning API
- No evaluation/evals framework (separate tooling needed)
- No multi-modal output beyond text, files (images), speech, video — no 3D, AR, etc.
- No browser-side model invocation (all calls must be server-side to protect API keys)
