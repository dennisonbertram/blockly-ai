# Blockly Setup and Installation

## Version Pin

```
blockly@12.5.1
```

This is the `latest` npm tag as of 2026-05-16. v13.0.0-beta.4 exists but is still in beta with active breaking changes. **Use 12.5.1 for POCs.**

**Evidence**: `npm view blockly dist-tags` output → `{ latest: '12.5.1', beta: '13.0.0-beta.4' }`, verified 2026-05-16.

---

## npm Install

```bash
npm install blockly
# or
yarn add blockly
```

No peer dependencies are required. The package bundles its own `jsdom@26.1.0` as a production dependency (used for Node.js headless mode). TypeScript types are included — no separate `@types/blockly` needed.

**Evidence**: `/tmp/package/package.json` — `dependencies: { jsdom: '26.1.0' }`, `devDependencies` do not include any `@types/` entries.

---

## Package Internals (ESM vs CJS)

The `blockly` npm package (v12) is declared as `"type": "commonjs"` in `package.json`. However, it ships `.mjs` files as ESM entry points via the `exports` map:

```json
{
  ".": {
    "types": "./index.d.ts",
    "import": "./index.mjs",      // ESM
    "umd": "./blockly.min.js",
    "default": "./index.js"       // CJS UMD
  },
  "./javascript": {
    "types": "./javascript.d.ts",
    "import": "./javascript.mjs", // ESM
    "default": "./javascript_compressed.js"  // CJS
  }
}
```

**Critical caveat**: The `.mjs` files are thin re-export wrappers around the compressed UMD bundles (e.g., `blockly.mjs` imports `blockly_compressed.js` then re-exports named symbols). This means:

1. They work with bundlers (webpack, vite) via the `import` condition in `exports`.
2. They do NOT work as native browser ESM (`<script type="module">`) because the underlying `.js` file uses UMD, not native ESM syntax.
3. Issue #7449 ("Publish Blockly as ES modules") was still open as of 2026-05-16; the ESM story is incomplete.

**Evidence**: `/tmp/package/blockly.mjs` (first line: `import Blockly from './blockly_compressed.js'`), `/tmp/package/package.json` (exports map), GitHub issue #7449.

---

## Import Pattern (Recommended)

```typescript
import * as Blockly from 'blockly/core';       // Core workspace + block APIs
import * as libraryBlocks from 'blockly/blocks'; // Built-in block definitions
import { javascriptGenerator } from 'blockly/javascript'; // JS code generator
import * as En from 'blockly/msg/en';           // English locale strings

Blockly.setLocale(En);
```

Importing from `'blockly'` (the root) loads core + blocks + English locale together — convenient for quick starts but less tree-shakeable.

**Evidence**: developers.google.com/blockly/guides/get-started/web.

---

## Bundler Support

### Webpack 5

Works without special configuration. Official sample apps use Webpack 5.

```js
// webpack.config.js — no special Blockly config needed
module.exports = {
  entry: './src/index.ts',
  resolve: { extensions: ['.ts', '.js'] },
  module: { rules: [{ test: /\.ts$/, loader: 'ts-loader' }] }
};
```

**Evidence**: `google/blockly-samples/examples/sample-app-ts/package.json` — `webpack@^5.93.0`.

### Vite

Works but requires setting `optimizeDeps` to handle the CJS/UMD internals:

```js
// vite.config.js
export default {
  optimizeDeps: {
    include: ['blockly', 'blockly/blocks', 'blockly/javascript'],
    exclude: []
  }
}
```

Without this, Vite's pre-bundler may fail because the UMD files inside the `.mjs` wrappers use `module.exports` syntax that Vite does not expect from `.mjs` files.

**Evidence**: Inferred from the ESM wrapper structure (`.mjs` importing CJS `.js`). GitHub issue #8170 confirms that native browser ESM without a bundler does not work. Vite handling is community-reported and not in official docs as of this research date. Mark as `confidence: medium`.

### esbuild

Works as a bundler. Not tested in official samples. The same CJS/ESM wrapping concern applies — esbuild resolves the `import` condition in the `exports` map and handles the UMD files through its bundling step.

---

## TypeScript Support

