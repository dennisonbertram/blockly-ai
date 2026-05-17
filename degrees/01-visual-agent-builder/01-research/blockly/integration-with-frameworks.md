# Blockly Integration with Frameworks

## Core Constraint

Blockly's `WorkspaceSvg` (the rendered editor) **requires a real DOM** with SVG support. This means:
- It cannot render server-side (no SSR).
- It needs to run inside `useEffect` or equivalent lifecycle hooks in React.
- It must be conditionally imported in Next.js.

`Blockly.Workspace` (headless, no rendering) works in Node.js. Only use `WorkspaceSvg` (via `Blockly.inject`) in browser contexts.

---

## React Integration

### The Minimal Pattern (Roll Your Own)

```tsx
// components/BlocklyEditor.tsx
import { useEffect, useRef, useCallback } from 'react';
import type { WorkspaceSvg } from 'blockly/core';

interface BlocklyEditorProps {
  toolbox: object;
  initialState?: object;
  onCodeChange?: (code: string) => void;
}

export function BlocklyEditor({ toolbox, initialState, onCodeChange }: BlocklyEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<WorkspaceSvg | null>(null);

  useEffect(() => {
    // Guard: only inject once, even under React 18 Strict Mode double-mount
    if (!containerRef.current || workspaceRef.current) return;

    // Dynamic import ensures Blockly is not included in SSR bundles.
    // In a pure CSR React app this is optional but still good practice.
    let cleanup = () => {};

    (async () => {
      const Blockly = await import('blockly/core');
      await import('blockly/blocks');
      const { javascriptGenerator } = await import('blockly/javascript');
      const En = await import('blockly/msg/en');
      Blockly.setLocale(En);

      if (!containerRef.current) return; // component unmounted before import completed

      const ws = Blockly.inject(containerRef.current, { toolbox });
      workspaceRef.current = ws;

      if (initialState) {
        Blockly.Events.disable();
        Blockly.serialization.workspaces.load(initialState, ws);
        Blockly.Events.enable();
      }

      const handleChange = (event: Blockly.Events.Abstract) => {
        if (event.isUiEvent) return;
        if (event.type === Blockly.Events.FINISHED_LOADING) return;
        if (ws.isDragging()) return;
        const code = javascriptGenerator.workspaceToCode(ws as Blockly.Workspace);
        onCodeChange?.(code);
      };

      ws.addChangeListener(handleChange);

      cleanup = () => {
        ws.removeChangeListener(handleChange);
        ws.dispose();
        workspaceRef.current = null;
      };
    })();

    return () => cleanup();
  }, []); // Must be empty deps — workspace lifecycle is managed imperatively

  // Handle toolbox updates after mount (don't re-inject on prop change)
  useEffect(() => {
    workspaceRef.current?.updateToolbox(toolbox);
  }, [toolbox]);

  return (
    <div
      ref={containerRef}
      style={{ height: '480px', width: '100%' }}
    />
  );
}
```

**Key design decisions**:
1. `workspaceRef.current` guard prevents double-injection under React 18 Strict Mode.
2. Dynamic `import()` inside `useEffect` ensures the module never runs during SSR.
3. Toolbox changes after mount use `updateToolbox` — NOT re-injection.
4. Cleanup: `ws.dispose()` + set `workspaceRef.current = null` so the second Strict Mode mount gets a fresh workspace.

---

## Next.js Integration

### The SSR Problem

Blockly references `window`, `document`, and browser-specific SVG APIs at **module load time** (not just at function call time). Simply guarding with `if (typeof window === 'undefined') return` in a hook is not enough — the module import itself fails on the server.

**Symptom**: `ReferenceError: window is not defined` during `next build` or `next start`.

**Fix 1: `next/dynamic` with `ssr: false` (Recommended)**

```tsx
// pages/editor.tsx (Pages Router) or app/editor/page.tsx (App Router)
import dynamic from 'next/dynamic';

const BlocklyEditor = dynamic(
  () => import('../components/BlocklyEditor'),
  {
    ssr: false,
    loading: () => <div>Loading editor...</div>,
  }
);

export default function EditorPage() {
  return <BlocklyEditor toolbox={myToolbox} />;
}
```

