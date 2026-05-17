# Error Log — Visual Agent Builder

Append-only record of errors encountered during this degree. Every entry captures the command or context that produced the error, the error message verbatim (or a path to it), the root cause once identified, and the fix that resolved it.

## Entry Format

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>

- **Command / context**:
- **Error message** (verbatim or path):
- **Root cause**:
- **Fix**:
- **Related decision / gotcha**:
```

## Entries

## 2026-05-17T00:14:30Z — esbuild build script blocked by pnpm

- **Command / context**: `pnpm install` in L1 source dir
- **Error message**: `Ignored build scripts: esbuild@0.21.5. Run "pnpm approve-builds"`
- **Root cause**: pnpm 10.x blocks build scripts by default. esbuild requires its postinstall script to download the native binary.
- **Fix**: Added `pnpm-workspace.yaml` with `onlyBuiltDependencies: [esbuild]`, then re-ran `pnpm install`.
- **Related decision / gotcha**: Not in research docs. pnpm 10.x security default. See decision-log.

## 2026-05-17T00:15:10Z — Blockly.inject crashes in happy-dom (FocusManager)

- **Command / context**: `pnpm test` — workspace-mount.test.tsx
- **Error message**: `TypeError: Cannot read properties of undefined (reading 'Symbol(listeners)')` at `addGlobalEventListener` in FocusManager
- **Root cause**: Blockly 12.5.1's `FocusManager` uses `addEventListener` on `window` via an internal `EventTarget` subclass. happy-dom's implementation is incompatible.
- **Fix**: Mocked `Blockly.inject` using `vi.mock` + `vi.hoisted` so workspace tests don't trigger Blockly's DOM-heavy init.
- **Related decision / gotcha**: Research doc noted jsdom incompatibility. Same applies to happy-dom. Decision: use mocked inject for unit tests; Playwright required for UI tests.

## 2026-05-17T00:15:40Z — vi.mock factory can't access outer variables

- **Command / context**: `pnpm test` — workspace-mount.test.tsx
- **Error message**: `ReferenceError: Cannot access 'mockInject' before initialization`
- **Root cause**: `vi.mock` is hoisted before variable declarations. The `mockInject` variable wasn't yet initialized when the factory ran.
- **Fix**: Used `vi.hoisted(() => { return { mockInject: vi.fn() } })` to declare variables that survive hoisting.
- **Related decision / gotcha**: Vitest docs cover this; pattern is `vi.hoisted`.

## 2026-05-17T00:26:00Z — L2: @ai-sdk/openai@3.0.75 does not exist

- **Command / context**: `pnpm install` in L2 source dir
- **Error message**: `ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @ai-sdk/openai@3.0.75. The latest release of @ai-sdk/openai is "3.0.64".`
- **Root cause**: The research file `version-and-current-api.md` specified `@ai-sdk/openai@3.0.75` but that version was never published. The research document may have been aspirational or contained a typo.
- **Fix**: Changed pin to `@ai-sdk/openai@3.0.64` (actual latest as of 2026-05-17).
- **Related decision / gotcha**: See `expectation-gap-log.md`.

## 2026-05-17T00:27:00Z — L2: ai_output_sink stub block missing VALUE input causes fixture load failure

- **Command / context**: `pnpm test` — RED phase
- **Error message**: `Error: The block "ai_output_sink" block (id="sink-1") is missing a(n) VALUE connection`
- **Root cause**: The RED-phase stub block definition for `ai_output_sink` had no VALUE input. Blockly's serializer is strict — if a fixture references an input that doesn't exist, it throws on load.
- **Fix**: This is expected during RED phase (infrastructure failure, not behavioral). The fix came in GREEN when the real block definition was implemented with the correct VALUE input.
- **Related decision / gotcha**: known-failure-modes.md item #9 ("Generator Not Defined for Custom Block"). Similar issue: the block must have the right inputs for fixture loading.

## 2026-05-17T00:29:00Z — L2: Vitest cannot dynamically import temp files via file:// URL

- **Command / context**: `pnpm test` — execute.test.ts after initial implementation
- **Error message**: `Error: Failed to load url /tmp/blockly-l2-test-xxx.mjs (resolved id: /tmp/...). Does the file exist?`
- **Root cause**: Vitest runs imports through Vite's module resolver. Files written to `/tmp` at runtime are outside the Vite project root and not in the module graph. Despite the `file://` URL, Vite returns "Does the file exist?" even when the file is on disk.
- **Fix**: Switched to `new Function` injection approach. See `decision-log.md` entry "Compile-execute strategy".
- **Related decision / gotcha**: Task description said "Vitest supports this fine" — it does NOT for files outside the project root. Added to `surprises.md`.

## 2026-05-17T00:27:30Z — L2: generate-text.ts missing closing brace in generateText opts object

- **Command / context**: `pnpm test` — codegen.test.ts after initial generator implementation
- **Error message**: Generated code had syntax error: `__sink?.('output', (await generateText({ model: ..., prompt: 'Hello')).text)` — missing `}` after `'Hello'`
- **Root cause**: The `opts` string in `generate-text.ts` was built as `{ model: ..., prompt: ...` without a closing `}`.
- **Fix**: Changed the string template to `{ model: ${modelCode}, prompt: ${promptCode} }` and `{ model: ..., system: ... }` with explicit closing braces.
- **Related decision / gotcha**: Classic string interpolation bug. The test for `await generateText(` caught it because the generated code would fail at runtime.

## 2026-05-17T00:15:50Z — vi.mock spread doesn't include Blockly.Blocks

- **Command / context**: `pnpm test` — workspace-mount.test.tsx
- **Error message**: `[vitest] No "Blocks" export is defined on the "blockly/core" mock.`
- **Root cause**: `Blockly.Blocks` is a runtime-mutated property, not a static named export. `{ ...actual }` spread doesn't capture it.
- **Fix**: Explicitly added `Blocks: actual.Blocks` to the mock return object.
- **Related decision / gotcha**: ESM module namespace objects are not plain JS objects. Runtime mutations aren't part of the static export list.
