# Recipe: MockLanguageModelV3 — Correct Shapes

**Use when:** Writing Vitest execution tests that need a mock AI model (no real API keys required).

---

## The Four Rules (All Must Be Correct)

### Rule 1 — Use `mockValues(...)` not `[...]`

```ts
// WRONG — array literal does not work
doGenerate: [response1, response2]

// CORRECT — wrap in mockValues
import { MockLanguageModelV3, mockValues } from 'ai/test'

doGenerate: mockValues(response1, response2)
```

### Rule 2 — `finishReason` is an object, not a string

```ts
// WRONG
finishReason: 'stop'
finishReason: 'tool-calls'

// CORRECT
finishReason: { unified: 'stop' }
finishReason: { unified: 'tool-calls' }
```

### Rule 3 — `usage` is nested, not flat

```ts
// WRONG
usage: { promptTokens: 100, completionTokens: 50 }

// CORRECT
usage: {
  inputTokens:  { total: 100 },
  outputTokens: { total: 50 },
}
```

### Rule 4 — Tool-call `input` is a JSON string, not an object

```ts
// WRONG
input: { timezone: 'UTC' }

// CORRECT
input: JSON.stringify({ timezone: 'UTC' })
```

---

## Single-turn text generation

```ts
import { MockLanguageModelV3, mockValues } from 'ai/test'

const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues({
    content: [{ type: 'text', text: 'Hello, World!' }],
    finishReason: { unified: 'stop' },
    usage: { inputTokens: { total: 50 }, outputTokens: { total: 20 } },
  }),
})
```

## Two-turn agent (tool call then text)

```ts
const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues(
    // Turn 1: model decides to call a tool
    {
      content: [{
        type: 'tool-call',
        toolName: 'search',
        toolCallId: 'tc_001',
        input: JSON.stringify({ query: 'transformer attention' }),
      }],
      finishReason: { unified: 'tool-calls' },
      usage: { inputTokens: { total: 20 }, outputTokens: { total: 5 } },
    },
    // Turn 2: model uses the tool result and responds
    {
      content: [{ type: 'text', text: 'Based on search results...' }],
      finishReason: { unified: 'stop' },
      usage: { inputTokens: { total: 80 }, outputTokens: { total: 30 } },
    }
  ),
})
```

## Streaming (text-delta chunks)

```ts
// For streamText tests — chunks use delta: field and matching id:
const mockModel = new MockLanguageModelV3({
  doStream: mockValues({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-start',  id: 'ts_1' })
        controller.enqueue({ type: 'text-delta',  id: 'ts_1', delta: 'Hello' })
        controller.enqueue({ type: 'text-delta',  id: 'ts_1', delta: ', World' })
        controller.enqueue({ type: 'text-end',    id: 'ts_1' })
        controller.enqueue({ type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } } })
        controller.close()
      }
    })
  })
})
```

## Structured output (generateText + Output.object)

```ts
const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues({
    content: [{ type: 'text', text: JSON.stringify({
      title: 'Transformers',
      keyFindings: ['Self-attention scales'],
      confidenceScore: 0.9,
      limitations: 'Sample size limited',
      suggestedNextSteps: ['Replicate study'],
    }) }],
    finishReason: { unified: 'stop' },
    usage: { inputTokens: { total: 100 }, outputTokens: { total: 50 } },
  }),
})

// Access the structured output
const result = await run({ model: mockModel, sink: vi.fn() })
expect(result.output.title).toBe('Transformers')   // NOT result.object.title
```

---

## Probing the actual export names

Always verify names against the installed package before writing tests:

```bash
node -e "console.log(Object.keys(require('ai/test')).sort().join('\n'))"
```

---

## Links

- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Troubleshooting: MockLanguageModel Shape Error](../troubleshooting/symptom-mocklanguagemodel-shape-error.md)
- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [Back to Index](../index.md)
