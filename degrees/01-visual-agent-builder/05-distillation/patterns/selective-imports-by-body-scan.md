# Pattern: Selective imports by body-substring scan

**Category:** pattern — codegen hygiene / bundle size

## Problem it solves

Naive emitters write one big import at the top: `import { generateText, streamText, tool, Output, stepCountIs, hasToolCall, convertToModelMessages } from 'ai'`. This works, but:

- Every Tool the user never used appears in imports.
- Tree-shakers vary in their willingness to drop unused named imports.
- Diffs in committed fixtures churn whenever the union of "all possible names" grows in a new POC.

## The pattern

`buildImportHeader(body)` inspects the *generated body string* and emits only what's needed:

```ts
function buildImportHeader(body: string): string {
  const aiNames = ['generateText',
    ...(body.includes('streamText(')   ? ['streamText']   : []),
    ...(body.includes('tool({')        ? ['tool']         : []),
    ...(body.includes('Output.object(')? ['Output']       : []),
    ...(body.includes('stepCountIs(')  ? ['stepCountIs']  : []),
    ...(body.includes('hasToolCall(')  ? ['hasToolCall']  : []),
  ]
  const lines = [`import { ${aiNames.join(', ')} } from 'ai';`]
  if (body.includes('anthropic(')) lines.push(`import { anthropic } from '@ai-sdk/anthropic';`)
  if (body.includes('openai('))    lines.push(`import { openai }    from '@ai-sdk/openai';`)
  if (body.includes('z.'))         lines.push(`import { z }         from 'zod';`)
  return lines.join('\n')
}
```

Regression tests lock the absence of unused imports (e.g., "stream-only fixture must NOT import `generateText`").

## Why this earns its weight

The L4 regression test `RT-L4-005` makes this enforceable: when the emitter "helpfully" adds an import that the program does not use, a snapshot or grep test fails:

```
Expected "streamText" in imports for stream-text-basic fixture
Found spurious "generateText" import in stream-only fixture — bundle size regression
```

This makes the emitter a partial dead-code eliminator at codegen time, which sidesteps bundler differences across Vite / Webpack / Turbopack (R8).

## Trade-offs

- Body-string scan is a substring heuristic, not an AST walk. Comments could falsely trigger inclusion. The codegen does not emit comments, so this is academic.
- New v6 APIs need a new clause in the scan — that addition is part of the playbook for "adding a new AI SDK call type" (see playbooks).

## Evidence

- `03-pocs/L2-single-generate-text-block/source/src/codegen/async-generator.ts` lines 39-48: the original `buildImportHeader` checking for `anthropic(` / `openai(`.
- `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 26-34: "Import Header Building (async-generator.ts) — Extended from L2 to detect `tool({`, `Output.object(`, `stepCountIs(`, `z.`."
- `03-pocs/L4-multi-step-agent-and-stream/implementation-notes.md` lines 22-30: extended again for `streamText(` and `hasToolCall(`. "Key invariant: `streamText` and `generateText` are mutually exclusive in most programs … The builder adds only what's needed."
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 185-231 (RT-L4-005): the regression that pins selective-import behavior with positive and negative assertions for both fixtures.

## Related

- [`patterns/async-codegen-via-post-processor.md`](async-codegen-via-post-processor.md)
- [`playbooks/adding-a-new-ai-sdk-call-type.md`](../playbooks/adding-a-new-ai-sdk-call-type.md)
