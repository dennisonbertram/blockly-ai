# Open Questions

Questions that could not be definitively answered from available sources and would need to be validated during POC work.

---

## 1. Async Code Generation Pattern

**Question**: What is the correct pattern for generating and executing async/await code from Blockly blocks in a way that works end-to-end (generation + execution)?

**Why it matters**: For an AI agent builder where blocks call LLM APIs or async tools, the generated code will contain `await` expressions. The built-in JavaScript generator produces ES5; there is no official async pattern. Wrapping all generated code in `(async () => { ... })()` seems obvious but may interact poorly with variable declarations that `finish()` prepends.

**Where to validate**: Build a minimal POC with a custom "call LLM" block that emits `await fetch(...)`. Test whether `finish()` + async wrapper produces valid JavaScript. Also test execution in JS-Interpreter (which does NOT support async/await) vs. Worker vs. eval.

---

## 2. Vite Integration Stability

**Question**: What is the exact Vite configuration needed for Blockly to work reliably, without the "does not provide an export named 'default'" error?

**Why it matters**: Many AI/Next.js projects use Vite or Next.js (which uses SWC/Turbopack). Official Blockly samples only use Webpack 5. Community workarounds for Vite exist but are not in official docs.

**Where to validate**: Create a minimal Vite + Blockly project and confirm which `optimizeDeps` and `resolve.alias` settings are needed. Check if the issue varies between Vite 4 and Vite 5.

---

## 3. Headless Code Generation in Node.js (No jsdom)

**Question**: Can `workspaceToCode` be called on a headless `Workspace` in Node.js without needing jsdom (for purely programmatic use — no SVG, no XML parsing)?

**Why it matters**: For server-side AI agent planning, we may want to store workspace state (JSON) server-side and regenerate code from it on the server without the jsdom overhead. The `blockly/core` import currently triggers jsdom bootstrapping, which adds significant startup time.

**Where to validate**: Measure startup time and memory of `require('blockly/core')` in a Node.js 18 process. Check whether jsdom is actually needed for headless `Workspace` + JSON serialization + code generation (vs. only needed for XML parsing).

---

## 4. Shadow DOM / Web Component Integration

**Question**: Blockly v13 beta added "shadow DOM support" — is this usable in a production Web Components architecture, and what caveats remain?

**Why it matters**: If the agent builder UI is embedded in a web component (e.g., inside a design tool), Blockly needs to work inside a shadow DOM.

**Where to validate**: After v13 ships, test `Blockly.inject` with a host element inside a shadow root. Check CSS injection behavior (Blockly injects its CSS into `document.head` — does this work inside shadow DOM?).

---

## 5. Custom Renderer Stability

**Question**: How stable are custom renderers in v12/v13? Can a team reliably build and maintain a custom Zelos-based renderer with modified connection shapes for AI agent blocks?

**Why it matters**: For the visual agent builder, we may want custom block shapes that look different from standard Blockly blocks (e.g., diamond shapes for LLM decision blocks, hexagonal shapes for parallel execution).

**Where to validate**: Try inheriting from `Blockly.blockRendering.Renderer` and `Blockly.blockRendering.ConstantProvider`. Check if the v12 CSS class renames broke any custom renderer tutorials.

---

## 6. Undo/Redo API for Host Application

**Question**: Can the host application (React component) observe undo stack state changes to enable/disable undo/redo buttons?

**Why it matters**: A standard visual editor should expose undo/redo UI. The workspace has `ws.undo(redo: boolean)` for programmatic undo, but there is no documented event for "undo stack changed."

**Where to validate**: Check whether `BLOCK_CREATE`, `BLOCK_DELETE` etc. fire after `ws.undo()` and whether the host can derive stack state from event history, or if `ws.undoStack_.length` (private API) must be accessed directly.

---

## 7. Procedure/Function Block Interaction with Custom Generators

**Question**: Do the built-in `procedures_defnoreturn`/`procedures_callnoreturn` blocks work correctly with the JavaScript generator when combined with custom statement blocks inside procedure bodies?

**Why it matters**: AI agent workflows may need user-defined procedures (sub-agents). The built-in procedure blocks add procedure definitions to the generated code's header. Testing that custom blocks inside procedure bodies generate correctly requires end-to-end testing.

**Where to validate**: Build a test workspace with a procedure block containing a custom block, generate JavaScript, and verify the output is syntactically correct and semantically correct.

---

## 8. Exact Bundle Size Impact

**Question**: What is the actual gzipped bundle size of a minimal Blockly integration (core only, no built-in blocks) vs. full Blockly (core + blocks)?

**Why it matters**: For the agent builder, we likely do NOT need the 80+ built-in blocks (math, text, lists). Using only `blockly/core` with custom blocks only should significantly reduce bundle size.

**Where to validate**: Instrument a Webpack 5 build with `webpack-bundle-analyzer`. Measure: `blockly/core` alone vs. `blockly` (core + blocks + locale). Also measure with Vite's chunking.

---

## 9. Block Type Hot-Reload

**Question**: Is there any supported way to add new custom block types to a running workspace without requiring a full page reload?

**Why it matters**: An AI agent builder might dynamically generate new block types at runtime (e.g., as new tool definitions are discovered). The current API (`defineBlocks`) adds to a global registry, but there is no `undefineBlock` or clean re-injection mechanism.

**Where to validate**: Test calling `Blockly.common.defineBlocks(newBlocks)` at runtime after the workspace is already injected. Check whether new block types appear in an updated toolbox. Test whether calling `defineBlocks` with an existing type name throws or silently overwrites.

---

## 10. Concurrent Workspace Instances

**Question**: Can multiple `WorkspaceSvg` instances coexist on the same page (e.g., a main workspace and a preview workspace)?

**Why it matters**: The agent builder may want a split-view: user edits blocks on the left, a read-only generated-code preview on the right, or a secondary workspace for sub-workflow editing.

**Where to validate**: Test mounting two `Blockly.inject` calls on the same page with different container elements. Check event isolation (events from workspace A should not trigger listeners on workspace B). Check that `Blockly.getMainWorkspace()` returns the last-focused workspace, not always the first one.
