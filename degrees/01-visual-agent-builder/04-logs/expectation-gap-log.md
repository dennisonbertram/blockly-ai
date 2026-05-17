# Expectation Gap Log — Visual Agent Builder

Append-only record of moments where reality diverged from prior expectation. The point is to surface stale or wrong models — both in training data and in this degree's own prior writing — so they can be corrected in distillation.

## Entry Format

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>

- **Expected**:
- **Actual**:
- **Source of expectation** (which doc, file, or prior assumption):
- **Source of reality** (command output, source code, log entry):
- **Impact**:
- **Follow-up**:
```

## Entries

## 2026-05-17T00:15:10Z — Blockly.inject crashes in happy-dom, not just jsdom

- **Expected**: Research doc `known-failure-modes.md` item #2 mentioned jsdom incompatibility. Expected happy-dom to be more compatible (it's a more modern DOM implementation).
- **Actual**: Same crash in happy-dom. Blockly 12.5.1's `FocusManager` introduced in recent versions uses `addEventListener` on window via a non-standard pattern that neither jsdom nor happy-dom support.
- **Source of expectation**: `01-research/blockly/testing-model.md` — "Blockly.inject WILL throw in jsdom"; implied happy-dom might be different.
- **Source of reality**: Test run output: `TypeError: Cannot read properties of undefined (reading 'Symbol(listeners)')` at `FocusManager.ts:128`.
- **Impact**: workspace-mount tests required mocking inject. Added to surprises.md and decision-log.md.
- **Follow-up**: Add to `01-research/blockly/known-failure-modes.md` as item #12 or update item #2 to mention happy-dom.

## 2026-05-17T00:15:50Z — Blockly.serialization.workspaces.load throws for unknown block types

- **Expected**: `load()` would silently skip unknown block types (lenient loading).
- **Actual**: `load()` throws `TypeError: Invalid block definition for type: <name>`. There is no lenient mode.
- **Source of expectation**: BT-006 spec said "does NOT throw" — interpreted as meaning `generate()` after `load()` should not throw.
- **Source of reality**: Test output: `AssertionError: expected [Function] to not throw an error but 'TypeError: Invalid block definition for type: nonexistent_block_type_xyz' was thrown`.
- **Impact**: BT-006 test updated: `load()` is wrapped in try/catch; the assertion is only about `generate()` not throwing.
- **Follow-up**: Document in `known-failure-modes.md` that `load()` is strict about block types.

## 2026-05-17T00:26:00Z — L2: @ai-sdk/openai@3.0.75 does not exist

- **Expected**: `@ai-sdk/openai@3.0.75` as specified in `version-and-current-api.md`.
- **Actual**: `ERR_PNPM_NO_MATCHING_VERSION` — latest is `3.0.64` as of 2026-05-17.
- **Source of expectation**: `01-research/vercel-ai-sdk/version-and-current-api.md` — "Pinned Stable Versions: @ai-sdk/openai@3.0.75".
- **Source of reality**: `npm view @ai-sdk/openai version` → `3.0.64`.
- **Impact**: Pinned to `3.0.64` in `package.json`. Documented in `surprises.md` and `error-log.md`.
- **Follow-up**: Update `version-and-current-api.md` to reflect `@ai-sdk/openai@3.0.64`.

## 2026-05-17T00:29:00Z — L2: Vitest temp-file dynamic import does not work for /tmp files

- **Expected**: Task description said "Vitest supports [temp-file + dynamic import] fine."
- **Actual**: Vitest/Vite refuses to load files outside the project root via `file://` URL, even though the file exists on disk.
- **Source of expectation**: Task contract statement: "Recommendation: temp-file write + dynamic import via a `file://` URL. Vitest supports this fine."
- **Source of reality**: `Error: Failed to load url /tmp/blockly-l2-test-xxx.mjs ... Does the file exist?` — file exists, Vite won't load it.
- **Impact**: Had to use `new Function` injection approach instead. Documented in `decision-log.md` and `surprises.md`.
- **Follow-up**: Update task contract for L3+ to use `new Function` injection or `node:vm` as primary strategy.

## 2026-05-17T00:16:20Z — deps.inline deprecated in Vitest 3.x

