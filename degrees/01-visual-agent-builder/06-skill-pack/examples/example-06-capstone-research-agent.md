# Example 06 — Capstone Research Agent

**What it demonstrates:** The full capstone program — a multi-tool research agent with structured `ResearchSummary` output, `__tools` injection, and the complete run signature.

**Complexity:** Advanced — all block types used together.

---

## What the Program Does

1. User enters a research query in the Blockly UI.
2. The agent calls `search(query)` and `fetch(url)` tools (via `__tools`) to gather information.
3. After up to 5 steps, generates a structured `ResearchSummary` object using `Output.object`.
4. The summary is piped to `__sink` which streams it back to the browser.

---

## Expected Emitted Code (Abbreviated)

```ts
import { generateText, tool, Output, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  const __result = await generateText({
    model: (__model_provider ?? anthropic('claude-haiku-4-5')),
    tools: {
      search: tool({
        description: 'Search the web for current information',
        inputSchema: z.object({ query: z.string() }),
        execute: async (input) => {
          return await __tools.search(input.query);
        },
      }),
      fetch: tool({
        description: 'Fetch the content of a URL',
        inputSchema: z.object({ url: z.string() }),
        execute: async (input) => {
          return await __tools.fetch(input.url);
        },
      }),
    },
    output: Output.object({
      schema: z.object({
        title: z.string(),
        keyFindings: z.array(z.string()),
        confidenceScore: z.number(),
        limitations: z.string(),
        suggestedNextSteps: z.array(z.string()),
      }),
    }),
    stopWhen: stepCountIs(5),
    prompt: 'Research transformer attention mechanisms',
  });
  __sink?.('output', __result.output);
}
```

---

## Tool Stubs (Server-Side)

```ts
// lib/tools/search.ts
export async function searchStub(query: string) {
  return [
    { title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
    { title: 'BERT explained', url: 'https://example.com/bert' },
  ]
}

// lib/tools/fetch.ts
export async function fetchStub(url: string) {
  return { content: `Content from ${url}`, wordCount: 500 }
}
```

## Route Handler Wiring

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60

import 'lib/blocks/generate-text'
import 'lib/blocks/model'
import 'lib/blocks/agent'
import 'lib/blocks/tool'
import 'lib/blocks/zod'

import { runEmitted }  from 'lib/execute/run-emitted'
import { searchStub }  from 'lib/tools/search'
import { fetchStub }   from 'lib/tools/fetch'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson, { tools: { search: searchStub, fetch: fetchStub } })
}
```

---

## Execution Test Mock

```ts
const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues({
    content: [{ type: 'text', text: JSON.stringify({
      title: 'Transformer Attention Mechanisms',
      keyFindings: ['Self-attention scales quadratically', 'Multi-head attention enables parallel processing'],
      confidenceScore: 0.87,
      limitations: 'Based on limited sample of papers',
      suggestedNextSteps: ['Review Flash Attention optimizations'],
    }) }],
    finishReason: { unified: 'stop' },
    usage: { inputTokens: { total: 300 }, outputTokens: { total: 150 } },
  }),
})

const result = await buildRunnable(code)(...args, mockModel, sink, { search: searchMock, fetch: fetchMock })
expect(result.output.title).toBe('Transformer Attention Mechanisms')
expect(result.output.confidenceScore).toBeGreaterThan(0.5)
```

---

## Links

- [Lesson 06: The Capstone Research Agent](../lessons/06-the-capstone-research-agent.md)
- [Recipe: Tools Injection Import Map](../recipes/recipe-tools-injection-import-map.md)
- [Lab 03: Extend the Schema](../labs/lab-03-extend-the-schema.md)
- [Back to Index](../index.md)
