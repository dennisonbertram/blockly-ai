# Gotcha: React 18 Strict Mode double-mounts Blockly

**Category:** gotcha — Blockly + React

## Symptom

In development with `<StrictMode>`, the workspace mounts twice, the second `Blockly.inject` either throws ("already injected") or renders a duplicate SVG inside the container. In production the same component runs cleanly, masking the bug.

## Root cause

Strict Mode intentionally mounts → unmounts → re-mounts components to surface effect-cleanup bugs. `Blockly.inject` is not idempotent: it expects to own its container DOM node. Without both a ref-guard *and* a cleanup that clears the ref, the second mount calls `inject` again on a now-disposed container.

## Fix — both halves are required

```tsx
useEffect(() => {
  if (!containerRef.current || workspaceRef.current) return;   // guard
  const ws = Blockly.inject(containerRef.current, options);
  workspaceRef.current = ws;
  return () => {
    ws.dispose();
    workspaceRef.current = null;   // CRITICAL: ref must be null on cleanup
  };
}, []);
```

Setting the ref to `null` in cleanup is what makes the *second* mount run past the guard.

## Evidence

- `01-research/blockly/known-failure-modes.md` lines 22-43: documents the failure and the guard+cleanup pattern. "The guard pattern is the standard fix for all non-idempotent DOM libraries."
- `01-research/known-failure-modes.md` line 8: synthesis entry "React Strict Mode double-inject … cleanup did not null the workspace ref. Fix: guard with `if (workspaceRef.current) return;` AND set `workspaceRef.current = null` in cleanup."
- `02-planning/risk-register.md` lines 43-57 (R3): mitigation #2 is exactly "guard … plus cleanup that sets `workspaceRef.current = null`. **Both conditions are required (not just one).**"
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 55-58: confirms the pattern was carried into L5 unchanged from L1.

## Related

- [`patterns/poc-ladder-progressive-risk-mitigation.md`](../patterns/poc-ladder-progressive-risk-mitigation.md) — R3 was treated as a go/no-go gate at L1.
