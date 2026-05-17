# Pattern: AsyncJavascriptGenerator via post-processor (`generateAsyncModule(workspace)`)

**Category:** pattern — Blockly codegen for async/await

## Problem it solves

Blockly's `javascriptGenerator` is a singleton that emits synchronous ES5-style code. The Vercel AI SDK *requires* `await`. There is no official Blockly pattern for async codegen.

The conventional advice ("subclass `JavascriptGenerator` and override `finish()`") looks clean in pseudocode but fails on contact: `javascriptGenerator` is exported as a *singleton instance*, not a class. The class is reachable only as `Object.getPrototypeOf(javascriptGenerator).constructor`, which TypeScript types as `Function` — you lose every per-block-type generator registration and every method's type. Subclassing-by-prototype-introspection is fragile and untyped.

## The pattern — a post-processor function

Keep using the singleton `javascriptGenerator`. Wrap its output in a separate function:

```ts
// codegen/async-generator.ts
import { javascriptGenerator } from 'blockly/javascript'
import type { Workspace } from 'blockly/core'

const RUN_SIGNATURE =
  `export default async function run({ model: __model_provider, sink: __sink } = {}) {`

function buildImportHeader(body: string): string {
  const needsAnthropic   = body.includes('anthropic(')
  const needsOpenai      = body.includes('openai(')
  const needsStepCountIs = body.includes('stepCountIs(')
  const needsTool        = body.includes('tool({')
  const needsOutput      = body.includes('Output.object(')
  // ... etc.
  const aiNames = ['generateText',
    ...(body.includes('streamText(')  ? ['streamText']  : []),
    ...(needsTool                      ? ['tool']        : []),
    ...(needsOutput                    ? ['Output']      : []),
    ...(needsStepCountIs               ? ['stepCountIs'] : []),
    ...(body.includes('hasToolCall(')  ? ['hasToolCall'] : []),
  ]
  const lines = [`import { ${aiNames.join(', ')} } from 'ai';`]
  if (needsAnthropic) lines.push(`import { anthropic } from '@ai-sdk/anthropic';`)
  if (needsOpenai)    lines.push(`import { openai }    from '@ai-sdk/openai';`)
  if (body.includes('z.'))
    lines.push(`import { z } from 'zod';`)
  return lines.join('\n')
}

export function generateAsyncModule(workspace: Workspace): string {
  const body = javascriptGenerator.workspaceToCode(workspace)
  const header = buildImportHeader(body)
  const indented = body.split('\n').map(l => l.trim() === '' ? '' : '  ' + l).join('\n').trimEnd()
  return [header, '', RUN_SIGNATURE, indented, '}', ''].join('\n')
}
```

This is semantically a `finish()` override — it intercepts `workspaceToCode` and wraps it — but implemented as a plain top-level function rather than fragile constructor introspection.

## Trade-offs

- Callers use `generateAsyncModule(workspace)` instead of `asyncGenerator.workspaceToCode(workspace)`. Slightly more explicit, slightly less Blockly-idiomatic.
- The post-processor only sees the final body string, not the AST; "needs" detection is body-substring-based (see [Pattern: Selective imports by body scan](selective-imports-by-body-scan.md)).
- Refactor to a real subclass is straightforward later if a Blockly version exposes the class cleanly.

## Evidence

- `03-pocs/L2-single-generate-text-block/source/src/codegen/async-generator.ts` lines 1-86 (the file itself) — the canonical implementation.
- `03-pocs/L2-single-generate-text-block/implementation-notes.md` lines 3-15: full rationale, including why subclassing was rejected.
- `04-logs/decision-log.md` lines 47-54: decision entry "L2: Async codegen approach: post-process vs. subclass `finish()`" — alternatives, rationale, trade-offs.
- `02-planning/risk-register.md` lines 26-39 (R2): R2 "Async Codegen Pattern in Blockly Proves Fragile" was a Likelihood:Medium / Impact:High risk explicitly resolved at L2 as a go/no-go gate.
- `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 26-34 ("Import Header Building"): the body-scan import detection was extended at L3 with `tool({`, `Output.object(`, `stepCountIs(`, and `z.` cues.
- `03-pocs/L4-multi-step-agent-and-stream/implementation-notes.md` lines 22-30: extended again for `streamText(` and `hasToolCall(`. The pattern survived four POCs unchanged.
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 46-58: capstone extended the `RUN_SIGNATURE` to include `tools: __tools` — proving the pattern was extensible.

## Related

- [`patterns/selective-imports-by-body-scan.md`](selective-imports-by-body-scan.md)
- [`patterns/server-side-execution-via-import-map.md`](server-side-execution-via-import-map.md)
