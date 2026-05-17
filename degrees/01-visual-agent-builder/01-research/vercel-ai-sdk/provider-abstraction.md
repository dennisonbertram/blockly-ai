# Provider Abstraction — Swapping Models

## The Core Pattern

```ts
// All three are drop-in replacements for each other:
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { gateway } from 'ai';

// Same generateText call, different models:
model: openai('gpt-4o-mini')
model: anthropic('claude-haiku-4-5')
model: google('gemini-2.0-flash')
model: gateway('anthropic/claude-haiku-4-5')  // via Vercel AI Gateway
```

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/provider-management` — "Import them from their dedicated packages" with examples showing identical call structure.

---

## AI Gateway (Recommended for Multi-Provider)

The AI Gateway is a Vercel-hosted proxy that routes to 100+ models. You use ONE API key instead of per-provider keys:

```ts
import { gateway } from 'ai';  // exported from main 'ai' package

// Provider string format: 'provider/model-id'
model: gateway('openai/gpt-4o-mini')
model: gateway('anthropic/claude-haiku-4-5')
model: gateway('google/gemini-2.0-flash')
model: gateway('meta/llama-3.1-70b-instruct')
```

Env var: `AI_GATEWAY_API_KEY`

**Tradeoff:** Adds a proxy hop (minimal latency), requires Vercel account. Benefit: single key, vendor diversification, built-in failover.

**Evidence:** `ai-sdk.dev` homepage: "AI Gateway — access to 100+ models via a unified endpoint." `ai/src/index.ts`: `export { createGateway, gateway }` from `@ai-sdk/gateway`.

---

## Custom Provider (Aliasing)

Use `customProvider` (or `createProviderRegistry`) to create stable name aliases:

```ts
import { createProviderRegistry, customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// Option 1: Custom provider with aliases
const myProvider = customProvider({
  languageModels: {
    'fast': openai('gpt-4o-mini'),
    'smart': anthropic('claude-sonnet-4-6'),
    'reason': openai('o3-mini'),
  },
});

const result = await generateText({
  model: myProvider.languageModel('fast'),
  prompt: '...',
});

// Option 2: Registry with prefix syntax
const registry = createProviderRegistry({ openai, anthropic });
const result = await generateText({
  model: registry.languageModel('openai:gpt-4o-mini'),
  prompt: '...',
});
```

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/provider-management` — describes both patterns.

---

## Provider-Specific Options

Common options work identically across providers. Provider-specific options go in `providerOptions`:

```ts
// Anthropic: extended thinking
providerOptions: {
  anthropic: { 
    thinking: { type: 'enabled', budgetTokens: 32000 } 
  }
}

// OpenAI: reasoning effort
providerOptions: {
  openai: { 
    reasoningEffort: 'high'  // 'low' | 'medium' | 'high'
  }
}
```

These options are SCOPED per provider and do NOT transfer when you swap providers.

---

## What Does NOT Translate Between Providers

| Feature | OpenAI behavior | Anthropic behavior |
|---------|----------------|--------------------|
| Structured output strict mode | `strict: true` in tool → forces strict schema adherence | No direct equivalent; uses JSON mode |
| System message | Fully supported | Can have issues with some tool call combinations |
| Reasoning/thinking | `reasoningEffort: 'low/medium/high'` via providerOptions | `thinking: { type: 'enabled', budgetTokens }` via providerOptions |
| Tool call format | JSON schema function calling | XML-based tool use (abstracted by SDK) |
| Vision/multimodal | `gpt-4o` supports images; older GPT-4 does not | All Claude 4.x models support images |
| Streaming tool calls | Streams tool-call deltas | Different streaming format |
| `stopSequences` | Supported | Supported |
| `topK` | Not supported (providers without it → `warnings`) | Supported |
| Model ID format | `gpt-4o-mini` (no version date typically) | `claude-haiku-4-5-20251001` or `claude-haiku-4-5` (alias) |

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/provider-management` — "Provider-specific options are scoped per provider... these settings won't carry over if you swap the underlying model to a different vendor." Also: `ai-sdk.dev/docs/ai-sdk-core/prompt-engineering` — "check `result.warnings` to see if features were unsupported by a provider."

---

## Model String Formats (Provider-Specific)

```ts
// OpenAI
openai('gpt-4o')
openai('gpt-4o-mini')
openai('gpt-4.1')
openai('o3-mini')
openai('o1')

// Anthropic (use API IDs from Anthropic docs)
anthropic('claude-haiku-4-5')            // alias for claude-haiku-4-5-20251001
anthropic('claude-haiku-4-5-20251001')   // pinned version
anthropic('claude-sonnet-4-6')           // sonnet 4.6
anthropic('claude-opus-4-7')             // most capable

// Google
google('gemini-2.0-flash')
google('gemini-1.5-pro')
```

**Evidence (Anthropic model IDs):** `platform.claude.com/docs/en/docs/about-claude/models` — current model table with API IDs. `claude-haiku-4-5` and `claude-sonnet-4-6` are the recommended current models.

---

## Custom Base URL (Self-Hosted / OpenAI-Compatible)

```ts
import { createOpenAI } from '@ai-sdk/openai';

const localModel = createOpenAI({
  baseURL: 'http://localhost:11434/v1',  // Ollama local
  apiKey: 'ollama',
});

const result = await generateText({
  model: localModel('llama3.2'),
  prompt: 'Hello',
});
```

This works for any OpenAI-compatible API (Ollama, LM Studio, vLLM, Azure OpenAI, etc.).

---

## wrapLanguageModel for Cross-Provider Middleware

Apply the same middleware to any provider:

```ts
import { wrapLanguageModel, experimental_telemetryMiddleware } from 'ai';

function createTracedModel(baseModel) {
  return wrapLanguageModel({
    model: baseModel,
    middleware: {
      wrapGenerate: async ({ doGenerate, params }) => {
        const start = Date.now();
        const result = await doGenerate();
        console.log(`Generated in ${Date.now() - start}ms`);
        return result;
      },
    },
  });
}

// Works with any provider:
const tracedOpenAI = createTracedModel(openai('gpt-4o-mini'));
const tracedAnthropic = createTracedModel(anthropic('claude-haiku-4-5'));
```
