# Recipe: Tools Injection via `__tools` Import Map

**Use when:** A Blockly Tool block needs to call a side-effecting function (search, fetch, database) without embedding the implementation in the workspace JSON.

---

## Problem

A tool's execute body must call *something* at runtime. Two bad options: (1) hard-code the implementation in the emitted code — locks data into the fixture and gives emitted code arbitrary network access; (2) skip tools in the visual builder entirely — defeats the purpose.

## Solution

Each tool body uses an `ai_tool_call` block that emits `await __tools.<name>(<arg>)`. The executor injects `tools: { <name>: stubFn }` into `run({ model, sink, tools })`. Stubs are pure TypeScript modules owned by the server.

### What the Tool block emits

```ts
tool({
  description: 'Search the web for current information',
  inputSchema: z.object({ query: z.string() }),
  execute: async (input) => {
    return await __tools.search(input.query)
  },
})
```

### The stub module (server-side)

```ts
// lib/tools/search.ts
export async function searchStub(query: string) {
  return [
    { title: 'Result 1', url: 'https://example.com/1' },
    { title: 'Result 2', url: 'https://example.com/2' },
  ]
}
```

### The route handler (wires them together)

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
import { searchStub } from 'lib/tools/search'
import { fetchStub }  from 'lib/tools/fetch'
import { runEmitted } from 'lib/execute/run-emitted'

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

### How the executor threads `__tools` in

`runEmitted` passes the `tools` map as the `__tools` positional argument to `new Function`:

```ts
// lib/execute/run-emitted.ts (simplified)
const fn = new Function(
  'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __model, __sink, __tools',
  strippedBody + '\nreturn run({ model: __model, sink: __sink, tools: __tools });'
)
await fn(generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, modelFactory, sinkCallback, tools)
```

### In tests

```ts
const currentTimeMock = vi.fn().mockResolvedValue({ time: '2026-05-17T10:30:00Z', timezone: 'UTC' })

const result = await buildRunnable(code)({
  model: mockModel,
  sink: vi.fn(),
  tools: { currentTime: currentTimeMock },
})

expect(currentTimeMock).toHaveBeenCalledWith('UTC')
```

---

## Rules

- The `tools` key in `run({...})` defaults to `undefined` — programs without tools keep working.
- The name in `__tools.<name>` must match the key in the injected `tools` object exactly.
- The `ai_tool_call` block emits `await __tools.<toolName>(<arg>)` — the tool name is the `NAME` field on the `ai_tool` block.

---

## Links

- [Lesson 06: The Capstone Research Agent](../lessons/06-the-capstone-research-agent.md)
- [Lab 02: Add a New Tool](../labs/lab-02-add-a-new-tool.md)
- [Recipe: Server-Side Execution Route Handler](recipe-server-side-execution-route-handler.md)
- [Troubleshooting: Tool Not Being Called](../troubleshooting/symptom-tool-not-being-called.md)
- [Back to Index](../index.md)
