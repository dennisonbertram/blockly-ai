# Recipe: React Strict Mode Double-Mount Guard for Blockly

**Use when:** Mounting a Blockly workspace inside a Next.js App Router `'use client'` component. React 18 Strict Mode mounts every component twice in development, causing a second `Blockly.inject()` call against a container that already has a workspace, which throws a fatal error.

---

## The Complete Guard Pattern

Both halves are required. Missing either half causes the error to recur.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { javascriptGenerator } from 'blockly/javascript'

// Import block modules for side-effect registration
import '../src/blocks/generate-text'
import '../src/blocks/model'
// ... other block imports

export default function BlocklyEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // HALF 1: Guard against re-entry (Strict Mode second mount)
    if (workspaceRef.current) return

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: { kind: 'flyoutToolbox', contents: [...] },
    })
    workspaceRef.current = workspace

    return () => {
      // HALF 2: Null the ref before dispose so the guard works on remount
      workspaceRef.current = null
      workspace.dispose()
    }
  }, [])

  return <div ref={containerRef} style={{ height: '500px', width: '100%' }} />
}
```

## Why Both Halves Are Required

| Scenario | Half 1 only | Half 2 only | Both |
|---|---|---|---|
| Strict Mode mount #1 | Creates workspace | Creates workspace | Creates workspace |
| Strict Mode unmount | Does not dispose | Disposes but ref still non-null | Disposes AND nulls ref |
| Strict Mode mount #2 | **Guard fires, skips inject** (workspace already disposed — broken) | **No guard — double inject crashes** | Guard fires, sees null, creates fresh workspace |

Omitting the `workspaceRef.current = null` in cleanup means the second mount's guard fires on a disposed workspace reference. Omitting the early-return guard means the second mount calls `Blockly.inject()` twice.

## SSR — Load Dynamically to Avoid `window not defined`

Blockly uses browser APIs at module load time. In Next.js, always wrap the editor component in `next/dynamic`:

```tsx
// app/page.tsx (or parent component)
import dynamic from 'next/dynamic'

const BlocklyEditor = dynamic(
  () => import('./components/BlocklyEditor'),
  { ssr: false }
)
```

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Troubleshooting: SSR window not defined](../troubleshooting/symptom-ssr-window-not-defined.md)
- [Troubleshooting: Double Blockly Workspace](../troubleshooting/symptom-double-blockly-workspace.md)
- [Back to Index](../index.md)
