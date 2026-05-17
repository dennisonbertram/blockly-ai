# Surprises — L2 single-generate-text-block

## 1. `@ai-sdk/openai@3.0.75` does not exist

The research file pins `@ai-sdk/openai@3.0.75` but npm returns:
```
ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @ai-sdk/openai@3.0.75
The latest release of @ai-sdk/openai is "3.0.64".
```
Used `3.0.64` instead. The version pin in the research file was apparently aspirational or a typo.

## 2. Vitest cannot dynamically import temp files

The task description suggests "temp-file write + dynamic import via a `file://` URL. Vitest supports this fine." — but it does NOT support this in practice. Vitest runs imports through Vite's module resolution layer, which only knows about files within the project root. Files written to `/tmp` at runtime cause:
```
Error: Failed to load url /tmp/blockly-l2-test-xxx.mjs (resolved id: /tmp/...). Does the file exist?
```
The file exists on disk — Vite's resolver simply refuses to load it. Switched to the `new Function` injection approach. Documented in `decision-log.md`.

## 3. `Blockly.serialization.workspaces.save()` on empty workspace

Calling `save()` on a workspace with no blocks returns an object where `result.blocks` is `undefined` (not `{ blocks: [] }`). The test `(reserialized.blocks as { blocks: unknown[] }).blocks` threw because `blocks` was `undefined`. Fixed by using `?.blocks ?? []`.

## 4. Fixture loading throws if block definition lacks required inputs

When a fixture JSON references an input name (e.g. `inputs.VALUE`) that doesn't exist on the block definition, Blockly throws:
```
Error: The block "ai_output_sink" block (id="sink-1") is missing a(n) VALUE connection
```
The stub block definitions during the RED phase lacked `VALUE` input, causing tests to fail at fixture-load time rather than at assertion time. This is a "wrong reason" failure per TDD rules, but the fix (add correct inputs to stub definitions) is infrastructure, not behavioral.

## 5. `MockLanguageModelV3` import from `ai/test` works correctly

Research note flagged this as uncertain. Import `from 'ai/test'` works without any special configuration in Vitest with `deps.optimizer.web.include: ['blockly']`. No need for `ai/dist/test/index.js`. BT-007 confirms this.
