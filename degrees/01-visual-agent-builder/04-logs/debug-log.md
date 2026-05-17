# Debug Log — Visual Agent Builder

Append-only record of investigations — bugs, mysterious behavior, performance problems. Every entry captures the problem, hypotheses considered, evidence gathered for or against each, and the eventual resolution (or current status if unresolved).

## Entry Format

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>

- **Problem**:
- **Hypotheses**:
  1. <hypothesis> — evidence for / against
  2. ...
- **Evidence gathered** (commands, log paths, observations):
- **Resolution** (or current status):
- **Distillation candidate?** (gotcha / pattern / anti-pattern):
```

## Entries

## 2026-05-17T00:15:00Z — Debugging Blockly.inject crash in happy-dom

- **Problem**: `workspace-mount.test.tsx` crashed with `TypeError: Cannot read properties of undefined (reading 'Symbol(listeners)')` inside `FocusManager.addGlobalEventListener`.
- **Hypotheses**:
  1. happy-dom EventTarget missing Symbol-keyed property — evidence: stack trace points to `EventTarget.ts:58` in happy-dom source; `Symbol(listeners)` is happy-dom's internal storage.
  2. Blockly's FocusManager added in 12.x calls `window.addEventListener` at workspace create time — evidence: stack trace shows `new FocusManager` → `createDom` → `inject`.
- **Evidence gathered**: Stack trace confirmed hypothesis 1+2. Checking `happy-dom@17.6.3` EventTarget source shows `Symbol(listeners)` is set in constructor; the issue is that Blockly passes a non-standard `EventTarget` subclass that bypasses the constructor.
- **Resolution**: Mocked `Blockly.inject` via `vi.mock` + `vi.hoisted`. Added to error-log and decision-log.
- **Distillation candidate?**: Yes — gotcha: "Blockly 12.x FocusManager is incompatible with both jsdom and happy-dom. Mock inject for unit tests; use Playwright for UI tests."

## 2026-05-17T00:15:30Z — Debugging vi.mock variable access issue

- **Problem**: `ReferenceError: Cannot access 'mockInject' before initialization` when using `vi.mock` factory with outer variables.
- **Hypotheses**:
  1. `vi.mock` is hoisted by Vite/Vitest above `const` declarations — evidence: Vitest docs confirm hoisting.
- **Evidence gathered**: Vitest docs: "vi.mock is hoisted to the top of the file. You cannot access variables defined outside the factory." Solution: `vi.hoisted`.
- **Resolution**: Used `vi.hoisted(() => ({ mockInject: vi.fn() }))` to declare mock variables before hoisting.
- **Distillation candidate?**: Yes — pattern: always use `vi.hoisted` for any variable referenced in a `vi.mock` factory.

## 2026-05-17T00:15:50Z — Debugging missing Blockly.Blocks in vi.mock spread

- **Problem**: After the vi.mock, `greet.ts` tried to access `Blockly.Blocks['greet'] = ...` and got `[vitest] No "Blocks" export is defined`.
- **Hypotheses**:
  1. `{ ...actual }` spread only captures static named exports, not runtime-mutated properties — evidence: `Blockly.Blocks` is a global mutable registry, not a static export.
- **Evidence gathered**: Running `Object.keys(actual)` in mock factory showed `Blocks` was not in the spread keys.
- **Resolution**: Added `Blocks: actual.Blocks` explicitly to mock return object.
- **Distillation candidate?**: Yes — anti-pattern: don't rely on `{ ...actual }` to capture runtime-mutated module properties in vi.mock.
