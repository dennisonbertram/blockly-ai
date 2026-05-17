# Gotcha: Blockly field validator must return `null` to reject — `undefined` silently accepts

**Category:** gotcha — Blockly

## Symptom

You add a `setValidator` callback to a field expecting it to reject invalid values. At runtime the field accepts every value you type; no error fires; the validator appears dead.

## Root cause

Blockly's validator contract uses three return values:
- **`null`** — reject the change (revert to previous value).
- **the new value (transformed if needed)** — accept.
- **`undefined`** (or no `return` statement) — "no opinion / pass through" — i.e., **accept unchanged**.

JavaScript functions that fall off the end implicitly return `undefined`, so a bare guard like `if (!ok) return;` reads like a rejection but is actually a silent accept.

## Fix

Always return `null` explicitly when rejecting:

```ts
field.setValidator((value) => {
  if (Number(value) < 0) return null;   // reject
  return value;                          // accept (or return a transformed value)
});
```

## Evidence

- `01-research/blockly/known-failure-modes.md` lines 65-79 (item 4): "Validators must return `null` to reject a value. If the validator returns `undefined` … Blockly interprets `undefined` as 'no change' (pass-through), NOT as rejection."
- `01-research/known-failure-modes.md` line 11: synthesis entry "Field validator returns `undefined`. Symptom: invalid values silently accepted. Fix: return `null` to reject."
