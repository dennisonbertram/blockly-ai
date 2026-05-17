# Implementation Notes — L3 tool-and-object-blocks

## ZodField/ZodObject Code Generation Pattern

ZodField is a statement block (stackable). ZodObject uses `generator.statementToCode('FIELDS')` to traverse the chain. Each ZodField emits one line: `fieldName: z.string(),\n`. ZodObject splits the result by newline, trims, strips trailing commas, and joins with `, `.

This is simpler than a custom collector or side-channel store because Blockly's `statementToCode` already handles chain traversal and concatenation.

## Tool Body Code Generation

The `ai_tool` generator calls `generator.statementToCode('BODY')` to get the execute body. The body is indented with 4 spaces. The `ai_tool_return` generator emits `return <value>;`. The full tool definition is assembled as a multi-line string returned with `Order.FUNCTION_CALL`.

## UseTools Name Extraction

The `ai_use_tools` generator reads the NAME field directly from connected `ai_tool` blocks: `connectedBlock.getFieldValue('NAME')`. This avoids needing to parse the generated code string to extract the name. If the connected block is not an `ai_tool`, the slot index is used as fallback (`tool0`, `tool1`, `tool2`).

## GenerateText Extension for TOOLS

The L3 version of `ai_generate_text` adds a `TOOLS` value input. If connected, the generator emits:
- `tools: <tools_map_code>`
- `toolChoice: 'auto'`
- `stopWhen: stepCountIs(5)`

The `stepCountIs` import is added to the `ai` import line when `stepCountIs(` appears in the body (handled by `buildImportHeader` in `async-generator.ts`).

## Import Header Building (async-generator.ts)

Extended from L2 to detect:
- `tool({` → adds `tool` to `ai` imports
- `Output.object(` → adds `Output` to `ai` imports
- `stepCountIs(` → adds `stepCountIs` to `ai` imports
- `z.object(`, `z.string()`, etc. → adds `import { z } from 'zod'`

All imports are combined into one `import { ... } from 'ai'` line.

## Test Execution Strategy (Extended from L2)

The `buildRunnable()` function in `execute.test.ts` is extended to inject:
- `generateText, tool, Output, z, stepCountIs` from `ai`/`zod`
- `anthropic, openai` from provider packages

The two-argument `new Function('a, b, c, ...', body)` form is used (comma-separated params as one string) to avoid happy-dom's multi-argument `Function` constructor issue.

## MockLanguageModelV3 V3 Format (discovered via surprises)

The correct format for `doGenerate` return values in `MockLanguageModelV3` for v6 is:
- `finishReason: { unified: 'stop' | 'tool-calls' | ... }` (object, not string)
- `usage: { inputTokens: { total: N, noCache, cacheRead, cacheWrite }, outputTokens: { total: N, text, reasoning } }` (nested, not flat)

The flat format works for simple `generateText` calls but silently fails for `Output.object` (output parsing requires `lastStep.finishReason === 'stop'`) and for tool calling (step detection requires `result.finishReason.unified === 'tool-calls'`).

## UseTools Limitation: Fixed N=3 Inputs

`ai_use_tools` has exactly 3 value inputs (`TOOL_0`, `TOOL_1`, `TOOL_2`). Unconnected inputs are skipped. For more than 3 tools, a mutator pattern (Blockly's way of dynamic inputs) would be needed. This is out of scope for L3 and documented as a known limitation.
