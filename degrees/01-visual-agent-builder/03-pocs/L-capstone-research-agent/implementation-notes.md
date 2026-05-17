# Implementation Notes — L-capstone research-and-summarize agent

## Architecture

L-capstone extends L5 (Next.js app) by adding:
1. Stubbed tool implementations (`lib/tools/search.ts`, `lib/tools/fetch.ts`)
2. `__tools` injection in the emitted code run signature
3. `ai_tool_call` block for emitting `await __tools.<name>(<arg>)` from tool bodies
4. "Load Demo" button in `WorkspacePage.tsx`
5. `public/demo-program.json` — the canonical capstone workspace JSON
6. Full test suite (43 tests) covering stubs, codegen, e2e, and regression

## Key Design Decisions

### __tools Injection (vs inline emit)

Decision: `__tools` injection pattern.

The executor (`run-emitted.ts`) injects `{ search: searchStub, fetch: fetchStub }` as the
`tools` parameter when calling `run()`. Inside emitted code, tool bodies can call
`await __tools.search(input.query)` via the `ai_tool_call` block.

Alternative considered: inline emit (hardcode `return [{ title: 'Blockly + AI', ... }]` directly
in the tool body). This was rejected because:
- Inline data would be locked in the workspace fixture — not reusable.
- The injection pattern lets the executor swap stubs for real implementations without
  changing the emitted code.
- Cleaner separation of concerns (block = structure, executor = data).

Documented in `04-logs/decision-log.md`.

### Agent → GenerateObject Wiring

The workspace executes top-to-bottom. The `summary` OutputSink (GenerateObject) comes first,
followed by the `agent_result` OutputSink (Agent). This means:
- The GenerateObject call runs first, producing the structured summary.
- The Agent call runs second, doing the multi-step research loop.

In a production system, you would reverse this (research first, then summarize). The current
order is intentional for the demo: the structured output appears at the top of the stream.

To produce agent-first output, connect the agent result as the GenerateObject prompt input.
The `ai_prompt` block currently doesn't support dynamic expressions — a future `ConcatText`
or `ExpressionBlock` would enable this wiring. Documented as a known limitation.

### run() Signature Extension

The `async-generator.ts` `RUN_SIGNATURE` was updated from:
```ts
export default async function run({ model: __model_provider, sink: __sink } = {}) {
```
to:
```ts
export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
```

This is backward-compatible: L5 programs that don't use `__tools` simply ignore it (it will
be `undefined`, which is fine because no tool body calls `__tools.*` in those programs).

### ai_tool_call Block

New block for the capstone. Emits `await __tools.<name>(<arg>)`. Fields:
- `TOOL_NAME` — the function name on `__tools` (e.g. `search`, `fetch`)
- `ARG_FIELD` — raw JS expression passed as the argument (e.g. `input.query`, `input.url`)

This is an expression block used inside `ai_tool_return`'s VALUE input. It returns `[code, Order.AWAIT]`.

### Snapshot Updates

The `async-generator.ts` run signature change broke L5 snapshot tests. Snapshots were
updated (`vitest run -u`) since the change is intentional and backward-compatible.
The new snapshots are committed as part of the green commit.

## Block Categories Used (Capstone Completeness Check)

| Category | Block | Present in demo-program.json |
|---|---|---|
| Model | ai_model | YES (x2: agent + generateObject) |
| Prompt | ai_prompt | YES (x2: agent prompt + generateObject prompt) |
| Tool | ai_tool, ai_tool_return, ai_tool_call | YES (search + fetch) |
| Tool Wiring | ai_use_tools | YES |
| Schema | ai_zod_object, ai_zod_field | YES (x3 schemas: search, fetch, output) |
| Agent | ai_agent | YES |
| StopCondition | ai_stop_condition | YES (stepCountIs(5)) |
| Structured Output | ai_generate_object | YES |
| Output | ai_output_sink | YES (x2) |

All L2-L4 block categories are represented.

## Version Pins (same as L5)

| Package | Version |
|---------|---------|
| blockly | 12.5.1 (exact) |
| ai | 6.0.184 (exact) |
| @ai-sdk/anthropic | 3.0.78 (exact) |
| @ai-sdk/openai | 3.0.64 (exact) |
| next | 15.3.2 |

next@15.3.2 is used (same as L5). No patched version bump was needed.
