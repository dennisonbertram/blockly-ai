# L2 — single-generate-text-block

POC 2 of the Visual Agent Builder degree. Validates the async codegen wrapper pattern (R2): custom Blockly blocks that emit Vercel AI SDK v6 `generateText` code, wrapped in an async ES module with correct imports. No real LLM calls in CI.

## What this is

- Four custom Blockly blocks: `ai_model`, `ai_prompt`, `ai_generate_text`, `ai_output_sink`
- An async code generator (`src/codegen/async-generator.ts`) that wraps generated block code in `export default async function run({ model: __model_provider, sink: __sink } = {}) { ... }` with dynamic import selection
- Integration tests that execute the emitted code with `MockLanguageModelV3` and assert the `__sink` callback receives the correct response

## How to run

```bash
cd source
pnpm install
pnpm dev        # starts Vite dev server
pnpm test       # run all tests
```

## Tests

| File | Tests | Purpose |
|---|---|---|
| `test/block-defs.test.ts` | 6 | Block registration sanity |
| `test/codegen.test.ts` | 5 | Codegen golden-output |
| `test/execute.test.ts` | 3 | Execute with MockLanguageModelV3 |
| `test/workspace-mount.test.tsx` | 3 | React Strict Mode guard |
| `test/regression.test.ts` | 13 | Snapshot lock + version pin + round-trip |

## Key design decisions

- **Post-process approach for async wrapper**: `generateAsyncModule()` calls `javascriptGenerator.workspaceToCode()` then post-processes the body — semantically equivalent to `finish()` override but avoids fragile singleton constructor introspection.
- **`new Function` injection for test execution**: ES module syntax stripped; `generateText`, `anthropic`, `openai` injected as parameters. Temp-file dynamic import fails in Vitest (Vite won't resolve files outside project root).
- **`__sink?.()` optional chaining**: `run({ model })` without sink is safe — no TypeError.
- **`@ai-sdk/openai` pinned to `3.0.64`**: research doc says `3.0.75` but that version doesn't exist on npm.

## Risk validated

**R2 (Async codegen)**: The async IIFE/wrapper pattern is proven. Generated code is valid ES module syntax with correct `await` usage inside an `async function`. `MockLanguageModelV3` integration confirms the emitted code actually runs.
