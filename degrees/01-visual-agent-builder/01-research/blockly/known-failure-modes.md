# Known Failure Modes

Distilled from GitHub issues, official docs, community patterns, and package inspection. Each entry: Symptom → Cause → Fix.

---

## 1. SSR / Next.js Crash: `ReferenceError: window is not defined`

**Symptom**: Build or runtime error during server-side rendering: `ReferenceError: window is not defined` or `document is not defined`. The error stack points into Blockly's internal code.

**Cause**: Blockly uses `window`, `document`, and SVG APIs at module load time (not just during function calls). When Node.js/SSR loads the Blockly module, these browser globals don't exist.

**Fix**: Use `next/dynamic` with `ssr: false` to exclude the Blockly component and all its imports from the server bundle:
```tsx
const BlocklyEditor = dynamic(() => import('./BlocklyEditor'), { ssr: false });
```
Do NOT just wrap the `inject` call in `useEffect` — the import itself must be excluded.

**Evidence**: GitHub issues #8563 and #7051 (both closed "Not planned" — fix must be done on the consumer side). `/tmp/package/core-node.js` — only the headless `Workspace` module bootstraps jsdom for Node.js; `WorkspaceSvg` and `inject` are never designed for Node.js.

---

## 2. React Strict Mode Double-Mount / "Already injected" Error

**Symptom**: In React 18 development mode with Strict Mode enabled, the workspace appears broken or console shows errors about double-initialization. Blockly SVG may render twice in the container, or the `inject` call fails.

**Cause**: React Strict Mode intentionally mounts and unmounts components twice in development to detect side effects. If the `useEffect` guard is missing or incomplete, `Blockly.inject` is called twice on the same DOM element without calling `dispose()` between.

**Fix**: Guard the injection with a ref check AND ensure cleanup sets the ref to `null`:
```tsx
useEffect(() => {
  if (!containerRef.current || workspaceRef.current) return; // guard
  const ws = Blockly.inject(containerRef.current, options);
  workspaceRef.current = ws;
  return () => {
    ws.dispose();
    workspaceRef.current = null; // CRITICAL: must be null for second mount
  };
}, []);
```

**Evidence**: React 18 Strict Mode documentation; pattern inferred from Blockly inject API and known Strict Mode behavior. The guard pattern is the standard fix for all non-idempotent DOM libraries.

---

## 3. Events Firing During Programmatic Workspace Load

**Symptom**: Change listeners (e.g., code generation, workspace save) fire dozens of times when loading a workspace state. Generated code is incomplete or errors during loading. Performance is poor on large workspace loads.

**Cause**: `Blockly.serialization.workspaces.load()` fires a `BLOCK_CREATE` event for every block it creates. If a change listener tries to generate code while the workspace is only partially loaded, `workspaceToCode` traverses an incomplete graph.

**Fix**: Disable events during programmatic load:
```typescript
Blockly.Events.disable();
Blockly.serialization.workspaces.load(state, workspace);
Blockly.Events.enable();
```
Also guard against `FINISHED_LOADING` and `isUiEvent` in your listener.

**Evidence**: `google/blockly-samples/examples/sample-app-ts/src/serialization.ts` — official sample explicitly wraps load in `Events.disable()`/`Events.enable()`. `index.ts` from the same sample checks `e.type == Blockly.Events.FINISHED_LOADING`.

---

## 4. Field Validator Silent Acceptance of Invalid Values

**Symptom**: A field validator is supposed to reject a value, but the block's field accepts it anyway. No error is thrown. The validator appears to have no effect.

**Cause**: Validators must return `null` to reject a value. If the validator returns `undefined` (e.g., from a function with no explicit return statement, or a conditional with a missing branch), Blockly interprets `undefined` as "no change" (pass-through), NOT as rejection. Only `null` is the rejection signal.

**Fix**:
```typescript
field.setValidator((value) => {
  if (value < 0) return null; // CORRECT: null = reject
  return value;               // accept (or return transformed value)
  // WRONG: return; (returns undefined, does NOT reject)
});
```

**Evidence**: Inferred from `/tmp/package/core/field.d.ts` — `FieldValidator` type definition; `null` is the documented rejection signal. This is a common community-reported gotcha on Stack Overflow.

---

## 5. Mutator State Lost on Reload (XML vs JSON Mismatch)

**Symptom**: A custom block with a mutator serializes correctly, but when the workspace is reloaded the block reverts to its default shape (mutator state is lost).

**Cause**: The block defines `mutationToDom`/`domToMutation` (XML) for mutator serialization, but the workspace is being saved/loaded with the JSON API (`Blockly.serialization.workspaces.save/load`). The JSON API only calls `saveExtraState`/`loadExtraState`. If those are not defined, the mutator state is not captured in the JSON output.

**Fix**: For new blocks, implement `saveExtraState`/`loadExtraState` instead of (or in addition to) `mutationToDom`/`domToMutation`. If the block must support both (for migration), implement all four methods.

**Evidence**: developers.google.com/blockly/guides/create-custom-blocks/mutators — both serialization approaches documented. `/tmp/package/core/block.d.ts` shows `mutationToDom`, `domToMutation`, `saveExtraState`, `loadExtraState` all as optional properties.

