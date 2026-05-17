# Troubleshooting: `ReferenceError: window is not defined`

## Symptom

`ReferenceError: window is not defined` (or `document is not defined`) thrown during `next build` or during server-side rendering. The stack trace points into Blockly's compiled source (`blockly/core` or `blockly/blocks`).

## Cause

Blockly accesses `window`, `document`, and SVG APIs at module load time — not just inside function bodies. When the Next.js bundler includes any file that imports Blockly in the server bundle, those references evaluate immediately in Node where `window` doesn't exist. There is no guard inside Blockly; the workaround must live on the consumer side.

## Fix

### Step 1 — Wrap the editor component in `next/dynamic({ ssr: false })`

```tsx
// app/page.tsx
'use client'   // required in Next.js 15 App Router

import dynamic from 'next/dynamic'

const BlocklyEditor = dynamic(
  () => import('../components/BlocklyEditor'),
  { ssr: false }
)

export default function Page() {
  return <BlocklyEditor />
}
```

### Step 2 — Ensure the importing file has `'use client'`

In Next.js 15 App Router, `ssr: false` is only allowed in Client Components. If `app/page.tsx` lacks `'use client'`, you get a build error: `ssr: false is not allowed with next/dynamic in Server Components`.

### Step 3 — Do NOT import Blockly at the module level in the editor component

```ts
// WRONG — Blockly imported at module level, included in server bundle
import * as Blockly from 'blockly/core'

// CORRECT — in BlocklyEditor.tsx, import normally (next/dynamic handles exclusion)
import * as Blockly from 'blockly/core'   // fine because next/dynamic { ssr: false } prevents server bundle inclusion
```

The `ssr: false` in `next/dynamic` excludes the entire imported module graph from the server bundle. The component file itself can use normal imports.

## Verification

After the fix, `next build` output should show Blockly appearing only in client-side chunk files, not in server-rendered routes.

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Recipe: Strict Mode Blockly Guard](../recipes/recipe-strict-mode-blockly-guard.md)
- [Troubleshooting: Double Blockly Workspace](symptom-double-blockly-workspace.md)
- [Back to Index](../index.md)
