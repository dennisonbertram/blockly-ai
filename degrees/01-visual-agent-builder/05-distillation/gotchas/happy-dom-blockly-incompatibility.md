# Gotcha: `Blockly.inject` crashes in happy-dom AND jsdom — mock it for unit tests

**Category:** gotcha — Blockly + headless DOM testing

## Symptom

A workspace-mount test in Vitest (with either `environment: 'happy-dom'` or `environment: 'jsdom'`) crashes inside `Blockly.inject`:

```
TypeError: Cannot read properties of undefined (reading 'Symbol(listeners)')
  at addGlobalEventListener (FocusManager)
```

## Root cause

Blockly 12.5.1 introduced `FocusManager`, which calls `addEventListener` on `window` through an internal `EventTarget` subclass that bypasses the real `EventTarget` constructor. Neither happy-dom (`17.6.3`) nor jsdom (`26.1.0`) initializes its `Symbol(listeners)` storage on subclasses that don't run the base constructor. The crash is in the listener-registration path, not in any block code.

Research docs flagged jsdom as incompatible; the same crash applies to happy-dom — the research doc did not note this gap until the L1 surprise.

## Fix — mock `Blockly.inject` for unit tests; use Playwright for UI tests

```ts
// test/workspace-mount.test.tsx
import { vi, beforeEach } from 'vitest'

const { mockInject } = vi.hoisted(() => ({ mockInject: vi.fn() }))

vi.mock('blockly/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('blockly/core')>()
  return {
    ...actual,
    Blocks: actual.Blocks,    // see related gotcha — spread misses runtime-mutated keys
    inject:  mockInject,
    setLocale: vi.fn(),
  }
})
```

Pair this with at least one Playwright E2E that covers the real inject in a real browser at L5.

## Evidence

- `04-logs/error-log.md` lines 27-33: verbatim stack and fix.
- `04-logs/debug-log.md` lines 21-29: investigation — hypothesis confirmed by stack trace.
- `04-logs/expectation-gap-log.md` lines 20-27: "Research doc … mentioned jsdom incompatibility. Expected happy-dom to be more compatible … Same crash in happy-dom."
- `03-pocs/L1-blockly-hello/implementation-notes.md` lines 5-19: full investigation.
- `03-pocs/L1-blockly-hello/surprises.md` lines 3-17 (surprise 1): "Blockly 12.5.1 added `FocusManager` which calls `addEventListener` on `window` using an internal `EventTarget` wrapper."

## Related

- [`gotchas/vitest-vi-hoisted-and-runtime-mutated-exports.md`](vitest-vi-hoisted-and-runtime-mutated-exports.md) — same test file, different gotcha.
