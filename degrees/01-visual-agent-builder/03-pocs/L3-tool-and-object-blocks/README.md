# L3 — tool-and-object-blocks

POC 3 of the Visual Agent Builder degree. Validates the v6 tool-calling API (inputSchema:, not parameters:), structured output via `Output.object({ schema })` (not deprecated `generateObject()`), and Zod schema visual composition.

## What this is

Five new Blockly blocks:
- `ai_tool` + `ai_tool_return` — define an AI tool with a name, description, Zod schema, and execute body
- `ai_zod_object` + `ai_zod_field` — compose Zod object schemas visually
- `ai_use_tools` — wire up to 3 tool definitions into a tools map
- `ai_generate_object` — call `generateText({ output: Output.object({ schema }) })` and return the typed object

Extended blocks:
- `ai_generate_text` — extended with optional TOOLS value input (wires UseTools block; emits `tools:`, `toolChoice: 'auto'`, `stopWhen: stepCountIs(5)`)

## How to run

```bash
cd source
npm install
npm run dev       # starts Vite dev server
npm test          # run all tests
```

## Tests

| File | Tests | Purpose |
|---|---|---|
| `test/codegen.test.ts` | 9 | Behavioral + snapshot tests for all 4 fixtures |
| `test/execute.test.ts` | 2 | Integration: compile + run with MockLanguageModelV3 |
| `test/regression.test.ts` | 17 | Snapshots + version pins + v6 API surface guards |

## Key design decisions

- **inputSchema: (not parameters:)** — v6 tool API. Enforced by forbidden-name grep.
- **Output.object({ schema }) via generateText** — not deprecated `generateObject()`. Enforced by forbidden-name grep.
- **.nullable() (not .optional())** — OpenAI strict mode compatibility.
- **toolChoice: 'auto' emitted when tools wired** — most useful default; makes generated code self-documenting.
- **ToolReturn companion block** — enables complex execute bodies with any expression block as return value.
- **Fixed N=3 UseTools inputs** — simple starting point; mutator pattern is an L4 enhancement.

## Risk validated

**v6 tool-calling surface**: `inputSchema:` is the correct v6 field (not `parameters:`). `tool()` from `ai` is a TypeScript type-helper. Tested via MockLanguageModelV3 integration.

**v6 structured output surface**: `Output.object({ schema })` passed to `generateText`. Access `.output` on result (not `.object` — a surprise from the SDK). Tested via MockLanguageModelV3 with V3 finishReason and usage shapes.

## Surprises

See `surprises.md` for: `.output` vs `.object` naming, V3 finishReason/usage shapes, `mockValues` spread vs array, and `new Function` happy-dom issue.
