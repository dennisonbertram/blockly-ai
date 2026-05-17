# Example 02 — Single GenerateText Call

**What it demonstrates:** A workspace with one Model block + one GenerateText block, generating and executing an AI call via `generateText`.

**Complexity:** Basic — one AI call, no tools, no streaming.

---

## Workspace Fixture

```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "ai_generate_text",
        "inputs": {
          "MODEL": {
            "block": {
              "type": "ai_model",
              "fields": {
                "PROVIDER": "anthropic",
                "NAME": "claude-haiku-4-5"
              }
            }
          },
          "PROMPT": {
            "block": {
              "type": "text",
              "fields": { "TEXT": "What is the capital of France?" }
            }
          }
        }
      }
    ]
  }
}
```

## Expected Emitted Code

```ts
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  __sink?.('output', (await generateText({
    model: (__model_provider ?? anthropic('claude-haiku-4-5')),
    prompt: 'What is the capital of France?',
  })).text);
}
```

## Test

```ts
const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues({
    content: [{ type: 'text', text: 'Paris' }],
    finishReason: { unified: 'stop' },
    usage: { inputTokens: { total: 20 }, outputTokens: { total: 5 } },
  }),
})

const sink = vi.fn()
await buildRunnable(code)(generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, mockModel, sink, {})

expect(sink).toHaveBeenCalledWith('output', 'Paris')
```

---

## Key Patterns Illustrated

- Model block as an expression returning `(__model_provider ?? anthropic('...'))` — allows the caller to override the model
- `generateText` MUST be awaited; result is accessed via `.text`
- `buildImportHeader` detects `anthropic(` in body and emits the correct import
- `__sink?.('output', value)` — optional chaining means tests can pass `undefined` for sink

---

## Links

- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Reference: Run Signature](../reference/run-signature.md)
- [Back to Index](../index.md)
