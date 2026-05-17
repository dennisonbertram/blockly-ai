# Gotcha: Blockly fires per-block events during programmatic workspace load

**Category:** gotcha — Blockly

## Symptom

When you call `Blockly.serialization.workspaces.load(state, workspace)`, any `BLOCK_CREATE` change listener (e.g., a live code-preview, a saver) fires *once per block* during the load, *before* the workspace has finished loading. If the listener calls `workspaceToCode`, it traverses a half-built tree and produces partial or invalid output. Performance is also terrible on large workspaces.

## Root cause

`workspaces.load` fires a `BLOCK_CREATE` event for every block it instantiates. Blockly's event bus does not natively know that "a programmatic bulk load is in progress" — the consumer must signal it.

## Fix — always disable events around bulk loads

```ts
Blockly.Events.disable();
Blockly.serialization.workspaces.load(state, workspace);
Blockly.Events.enable();
```

Listeners that need the full picture can also gate on `e.type === Blockly.Events.FINISHED_LOADING` and `isUiEvent`. Both this team's POCs and the official `sample-app-ts` example wrap programmatic loads this way.

## Evidence

- `01-research/blockly/known-failure-modes.md` lines 46-61 (item 3): the failure, the fix, and the citation to `google/blockly-samples/examples/sample-app-ts/src/serialization.ts`.
- `01-research/known-failure-modes.md` line 9: synthesis "Events fire during programmatic load … Fix: wrap loads with `Blockly.Events.disable() / enable()`."
- `02-planning/test-strategy.md` lines 65-66: "Always wrap programmatic workspace loads in `Blockly.Events.disable() / Blockly.Events.enable()`."
- Used by every codegen test in the repo, e.g. `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 71-75, 78-82, etc. — the pattern is repeated 5× in that file alone.
