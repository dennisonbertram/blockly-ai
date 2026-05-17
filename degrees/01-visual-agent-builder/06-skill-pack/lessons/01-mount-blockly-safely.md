# Lesson 01 — Mount Blockly Safely in Next.js

**Prerequisite:** Read `../05-distillation/before-you-build/before-you-build.md` first.
**Source:** L1 (blockly-hello) implementation notes + gotchas
**Risks retired:** R3 (SSR / Strict Mode), R7 (bundle size), R8 (Vite/Webpack bundler quirks)

---

## The Core Problem

Blockly references `window`, `document`, and SVG APIs at the **top level of its module graph** — not inside function bodies. Importing `blockly/core` on the server (during Next.js SSR or `next build`) throws:

```
ReferenceError: window is not defined
```

This is not a workaround-able guard; Blockly's internal `FocusManager`, `WorkspaceSvg`, and `inject` all touch `window` at module load time.

---

## Fix 1 — Exclude Blockly from the Server Bundle

In Next.js 15 App Router, you need **two pieces** working together:

```tsx
// app/page.tsx
'use client'   // REQUIRED in Next.js 15 App Router — cannot use ssr:false in Server Component

import dynamic from 'next/dynamic'

const BlocklyEditor = dynamic(
  () => import('../components/BlocklyEditor'),
  { ssr: false }
)
```

**Why `'use client'` is required:** Next.js 15 App Router treats every file under `app/` as a Server Component by default. The `ssr: false` option is only meaningful in a Client Component context. Without `'use client'`, `next build` fails with:

```
Error: `ssr: false` is not allowed with `next/dynamic` in Server Components.
Please move it into a client component.
```

**Why wrapping the inject call in `useEffect` is NOT sufficient:** The `import 'blockly/core'` statement itself must be excluded from the server build. The dynamic import achieves this; a `useEffect` guard does not.

Source: `05-distillation/gotchas/blockly-ssr-crash.md`, `05-distillation/gotchas/nextjs-15-ssr-false-use-client.md`

---

## Fix 2 — React Strict Mode Double-Mount Guard

React 18 development mode intentionally mounts → unmounts → re-mounts components to surface effect-cleanup bugs. `Blockly.inject` is not idempotent — calling it twice on the same container element throws or creates duplicate workspaces.

**Both halves of this guard are required:**

```tsx
// components/BlocklyEditor.tsx
import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly/core'

export function BlocklyEditor({ options }: { options: Blockly.BlocklyOptions }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  useEffect(() => {
    // Guard: skip if container is not ready OR if workspace already injected
    if (!containerRef.current || workspaceRef.current) return

    const ws = Blockly.inject(containerRef.current, options)
    workspaceRef.current = ws

    return () => {
      ws.dispose()
      workspaceRef.current = null   // CRITICAL: must be null so second mount re-runs
    }
  }, [])  // empty deps — only mount once

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}
```

Setting `workspaceRef.current = null` in cleanup is what allows the second Strict Mode mount to run past the guard. If you only do the guard (`if (workspaceRef.current) return`) without the null-on-cleanup, the first mount sets the ref, the cleanup runs but leaves the ref set, and the second mount finds a non-null ref and skips — leaving the workspace in a disposed state.

Source: `05-distillation/gotchas/react-strict-mode-double-mount.md`

---

## Fix 3 — Disable Events During Programmatic Workspace Loads

When you load a workspace from saved JSON (e.g., for tests or for loading a demo program), Blockly fires a `BLOCK_CREATE` event for every block it instantiates. Change listeners (like a live code-preview panel) will trigger on every block, before the workspace is fully loaded.

```ts
Blockly.Events.disable()
Blockly.serialization.workspaces.load(state, workspace)
Blockly.Events.enable()
```

Wrap every programmatic bulk load this way. This is used in every codegen test throughout the degree.

Source: `05-distillation/gotchas/blockly-events-during-programmatic-load.md`

---

## Bundler Configuration (Vite projects only)

If using Vite (L1 used Vite before migrating to Next.js at L5), add to `vite.config.ts`:

```ts
optimizeDeps: {
  include: ['blockly']
}
```

The older `deps.inline: ['blockly']` is deprecated; use `deps.optimizer.web.include` in newer Vitest versions.

---

## Testing Considerations

Blockly 12.5.1's `FocusManager` crashes in both `happy-dom` and `jsdom` with:

```
TypeError: Cannot read properties of undefined (reading 'Symbol(listeners)')
  at addGlobalEventListener (FocusManager)
```

Mock `Blockly.inject` for unit tests; use Playwright for real browser E2E:

```ts
// test/workspace-mount.test.tsx
const { mockInject } = vi.hoisted(() => ({ mockInject: vi.fn() }))

vi.mock('blockly/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('blockly/core')>()
  return {
    ...actual,
    Blocks:    actual.Blocks,    // must be explicit — spread misses runtime-mutated keys
    inject:    mockInject,
    setLocale: vi.fn(),
  }
})
```

Note the use of `vi.hoisted` — not a plain `const mockInject = vi.fn()`. `vi.mock(...)` factories run hoisted before the module is initialized, so the plain `const` would not be available. `vi.hoisted` solves this.

Source: `05-distillation/gotchas/happy-dom-blockly-incompatibility.md`, `05-distillation/gotchas/vitest-vi-hoisted-and-runtime-mutated-exports.md`

---

## Exercise

1. Create a `BlocklyEditor` component following the guard pattern above.
2. Mount it in a `'use client'` page using `next/dynamic({ ssr: false })`.
3. Run `next build` and confirm it completes without `window is not defined`.
4. Run `pnpm dev` in development mode and confirm no "already injected" console errors appear.

See [labs/lab-01-write-a-greet-block.md](../labs/lab-01-write-a-greet-block.md) for a full hands-on exercise.

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Next Lesson: Emit GenerateText v6](02-emit-generate-text-v6.md)
- [Recipe: Strict Mode Blockly Guard](../recipes/recipe-strict-mode-blockly-guard.md)
- [Troubleshooting: SSR window not defined](../troubleshooting/symptom-ssr-window-not-defined.md)
- [Troubleshooting: Double Blockly Workspace](../troubleshooting/symptom-double-blockly-workspace.md)