The entire `BlocklyEditor` component module (and all its imports including `blockly`) is excluded from the server bundle.

**Fix 2: `'use client'` + conditional import (App Router)**

In the App Router, mark `BlocklyEditor` as a Client Component:

```tsx
// components/BlocklyEditor.tsx
'use client';
// ... rest of the component with useEffect-based injection
```

This prevents SSR rendering of the component, but the Blockly module may still be bundled on the server. Use `dynamic` import inside the component to fully exclude it from the server bundle.

**Evidence**: GitHub issues #8563 ("Next.js Export Breaks Blockly") and #7051 ("Blockly with next 13 doesnt work") — both closed as "Not planned." Neither was officially fixed on Blockly's side; the fix is on the consumer's side using Next.js dynamic imports.

---

## `react-blockly` Third-Party Library

The `react-blockly` npm package (v9.0.0, MIT license) provides a React wrapper:

```bash
npm install react-blockly
```

**Peer dependencies**: `react: '^16.8 || ^17.0 || ^18.0'`, `blockly: '>= 11.0.0'`.

```tsx
import { BlocklyWorkspace } from 'react-blockly';

<BlocklyWorkspace
  className="blockly-workspace"
  toolboxConfiguration={toolbox}
  workspaceConfiguration={{ grid: { spacing: 20 } }}
  initialJson={savedState}
  onWorkspaceChange={(ws) => {
    const code = generator.workspaceToCode(ws);
    setCode(code);
  }}
  onJsonChange={(json) => setWorkspaceJson(json)}
/>
```

**Assessment**: `react-blockly` is a community package (not Google/Raspberry Pi Foundation official). It is maintained but not guaranteed to track Blockly's latest changes promptly. For production use, consider rolling your own wrapper for full control.

**Evidence**: `npm view react-blockly` — `version: 9.0.0`, `dependencies: { blockly: '>= 11.0.0', prop-types: '^15.8.1' }`.

---

## State Sync: Blockly Workspace ↔ React State

Blockly workspace state and React state are NOT automatically synchronized. You must bridge them:

### Pattern: Workspace → React State

```tsx
ws.addChangeListener((event) => {
  if (event.isUiEvent || ws.isDragging()) return;
  const json = Blockly.serialization.workspaces.save(ws);
  setWorkspaceState(json);  // React state update
});
```

### Pattern: React State → Workspace

**Do NOT use `setState` setters to drive the workspace**. The workspace is imperative; load state into it explicitly when needed:

```tsx
function loadState(state: object) {
  if (!workspaceRef.current) return;
  Blockly.Events.disable();
  workspaceRef.current.clear();
  Blockly.serialization.workspaces.load(state, workspaceRef.current);
  Blockly.Events.enable();
}
```

**Warning**: Calling `ws.clear()` before `load` is safe but fires many `BLOCK_DELETE` events. Wrapping in `Events.disable()`/`Events.enable()` prevents listener chaos.

---

## Performance Considerations

- **Large workspaces**: Workspaces with >200 blocks may render slowly. The default renderer is `Blockly.blockRendering.Renderer` (Geras). The Zelos renderer is heavier but more visual. For large graphs, consider disabling animations.
- **Frequent workspace saves**: Serializing the workspace on every change event is expensive. Debounce with 200-500ms delay.
- **Code generation on every change**: Similarly, debounce `workspaceToCode` for large workspaces. The traversal is O(n) in block count.
- **ResizeObserver**: Blockly does not auto-resize. Hook a `ResizeObserver` on the container and call `ws.resize()`.

```tsx
useEffect(() => {
  if (!containerRef.current || !workspaceRef.current) return;
  const observer = new ResizeObserver(() => {
    workspaceRef.current?.resize();
  });
  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);
```

---

## Cleanup Requirements

Always call `ws.dispose()` when unmounting. Failure to do so:
- Leaks event listeners on the DOM.
- Leaves orphaned SVG elements in the document.
- Can cause memory leaks in long-running SPAs.

In React, this means calling `dispose()` inside the `useEffect` cleanup function.
