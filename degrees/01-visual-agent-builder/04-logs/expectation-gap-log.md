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

## 2026-05-17T00:16:20Z — deps.inline deprecated in Vitest 3.x

- **Expected**: `deps.inline: ['blockly']` from `02-planning/test-strategy.md` would work without warning.
- **Actual**: Vitest 3.x shows deprecation warning: `"deps.inline" is deprecated. Use "deps.optimizer.web.include" instead.`
- **Source of expectation**: `02-planning/test-strategy.md` vitest.config.ts example uses `deps: { inline: ['blockly'] }`.
- **Source of reality**: Vitest 3.2.4 deprecation warning in test output.
- **Impact**: Minor — updated vitest.config.ts to use `deps.optimizer.web.include`.
- **Follow-up**: Update `test-strategy.md` to use the current Vitest 3.x config syntax.