Full TypeScript support is included. All types are shipped in the package:
- `blockly/core` types: `./core.d.ts`
- Generator types: `./javascript.d.ts`, etc.
- Main entry: `./index.d.ts`

No `tsconfig` adjustments are required beyond including `blockly` in your type roots (which TypeScript does automatically).

**Evidence**: `/tmp/package/index.d.ts`, `/tmp/package/generators/javascript/javascript_generator.d.ts`.

---

## Browser vs Node.js Usage

| Context | Entry Point | Notes |
|---|---|---|
| Browser (with bundler) | `'blockly'` or `'blockly/core'` | Normal usage |
| Browser (no bundler) | `blockly.min.js` via CDN | Not recommended for production |
| Node.js (headless) | `'blockly/core'` | Triggers `core-node.js` which bootstraps jsdom |

The `core-node.js` bootstrap creates a jsdom `window` and injects it into `Blockly.utils.xml.injectDependencies`. This means XML parsing works in Node.js. **WorkspaceSvg is NOT available** in headless Node — you can only use `Workspace` (headless base class).

**Evidence**: `/tmp/package/core-node.js` source.

---

## Engine Requirements

Node.js >= 18 (as declared in `package.json` `engines` field).

**Evidence**: `/tmp/package/package.json` — `"engines": { "node": ">=18" }`.

---

## Mounting a Workspace in React/Next.js

### Minimal React Setup (no SSR)

```tsx
import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import * as En from 'blockly/msg/en';

Blockly.setLocale(En);

// Register built-in blocks once (outside component to avoid re-registration)
// libraryBlocks registers itself on import

const toolbox = {
  kind: 'flyoutToolbox',
  contents: [
    { kind: 'block', type: 'controls_if' },
    { kind: 'block', type: 'math_number' },
  ],
};

export function BlocklyEditor({ onChange }) {
  const containerRef = useRef(null);
  const workspaceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return;

    // Inject creates the workspace and mounts SVG into the container div
    const ws = Blockly.inject(containerRef.current, { toolbox });
    workspaceRef.current = ws;

    const listener = (event) => {
      if (event.isUiEvent) return;
      if (event.type === Blockly.Events.FINISHED_LOADING) return;
      if (ws.isDragging()) return;
      const code = javascriptGenerator.workspaceToCode(ws);
      onChange?.(code);
    };
    ws.addChangeListener(listener);

    return () => {
      ws.removeChangeListener(listener);
      ws.dispose();
      workspaceRef.current = null;
    };
  }, []); // empty deps: mount once

  return <div ref={containerRef} style={{ height: '480px', width: '100%' }} />;
}
```

### Next.js (App Router or Pages Router — SSR Safety)

Blockly references `window`, `document`, and SVG APIs at import time. **It will crash on SSR.** Use dynamic import with `ssr: false`:

```tsx
// In a Next.js page or layout:
import dynamic from 'next/dynamic';

const BlocklyEditor = dynamic(
  () => import('./BlocklyEditor'),
  { ssr: false }
);
```

Alternatively, guard with `typeof window !== 'undefined'` in a `useEffect`, but the `dynamic` import is cleaner because it prevents the module from being included in the server bundle at all.

**Evidence**: GitHub issues #8563 ("Next.js Export Breaks Blockly") and #7051 ("Blockly with next 13 doesnt work") confirm SSR failures. The `dynamic` pattern is a standard Next.js approach for DOM-dependent libraries.

### React Strict Mode Double-Mount

React 18 Strict Mode intentionally mounts and unmounts components twice in development. If your `useEffect` guard is incorrect (e.g., checks `containerRef.current` but not `workspaceRef.current`), Blockly will be injected twice into the same div, causing rendering artifacts or the "Blockly has already been injected into this div" error.

**Fix**: Guard the injection with `if (workspaceRef.current) return;` (shown above). The cleanup function must call `ws.dispose()` AND set `workspaceRef.current = null` so the second mount creates a fresh workspace.

---

## Resizing

The workspace does not auto-resize when its container changes size. You must call:

```js
workspaceRef.current.resize();
```

Use a `ResizeObserver` on the container div to trigger this, or call it after any layout change.

**Evidence**: `/tmp/package/core/workspace_svg.d.ts` — `resize()` method exists. The workspace does not observe container size changes itself.
