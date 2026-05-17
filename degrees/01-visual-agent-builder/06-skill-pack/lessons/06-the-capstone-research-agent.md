# Lesson 06 — The Capstone Research Agent

**Prerequisite:** [Lesson 05 — Deploy to Vercel](05-deploy-to-vercel.md)
**Source:** L-capstone (research-agent) implementation notes + demo-script.md
**Achievement:** All block categories present, real provider tested, public deployment

---

## What the Capstone Does

The capstone is a research-and-summarize agent that:
1. Accepts a natural-language query.
2. Uses an `Agent` block (with stub `search` and `fetch` tools) to gather information.
3. Produces a structured `ResearchSummary` JSON object via a `GenerateObject` block.
4. Streams output through an `OutputSink` while the agent runs.

All of this is composed visually in the Blockly workspace — no code written by hand.

---

## Block Categories Used

The capstone uses all major block categories introduced in L1–L4:

| Category | Block(s) | Emits |
|---|---|---|
| Model | `ai_model` | `anthropic('claude-haiku-4-5')` |
| Prompt | `ai_prompt` | template string |
| Generate | `ai_generate_text` | `await generateText({...})` |
| Generate | `ai_generate_object` | `Output.object({...})` |
| Agent | `ai_agent` | `await generateText({ tools, stopWhen: stepCountIs(5) })` |
| Stream | `ai_stream_text` + `ai_stream_sink` | streaming loop |
| Tool | `ai_tool` + `ai_tool_return` + `ai_tool_call` | `tool({ inputSchema, execute })` |
| Tool wiring | `ai_use_tools` | `tools: { ... }` map |
| Schema | `ai_zod_object` + `ai_zod_field` | `z.object({ ... })` |
| Stop | `ai_stop_condition` | `stepCountIs(N)` |
| Output | `ai_output_sink` | `__sink?.('output', value)` |
| Control | `ai_for_each` | `for (const _item of arr) { ... }` |

This completeness was verified by the capstone implementation notes: "every L2–L4 category appears in the capstone demo program."

---

## The `__tools` Injection Pattern

The capstone introduces `ai_tool_call`, a new block that emits:

```ts
await __tools.<name>(<arg>)
```

The tool stubs live on the server, not in the workspace:

```ts
// lib/tools/search.ts
export async function searchStub(query: string) {
  return [
    { title: 'Blockly + AI', url: 'https://example.com/...', score: 0.91 },
  ]
}
```

The route handler injects the stubs:

```ts
// app/api/run/route.ts
export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson, {
    tools: {
      search: searchStub,
      fetch:  fetchStub,
    },
  })
}
```

The `run()` function signature was extended for the capstone:

```ts
export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
```

The `tools: __tools` field defaults to `undefined`, so L5 programs that never call `__tools.*` continue working without changes.

Source: `05-distillation/patterns/tools-injection-stub-or-real.md`

---

## The ResearchSummary Schema

```ts
const researchSummarySchema = z.object({
  title: z.string(),
  keyFindings: z.array(z.string()),
  confidenceScore: z.number(),
  relatedTopics: z.array(z.object({
    name: z.string(),
    relevance: z.string(),
  })),
  limitations: z.string(),
  suggestedNextSteps: z.array(z.string()),
})
```

All fields are required (no `.optional()`). The `ZodField` blocks' optional checkbox emits `.nullable()`, not `.optional()`, for OpenAI strict mode compatibility.

---

## The Full Run Signature

The canonical emitted module shape for the capstone:

```ts
import { generateText, streamText, tool, Output, stepCountIs } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  // ... user program composed from blocks ...
  __sink?.('output', JSON.stringify(result.output));
}
```

See [reference/run-signature.md](../reference/run-signature.md) for the full specification.

---

## Demo Script Walkthrough

The capstone comes with a `demo-script.md` (`03-pocs/L-capstone-research-agent/demo-script.md`) demonstrating:

1. **Load Demo** — click to load the pre-built research workspace from `public/demo-program.json`.
2. **Run** — streams structured JSON to the output pane.
3. **Swap Model** — change the Model block from `anthropic` to `openai` and run again.
4. **Extend Schema** — add a `tags` ZodField, run again, verify new field appears.
5. **Change Stop Condition** — reduce from `stepCountIs(5)` to `stepCountIs(3)`.

The demo program workspace JSON is at `03-pocs/L-capstone-research-agent/source/public/demo-program.json`.

---

## Test Coverage

The capstone has 43 passing tests:
- Codegen snapshot tests for every fixture
- Execute tests with multi-step mock models
- Route handler tests
- Tool stub tests
- Forbidden-name grep (full list including `maxSteps`, `parameters:`, `generateObject(`)
- Version-pin assertion

---

## Acceptance Criteria

A capstone deployment is complete when:
- The Blockly workspace loads and is interactive in a browser (no SSR errors).
- The "Research and Summarize" default program runs end-to-end with a real Anthropic key.
- `result.totalUsage.inputTokens` is below 20,000 per query (confirming `stopWhen: stepCountIs(5)` is effective).
- Three distinct test queries return schema-valid `ResearchSummary` objects.

---

## Extending the Capstone for Your Domain

The capstone pattern adapts to any domain:

1. Replace `searchStub` and `fetchStub` with real API clients (no changes to the workspace or blocks).
2. Replace the `ResearchSummary` schema with your domain schema (modify the ZodObject block arrangement).
3. Replace the Anthropic model with any provider the Model block supports.

The workspace JSON describes the structure; the stubs inject the data; the schema defines the output. None of these layers depend on each other.

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Previous Lesson: Deploy to Vercel](05-deploy-to-vercel.md)
- [TDD Discipline](00-tdd-discipline.md)
- [Recipe: Tools Injection Import Map](../recipes/recipe-tools-injection-import-map.md)
- [Reference: Run Signature](../reference/run-signature.md)
- [Reference: Block Catalog](../reference/block-catalog.md)
- [Example: Capstone Research Agent](../examples/example-06-capstone-research-agent.md)
- [Labs: Lab 02 Add a New Tool](../labs/lab-02-add-a-new-tool.md)
- [Labs: Lab 03 Extend the Schema](../labs/lab-03-extend-the-schema.md)