---

## 6. Bundle Size Bloat (All Built-in Blocks Included)

**Symptom**: The final application bundle is unexpectedly large (~500KB+ gzipped). Tree-shaking does not reduce block content.

**Cause**: Blockly's `.mjs` files are thin wrappers around pre-compiled, minified UMD bundles (`blockly_compressed.js`, `blocks_compressed.js`). The UMD bundles cannot be tree-shaken because they are already compiled monolithic files.

Importing `'blockly/blocks'` includes ALL ~80 built-in block definitions (math, text, lists, logic, loops, variables, procedures). There is no way to import only a subset.

**Fix/Workaround**: 
- If you don't need built-in blocks, only import `'blockly/core'` (without `'blockly/blocks'`).
- Accept the bundle size and split it into a separate chunk via dynamic import.
- Consider that `blockly_compressed.js` is already minified; the actual transfer size with gzip is ~250-350KB.

**Evidence**: GitHub issue #7449 ("Publish Blockly as ES modules") — open as of 2026-05-16; tree-shaking of individual blocks is not currently possible. `/tmp/package/blockly.mjs` — wraps pre-compiled UMD.

---

## 7. Workspace Not Resizing After Container Size Change

**Symptom**: The Blockly editor does not fill its container after the container is resized (e.g., a sidebar panel is expanded, the browser window is resized). The SVG canvas remains at the original injected size.

**Cause**: Blockly does not observe its container for size changes. It only computes layout at injection time and when `ws.resize()` is explicitly called.

**Fix**: Use a `ResizeObserver`:
```typescript
const observer = new ResizeObserver(() => workspace.resize());
observer.observe(containerElement);
// Cleanup:
observer.disconnect();
```

**Evidence**: `/tmp/package/core/workspace_svg.d.ts` — `resize()` exists as a public method with no automatic triggering mechanism.

---

## 8. Toolbox Not Updating After `inject`

**Symptom**: You pass a new toolbox definition as a prop to your React component, but the toolbox does not update. Old categories remain visible.

**Cause**: The toolbox definition is passed to `Blockly.inject` once. Blockly does not watch for prop changes. Re-calling `inject` would create a second workspace.

**Fix**: Call `workspace.updateToolbox(newDefinition)` when the toolbox needs to change:
```tsx
useEffect(() => {
  workspaceRef.current?.updateToolbox(toolbox);
}, [toolbox]);
```
Place this in a separate `useEffect` from the inject effect, with `toolbox` as a dependency.

**Evidence**: Inferred from Blockly's imperative API design; `updateToolbox` is the documented method for post-inject toolbox changes.

---

## 9. Generator Not Defined for Custom Block → Silent Empty Output

**Symptom**: A custom block in the workspace produces empty output when `workspaceToCode` is called. No error is thrown.

**Cause**: The block definition was registered (`defineBlocks`) but the code generator was not assigned (`javascriptGenerator.forBlock['type']` was never set). Blockly silently skips blocks with no generator and emits a warning to the console, but does not throw.

**Fix**: Always register both the block definition AND the generator before calling `workspaceToCode`. Use a pattern where they are co-located:
```typescript
// After defining the block:
javascriptGenerator.forBlock['my_block'] = myBlockGenerator;
```
Check the browser console for `"Unknown block: my_block_type"` warnings during development.

**Evidence**: Official sample pattern in `google/blockly-samples/examples/sample-app-ts/src/index.ts` — `Object.assign(javascriptGenerator.forBlock, forBlock)` is called before any code generation.

---

## 10. Vite / ESBuild: "The requested module does not provide an export named 'default'"

**Symptom**: When using Vite without Webpack, importing Blockly throws: `SyntaxError: The requested module './index.js' does not provide an export named 'default'`.

**Cause**: The `.mjs` ESM entry points wrap the CJS UMD bundle. The UMD file uses `module.exports = ...` which some bundlers (or native browser ESM) cannot resolve as a default export.

**Fix for Vite**: Add Blockly to `optimizeDeps.include` in `vite.config.js`:
```js
export default {
  optimizeDeps: {
    include: ['blockly', 'blockly/core', 'blockly/blocks', 'blockly/javascript']
  }
}
```
Vite pre-bundles these with esbuild in CJS compatibility mode.

**Evidence**: GitHub issue #8170 ("Publish real ESM modules usable by browser") — closed as completed in May 2024 when `.mjs` wrappers were added, but the underlying bundles are still UMD. The Vite fix is community-documented. Confidence: medium (not in official docs).

---

## 11. `workspaceToCode` During Drag Returns Incomplete Code

**Symptom**: Generated code is missing blocks or contains syntax errors when blocks are being dragged.

**Cause**: During a drag operation, Blockly creates "insertion marker" blocks that are not real blocks. Generating code during this state traverses a partially-valid block tree.

**Fix**: Guard with `ws.isDragging()`:
```typescript
if (ws.isDragging()) return;
const code = javascriptGenerator.workspaceToCode(ws);
```

**Evidence**: `google/blockly-samples/examples/sample-app-ts/src/index.ts` — explicit `ws.isDragging()` check in the change listener.
