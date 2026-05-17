# Lab 02 — Add a New Tool: currentTime

**Goal:** Add a `currentTime` tool to an existing Agent program and verify it is called correctly.

**Prerequisites:** [Lesson 03](../lessons/03-tools-and-structured-output.md), [Lesson 04](../lessons/04-multi-step-and-streaming.md)

**Time estimate:** 25–35 minutes

---

## Specification

Add a `currentTime` tool that:
- Has `inputSchema: z.object({ timezone: z.string() })`.
- Description: "Returns the current time in the specified timezone."
- Execute body: calls `await __tools.currentTime(input.timezone)`.
- Stub returns: `{ time: '2026-05-17T10:30:00Z', timezone: input.timezone }`.

---

## Steps

### Step 1 — Write the stub module

```ts
// lib/tools/currentTime.ts
export async function currentTimeStub(timezone: string) {
  return { time: '2026-05-17T10:30:00Z', timezone }
}
```

### Step 2 — Inject the stub in the route handler

In `app/api/run/route.ts`:

```ts
import { currentTimeStub } from 'lib/tools/currentTime'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson, {
    tools: {
      search:      searchStub,
      fetch:       fetchStub,
      currentTime: currentTimeStub,
    },
  })
}
```

### Step 3 — Build the workspace program

In the Blockly editor (or by creating a fixture JSON):
1. Add an `ai_tool` block with:
   - `NAME = 'currentTime'`
   - `DESCRIPTION = 'Returns the current time in the specified timezone.'`
   - `INPUT_SCHEMA`: a `ZodObject` with one field: `timezone: z.string()`
   - `BODY`: an `ai_tool_call` block calling `await __tools.currentTime(input.timezone)`, wrapped in `ai_tool_return`

2. Wire the tool into a `UseTools` block, connect to an `Agent` block.

### Step 4 — Write the test

```ts
import { MockLanguageModelV3, mockValues } from 'ai/test'

it('agent calls currentTime then summarizes', async () => {
  const currentTimeMock = vi.fn().mockResolvedValue({ time: '2026-05-17T10:30:00Z', timezone: 'UTC' })

  const mockModel = new MockLanguageModelV3({
    doGenerate: mockValues(
      {
        content: [{
          type: 'tool-call',
          toolName: 'currentTime',
          toolCallId: 'tc_1',
          input: JSON.stringify({ timezone: 'UTC' }),  // JSON string
        }],
        finishReason: { unified: 'tool-calls' },  // object
        usage: { inputTokens: { total: 20 }, outputTokens: { total: 5 } },
      },
      {
        content: [{ type: 'text', text: 'The current time in UTC is 10:30.' }],
        finishReason: { unified: 'stop' },
        usage: { inputTokens: { total: 80 }, outputTokens: { total: 20 } },
      }
    ),
  })

  const result = await buildRunnable(code)({
    model: mockModel,
    sink: vi.fn(),
    tools: { currentTime: currentTimeMock },
  })

  expect(currentTimeMock).toHaveBeenCalledWith('UTC')
  expect(mockModel.doGenerateCalls).toHaveLength(2)
})
```

### Step 5 — Regression

Add the fixture to the snapshot and forbidden-name grep. Confirm `inputSchema:` appears in the emitted code; confirm `parameters:` does not.

---

## Acceptance Criteria

- [ ] The stub module exists at `lib/tools/currentTime.ts`.
- [ ] The route handler injects `currentTime: currentTimeStub`.
- [ ] `workspaceToCode` emits `inputSchema: z.object({ timezone: z.string() })` (not `parameters:`).
- [ ] The mock test passes: `currentTimeMock` was called with `'UTC'`, model was called twice.
- [ ] The snapshot is committed.

---

## Hints

- The `ai_tool_call` block emits `await __tools.<name>(<arg>)`. The `NAME` field on the `ai_tool` block must match the key in the `__tools` object injected by the route handler.
- If `currentTimeMock` is never called, the tool-call `input` field in the mock is probably an object instead of a JSON string.

---

## Links

- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Recipe: Tools Injection Import Map](../recipes/recipe-tools-injection-import-map.md)
- [Troubleshooting: Tool Not Being Called](../troubleshooting/symptom-tool-not-being-called.md)
