# Troubleshooting: Double Blockly Workspace / "Already Injected" Error

## Symptom

In development mode, one of:
- A second Blockly workspace SVG appears inside the container, overlapping the first.
- `Blockly.inject` throws an error about an already-injected container.
- The workspace renders in dev but looks fine in production — masking the bug.

## Cause

React 18 Strict Mode intentionally mounts → unmounts → re-mounts every component in development to surface effect-cleanup bugs. `Blockly.inject` is not idempotent: it expects to own its container DOM node exclusively. The second mount calls `inject` again on the same container.

## Fix

Both halves of the guard pattern are required. Missing either one causes the error:

```tsx
useEffect(() => {
  if (!containerRef.current) return
  if (workspaceRef.current) return    // HALF 1: guard against re-entry

  const workspace = Blockly.inject(containerRef.current, {
    toolbox: { ... },
  })
  workspaceRef.current = workspace

  return () => {
    workspaceRef.current = null       // HALF 2: null BEFORE dispose
    workspace.dispose()
  }
}, [])
```

### Why both halves are required

| What happens | Half 1 only | Half 2 only | Both |
|---|---|---|---|
| Strict Mode mount #1 | Creates workspace OK | Creates workspace OK | Creates workspace OK |
| Strict Mode unmount | Does not null ref | Disposes but ref still points to disposed workspace | Disposes AND nulls ref |
| Strict Mode mount #2 | Guard fires on disposed workspace (broken) | Guard absent — inject called twice (crashes) | Guard fires, sees null, creates fresh workspace correctly |

## Common Mistake

Setting `workspaceRef.current = null` AFTER `workspace.dispose()`:

```ts
// WRONG order — ref is non-null when the next mount's guard runs
workspace.dispose()
workspaceRef.current = null

// CORRECT order — null first so the guard works
workspaceRef.current = null
workspace.dispose()
```

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Recipe: Strict Mode Blockly Guard](../recipes/recipe-strict-mode-blockly-guard.md)
- [Troubleshooting: SSR window not defined](symptom-ssr-window-not-defined.md)
- [Back to Index](../index.md)
