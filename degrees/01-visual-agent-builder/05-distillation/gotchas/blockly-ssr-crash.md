# Gotcha: Blockly crashes on import in any SSR context

**Category:** gotcha — Blockly + Next.js / SSR

## Symptom

`ReferenceError: window is not defined` (or `document is not defined`) thrown at *module load time* from Blockly's internal code when the bundler imports it on the server. The error appears during `next build` or during the first server-render and points into Blockly's compiled source.

## Root cause

Blockly references `window`, `document`, and SVG APIs at the top level of `WorkspaceSvg` / `inject` / `FocusManager`, not just inside function bodies. Once a module that imports Blockly is loaded on Node, the references evaluate immediately. There is no `if (typeof window !== 'undefined')` guard inside Blockly. Per the closed-as-not-planned GitHub issues #8563 and #7051, the workaround must live on the consumer side.

## Fix

Use `next/dynamic` to exclude the importing component (and therefore the Blockly module graph) from the server bundle:

```tsx
const BlocklyWorkspace = dynamic(() => import('./BlocklyWorkspace'), { ssr: false });
```

Wrapping the `inject` call in `useEffect` is **not** sufficient — the `import 'blockly/core'` statement itself must be excluded from the server build. In Next.js 15 App Router, the file calling `next/dynamic({ ssr: false })` must itself carry `'use client'` (see related expectation gap).

## Evidence

- `01-research/blockly/known-failure-modes.md` lines 8-19: documents the failure mode and the `ssr: false` workaround; cites GitHub issues #8563 and #7051.
- `01-research/known-failure-modes.md` line 7: synthesis entry "SSR crash on import" — `next/dynamic(() => import('./BlocklyWorkspace'), { ssr: false })`.
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 56-58: "Dynamic `import('blockly/core')` inside `useEffect` — Blockly never imported at module level."
- `04-logs/command-log.md` lines 161-163: L5 final build "Blockly NOT in server bundle (ssr:false working)".
- `02-planning/risk-register.md` lines 44-57 (R3): SSR/Strict Mode treated as a Likelihood:High / Impact:High risk, mitigated at L1 and L5.

## Related

- See [`gotchas/nextjs-15-ssr-false-use-client.md`](nextjs-15-ssr-false-use-client.md) for the Next.js 15 follow-on requirement.
- See [`patterns/poc-ladder-progressive-risk-mitigation.md`](../patterns/poc-ladder-progressive-risk-mitigation.md) for how R3 was retired across L1→L5.