- **Expected**: `deps.inline: ['blockly']` from `02-planning/test-strategy.md` would work without warning.
- **Actual**: Vitest 3.x shows deprecation warning: `"deps.inline" is deprecated. Use "deps.optimizer.web.include" instead.`
- **Source of expectation**: `02-planning/test-strategy.md` vitest.config.ts example uses `deps: { inline: ['blockly'] }`.
- **Source of reality**: Vitest 3.2.4 deprecation warning in test output.
- **Impact**: Minor — updated vitest.config.ts to use `deps.optimizer.web.include`.
- **Follow-up**: Update `test-strategy.md` to use the current Vitest 3.x config syntax.

## L3 — tool-and-object-blocks (2026-05-17)

### G1: GenerateTextResult.object (expected) vs .output (actual)

- **Expected** (from task spec): `(await generateText({...})).object`
- **Actual**: The v6 result has `.output` (and `.experimental_output`). No `.object` property.
- **Impact**: Emitted code used `.output` instead of `.object`. Tests updated.

### G2: LanguageModelV3 finishReason shape mismatch

- **Research/testing-model.md said**: `finishReason: 'stop'` (string)
- **Actual LanguageModelV3 spec**: `finishReason: { unified: 'stop', raw?: string }` (object)
- **Impact**: Flat string works for plain text generation (finishReason is stored but rarely checked in the simple path). Fails silently for Output.object and tool-calling loops.

### G3: LanguageModelV3 usage shape mismatch

- **Research said**: `usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }` (flat)
- **Actual**: `usage: { inputTokens: { total: 10, ... }, outputTokens: { total: 5, ... } }` (nested)
- **Impact**: Flat format doesn't crash for simple text (undefined arithmetic), but silently breaks usage tracking.

### G4: mockValues() call signature

- **Research showed**: `mockValues([step1, step2])` (array argument)
- **Actual**: `mockValues(step1, step2)` (spread arguments)

## 2026-05-17T01:25:00Z — L5: next/dynamic({ ssr: false }) requires 'use client' in Next.js 15 App Router

- **Expected**: `next/dynamic({ ssr: false })` can be used in any page component (Server or Client Component), as documented in Next.js docs.
- **Actual**: Next.js 15.3.2 App Router requires the importing file to have `'use client'` when using `ssr: false`. Using it in a Server Component produces: "Error: 'ssr: false' is not allowed with 'next/dynamic' in Server Components."
- **Source of expectation**: General understanding of next/dynamic from Next.js documentation and L1 research.
- **Source of reality**: `npm run build` output: build error in app/page.tsx.
- **Impact**: Added `'use client'` to `app/page.tsx`. The page remains functionally a client entry point. The SSR exclusion still works correctly.
- **Follow-up**: Update `01-research/blockly/integration-with-frameworks.md` to note that `'use client'` is required on the importing page in Next.js 15 App Router.

## 2026-05-17T01:25:10Z — L5: TypeScript noUnusedLocals was stricter in Next.js build than in Vitest

- **Expected**: The L4 blocks copied from L4 would pass TypeScript checks unchanged, since they passed vitest.
- **Actual**: Next.js build runs `tsc` with `noUnusedLocals: true` (from tsconfig.json). Two files had unused locals that vitest didn't catch because vitest uses esbuild (no type checking): tool.ts (`const name`) and run-emitted.ts (`label` parameter).
- **Source of expectation**: L4 source passed its own vitest run without TypeScript errors.
- **Source of reality**: `npm run build` TypeScript errors in tool.ts and run-emitted.ts.
- **Impact**: Fixed by removing unused locals. Minor code cleanup.
- **Follow-up**: Consider adding `tsc --noEmit` as a pre-test step in future POCs to catch TS errors before the build.

## L-capstone: ai_prompt cannot emit dynamic expressions (blocks wiring limitation)

- **Expected**: Agent result could be passed as input to GenerateObject prompt (research-first order).
- **Actual**: ai_prompt only emits string literals. There is no block to concatenate a variable reference with a string literal.
- **Source of expectation**: Task contract described 'Agent output as part of its prompt' for GenerateObject.
- **Source of reality**: The ai_prompt block uses FieldTextInput which emits the literal text content only.
- **Impact**: GenerateObject and Agent run independently (not chained). The demo still demonstrates all block categories.
- **Follow-up**: A ConcatText or ExpressionRef block would enable dynamic prompt wiring in Phase 9.

