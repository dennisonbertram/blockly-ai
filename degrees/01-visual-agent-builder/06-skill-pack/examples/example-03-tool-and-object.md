# Example 03 — Tool Call + Structured Object Output

**What it demonstrates:** A workspace with a Tool block (using `inputSchema`) and a GenerateObject block (using `Output.object` with `result.output`).

**Complexity:** Intermediate — tool definitions, Zod schema, structured output.

---

## Workspace Description

Two separate program patterns shown:

**Pattern A — Tool Call:**
- `ai_tool` block with `inputSchema: z.object({ query: z.string() })`
- Connected to a GenerateText block via `ai_use_tools`

**Pattern B — Structured Output:**
- `ai_generate_object` block with `ai_zod_object` schema
- Schema: `{ title: z.string(), score: z.number() }`

---

## Pattern A: Expected Emitted Code (Tool)

```ts
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  __sink?.('output', (await generateText({
    model: (__model_provider ?? anthropic('claude-haiku-4-5')),
    prompt: 'Search for recent AI news',
    tools: {
      search: tool({
        description: 'Search the web',
        inputSchema: z.object({ query: z.string() }),
        execute: async (input) => {
          return await __tools.search(input.query);
        },
      }),
    },
    stopWhen: stepCountIs(5),
  })).text);
}
```

## Pattern B: Expected Emitted Code (Structured Output)

```ts
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  __sink?.('output', (await generateText({
    model: (__model_provider ?? anthropic('claude-haiku-4-5')),
    output: Output.object({
      schema: z.object({
        title: z.string(),
        score: z.number(),
      }),
    }),
    prompt: 'Rate this article',
  })).output);   // NOTE: .output not .object
}
```

---

## Key Rules Illustrated

- `inputSchema:` not `parameters:` in `tool({})`
- `result.output` not `result.object` for structured output
- `Output.object` not `generateObject`
- `.nullable()` not `.optional()` on Zod fields (for OpenAI strict mode compatibility)
- `stopWhen: stepCountIs(5)` automatically added when tools are connected

---

## Links

- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Reference: Block Catalog](../reference/block-catalog.md)
- [Back to Index](../index.md)
