# Playbook: Wire a new tool into an Agent program (block + `__tools` injection + test)

**Category:** playbook

## When to use

You want the visual builder to expose a new callable side-effect — `search`, `fetch`, `read_file`, a database query, anything that an Agent can invoke as a tool.

## Pre-flight

- The [`__tools` injection pattern](../patterns/tools-injection-stub-or-real.md) is in place — `run({ model, sink, tools: __tools })` is the signature.
- The `ai_tool` and `ai_tool_return` blocks (L3) are available.
- The `ai_tool_call` block (capstone) exists, emitting `await __tools.<name>(<arg>)`.

## Steps

### 1. Write the stub module — pure TypeScript, no external deps where possible

```ts
// lib/tools/myTool.ts
export async function myToolStub(arg: string): Promise<MyToolResult> {
  // Canned data first — real implementation later
  return [
    { title: 'Stub result', url: 'https://example.com', score: 0.91 },
  ]
}
```

For tests, this becomes a `vi.fn()` injected into `__tools`. For production, the stub points at the real implementation.

### 2. Compose the visual tool definition

In the workspace, add an `ai_tool` block with:

- `NAME` — `myTool` (must match the property on `__tools` you injected)
- `DESCRIPTION` — the LLM-readable, action-oriented description ("Search the X database for entries matching a query. Returns up to N items with title, url, and score."). Vague descriptions are the #1 reason a model won't call your tool. See `01-research/vercel-ai-sdk/known-failure-modes.md` item 3.
- `SCHEMA` — wire an `ai_zod_object` block that defines the input shape. Use `.nullable()` (not `.optional()`) for optional fields. See [`anti-patterns/optional-vs-nullable-zod-openai-strict.md`](../anti-patterns/optional-vs-nullable-zod-openai-strict.md).
- `BODY` — a stack of statements ending in an `ai_tool_return` block. Inside the return value, place an `ai_tool_call` block configured with `TOOL_NAME = 'myTool'` and `ARG_FIELD = 'input.query'` (or whatever your Zod schema names the arg).

### 3. Wire the tool into an Agent via `UseTools`

Connect the `ai_tool` output into one of the slots on an `ai_use_tools` block (max 3 in L3/L4). Connect the `UseTools` into the Agent's `TOOLS` input. The codegen will emit:

```ts
const agentResult = (await generateText({
  model: anthropic('claude-haiku-4-5'),
  prompt: '...',
  tools: { myTool: tool({ description: '...', inputSchema: z.object({...}), execute: async (input) => { return await __tools.myTool(input.query) } }) },
  toolChoice: 'auto',
  stopWhen: stepCountIs(5),
})).text
```

### 4. Inject `myTool` in the executor

```ts
// app/api/run/route.ts
import { myToolStub } from 'lib/tools/myTool'
import { runEmitted } from 'lib/execute/run-emitted'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson, {
    tools: {
      search: searchStub,
      fetch:  fetchStub,
      myTool: myToolStub,
    },
  })
}
```

### 5. Write the test — mock the model AND assert the tool was called

```ts
// test/execute.test.ts
import { MockLanguageModelV3, mockValues } from 'ai/test'

it('agent calls myTool then summarizes', async () => {
  const myToolMock = vi.fn().mockResolvedValue([{ title: '...', url: '...' }])
  const mockModel = new MockLanguageModelV3({
    doGenerate: mockValues(
      // step 1 — model picks myTool
      {
        content: [{
          type: 'tool-call',
          toolName: 'myTool',
          toolCallId: 'tc_1',
          input: JSON.stringify({ query: 'agents' }),     // JSON STRING, not object
        }],
        finishReason: { unified: 'tool-calls' },         // OBJECT, not 'tool-calls'
        usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
      },
      // step 2 — model summarizes
      {
        content: [{ type: 'text', text: 'Found 1 result.' }],
        finishReason: { unified: 'stop' },
        usage: { inputTokens: { total: 50 }, outputTokens: { total: 20 } },
      },
    ),
  })

  const code = generate(workspace)
  const result = await buildRunnable(code)({ model: mockModel, sink: vi.fn(), tools: { myTool: myToolMock } })

  expect(myToolMock).toHaveBeenCalledWith('agents')
  expect(mockModel.doGenerateCalls).toHaveLength(2)
  expect(result).toContain('Found 1 result.')
})
```

### 6. Regression test the emitted code

- Snapshot the workspace → emitted code.
- Add `'myTool'` and `__tools.myTool(` positively to the snapshot.
- The forbidden-name grep should still pass (no v3/v4 names introduced).

## Evidence

- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 17-30 (decision `__tools` injection vs inline-emit) — captures step 4 architecture.
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 60-67 (`ai_tool_call` block emission) — captures step 2 inner-body wiring.
- `04-logs/decision-log.md` lines 86-89 (L3 ToolReturn decision): "Companion `ai_tool_return` statement block compiles to `return <value>;` inside the tool's `execute` body" — step 2 BODY shape.
- `04-logs/decision-log.md` lines 110-117 (L3 toolChoice default): "When a `UseTools` block is connected to `GenerateText`, emit `toolChoice: 'auto'` in the `generateText` call."
- `01-research/vercel-ai-sdk/known-failure-modes.md` lines 42-56 (item 3): the "Tool Description Too Vague" gotcha — informs step 2 DESCRIPTION advice.

## Related

- [`patterns/tools-injection-stub-or-real.md`](../patterns/tools-injection-stub-or-real.md)
- [`gotchas/mock-language-model-v3-stream-shape.md`](../gotchas/mock-language-model-v3-stream-shape.md)
- [`anti-patterns/optional-vs-nullable-zod-openai-strict.md`](../anti-patterns/optional-vs-nullable-zod-openai-strict.md)
