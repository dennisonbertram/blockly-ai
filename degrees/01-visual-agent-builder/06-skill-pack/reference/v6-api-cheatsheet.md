# Reference: Vercel AI SDK v6 API Cheatsheet

**Version:** `ai@6.0.184` (runtime-verified 2026-05-16)

---

## Import Map

```ts
import { generateText, streamText, tool, Output, stepCountIs, hasToolCall, isLoopFinished } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai }    from '@ai-sdk/openai'
import { z } from 'zod'

// Testing only
import { MockLanguageModelV3, mockValues } from 'ai/test'
```

---

## Old → New Rename Table

| OLD (v3/v4/v5 stale) | NEW (v6.0.184 correct) | Notes |
|---|---|---|
| `experimental_generateText` | `generateText` | Stable since v4 |
| `experimental_streamText` | `streamText` | Stable since v4 |
| `generateObject(...)` | `generateText({ output: Output.object({ schema }) })` | Deprecated in v6; avoid |
| `streamObject(...)` | `streamText({ output: Output.object({ schema }) })` | Deprecated in v6; avoid |
| `parameters: z.object(...)` in `tool()` | `inputSchema: z.object(...)` | Renamed v5 → v6 |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` | `maxSteps` removed in v5 |
| `CoreMessage` | `ModelMessage` | Renamed in v5 |
| `maxTokens: N` | `maxOutputTokens: N` | Renamed in v5 |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` | Renamed in v5 |
| `MockLanguageModelV1` | `MockLanguageModelV3` | Follows LM spec version |
| `result.object` (from `generateObject`) | `result.output` | Accessor renamed |
| `isStepCount` (v7 canary only) | `stepCountIs` | Use v6 name; v7 renames it back |

---

## `generateText` — Must Be Awaited

```ts
const result = await generateText({
  model: anthropic('claude-haiku-4-5'),
  prompt: 'Explain attention mechanisms',
})
console.log(result.text)             // string
console.log(result.totalUsage)       // { inputTokens, outputTokens } — use totalUsage for multi-step
```

## `streamText` — Must NOT Be Awaited

```ts
const result = streamText({          // no await
  model: anthropic('claude-haiku-4-5'),
  prompt: 'Stream this response',
})
for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}
```

## `tool()` — Use `inputSchema` not `parameters`

```ts
const myTool = tool({
  description: 'Search the web for current information',
  inputSchema: z.object({ query: z.string() }),   // NOT parameters:
  execute: async (input) => {
    return await __tools.search(input.query)
  },
})
```

## `Output.object()` — Use `result.output` not `result.object`

```ts
const result = await generateText({
  model: anthropic('claude-haiku-4-5'),
  output: Output.object({
    schema: z.object({
      title: z.string(),
      score: z.number(),
    }),
  }),
  prompt: 'Generate a research summary',
})
console.log(result.output.title)    // NOT result.object.title
```

## Stop Conditions

```ts
// After 5 steps (model still called to summarize tool results)
stopWhen: stepCountIs(5)

// Loop until natural termination
stopWhen: isLoopFinished()

// Stop when named tool is called (tool runs, model NOT called again after)
stopWhen: hasToolCall('finalAnswer')

// Combine conditions
stopWhen: [stepCountIs(10), hasToolCall('done')]
```

## `generateText` with Tools (Agent Pattern)

```ts
const result = await generateText({
  model: anthropic('claude-haiku-4-5'),
  tools: { search: searchTool, fetch: fetchTool },
  stopWhen: stepCountIs(5),
  prompt: 'Research transformer attention mechanisms',
})
console.log(result.text)
console.log(result.totalUsage)      // NOT result.usage for multi-step
```

---

## MockLanguageModelV3 Quick Reference

```ts
import { MockLanguageModelV3, mockValues } from 'ai/test'

const mock = new MockLanguageModelV3({
  doGenerate: mockValues(             // spread args, NOT array
    {
      content: [{ type: 'text', text: 'Response' }],
      finishReason: { unified: 'stop' },        // object, NOT string
      usage: {
        inputTokens:  { total: 100 },           // nested, NOT flat
        outputTokens: { total: 50 },
      },
    }
  ),
})
```

---

## v7 Canary — Do Not Use

v7 canary renames `stepCountIs` → `isStepCount` and makes packages ESM-only. Do not target v7 for production work until it reaches `latest` dist-tag.

---

## Links

- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Reference: Package Pins](package-pins.md)
- [Back to Index](../index.md)
