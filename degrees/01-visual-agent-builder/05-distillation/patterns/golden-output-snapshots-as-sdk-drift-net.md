# Pattern: Golden-output snapshot tests as the SDK-drift safety net

**Category:** pattern — the single biggest lesson of this degree

## Problem it solves

The Vercel AI SDK has renamed nearly every load-bearing identifier across v3 → v4 → v5 → v6 (see [the renames gotcha](../gotchas/ai-sdk-v6-api-renames.md)). LLM-driven implementers default to the v3/v4 names from their training data. Routine `npm update` can break runtime semantics without breaking compilation. Code reviewers cannot eyeball every emitted string for `parameters:` vs `inputSchema:`.

A test must therefore lock the *exact* string that the codegen emits for a known workspace state. When the string changes, a human must approve the diff — exactly the moment to ask "is this an intentional change or did the SDK drift?"

## The pattern

For every meaningful block (or block combination), commit:

1. A **fixture** — the workspace JSON, captured once via `Blockly.serialization.workspaces.save(ws)`.
2. A **snapshot test** — load fixture → `generate(workspace)` → `expect(emitted).toMatchSnapshot()`.
3. The **snapshot file** — checked into the repo under `__snapshots__/`.

```ts
// test/regression.test.ts
import fixture from './fixtures/agent-multi-step.json'

it('agent-multi-step fixture snapshot locked', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(fixture, workspace)
  Blockly.Events.enable()
  expect(generate(workspace)).toMatchSnapshot()
})
```

A failing snapshot tells the developer **exactly one of two things**:
- (a) the generator was intentionally changed → update the snapshot, or
- (b) the SDK drifted (a rename, a removed export, an option default change) → fix the generator first, then update.

Either way the human is in the loop.

## Why it earns its weight

This pattern caught every SDK-drift-shape mistake in this degree before it could ship downstream. L2 established the first snapshot; by L4 there were 4+ locked fixtures (`stream-text-basic`, `agent-multi-step`, `agent-has-tool-call-stop`, `generate-text-with-tool`), each with its own committed `__snapshots__/regression.test.ts.snap`.

The matching anti-pattern is "trust the LLM to emit correct API names every time" — every implementation pass introduced at least one regression to a stale name that the snapshot diff surfaced immediately.

## Evidence

- `02-planning/test-strategy.md` lines 70-97 (section "Golden-Output (Snapshot) Tests"): the strategy doc lists this as "the primary defense against SDK API drift (R1) and stale LLM knowledge (R6)."
- `02-planning/risk-register.md` lines 16-23 (R1 mitigation #2): "Maintain golden-output snapshot tests for every block generator. … A snapshot mismatch on `npm update` is an early warning before any runtime breakage."
- `03-pocs/L2-single-generate-text-block/source/test/regression.test.ts` (REGRESSION run, `04-logs/command-log.md` lines 98-103): "5 test files, 30 tests, 4 snapshots written, all passing."
- `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 60-93 (RT-001): snapshot-lock per fixture.
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 66-98 (RT-L4-001): four snapshot locks.
- `03-pocs/L-capstone-research-agent/surprises.md` lines 3-10 (S-capstone-001): when the run-signature changed intentionally, the snapshot diff was the audit trail and `vitest run -u` was the deliberate approval — exactly how the system is supposed to work.

## Related

- [`patterns/forbidden-name-grep-regression.md`](forbidden-name-grep-regression.md) — the second line of defense, complementing this one.
- [`gotchas/ai-sdk-v6-api-renames.md`](../gotchas/ai-sdk-v6-api-renames.md)
