# Reference: Canonical Run Signature

The shape of every emitted module, as produced by `generateAsyncModule(workspace)`.

---

## Full Module Shape

```ts
import { generateText, streamText, tool, Output, stepCountIs, hasToolCall } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  // ... user program body ...
}
```

---

## Parameter Reference

| Parameter | Type | Description |
|---|---|---|
| `__model_provider` | `(name: string) => LanguageModel \| undefined` | Model factory. Blocks use `(__model_provider ?? anthropic('claude-haiku-4-5'))`. Caller passes `undefined` to use block defaults. |
| `__sink` | `((label: string, value: unknown) => void) \| undefined` | Output callback. Blocks call `__sink?.('output', value)`. Optional — if not provided, output is silently dropped. |
| `__tools` | `Record<string, (...args: any[]) => Promise<unknown>> \| undefined` | Tool stub map. Tool execute bodies call `await __tools.<name>(<arg>)`. Defaults to `undefined` for programs without tools. |

---

## How the Route Handler Calls `run`

```ts
// lib/execute/run-emitted.ts (simplified)
const fn = new Function(
  'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __model, __sink, __tools',
  strippedBody + '\nreturn run({ model: __model, sink: __sink, tools: __tools });'
)

const sinkCallback = (label: string, value: unknown) => {
  // write to ReadableStream
}

await fn(
  generateText, streamText, tool, Output, z, stepCountIs, hasToolCall,
  anthropic, openai,
  undefined,        // __model — undefined means blocks use their own defaults
  sinkCallback,
  tools             // tool stubs from route handler
)
```

## How Tests Call `run`

```ts
function buildRunnable(emittedSource: string) {
  const body = emittedSource
    .split('\n')
    .filter(line => !line.startsWith('import '))
    .map(line => line.replace(/^export default /, ''))
    .join('\n')
    + '\nreturn run({ model: __mockModel, sink: __sink, tools: __tools });'

  return new Function(
    'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __mockModel, __sink, __tools',
    body
  )
}
```

---

## Import Header Logic

The `buildImportHeader` function decides which imports to emit by scanning the body for substrings:

| Body contains | Import added |
|---|---|
| `anthropic(` | `import { anthropic } from '@ai-sdk/anthropic'` |
| `openai(` | `import { openai } from '@ai-sdk/openai'` |
| `streamText(` | `streamText` added to `ai` imports |
| `tool({` | `tool` added to `ai` imports |
| `Output.object(` | `Output` added to `ai` imports |
| `stepCountIs(` | `stepCountIs` added to `ai` imports |
| `hasToolCall(` | `hasToolCall` added to `ai` imports |
| `z.` | `import { z } from 'zod'` |
| always | `generateText` included in `ai` imports |

---

## Evolution Across POC Levels

| Level | `run` signature |
|---|---|
| L2 | `run({ model: __model_provider, sink: __sink } = {})` |
| L3 | Same + Output.object + tool in body |
| L4 | Same + streamText + stepCountIs + hasToolCall in body |
| L5 | Same (deployed to Vercel; shape unchanged) |
| Capstone | `run({ model: __model_provider, sink: __sink, tools: __tools } = {})` — added `tools` |

---

## Links

- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Recipe: Async Generator Post-Processor](../recipes/recipe-async-generator-postprocessor.md)
- [Recipe: Async Function Body Injection](../recipes/recipe-async-function-body-injection.md)
- [Reference: Block Catalog](block-catalog.md)
- [Back to Index](../index.md)
