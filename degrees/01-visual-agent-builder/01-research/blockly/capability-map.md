# Blockly Capability Map

**Evidence sources**: npm package `blockly@12.5.1` type definitions (inspected from unpacked tgz), official Blockly docs at developers.google.com/blockly, GitHub issues at github.com/google/blockly.

---

## What Blockly IS

Blockly is a **browser-side JavaScript library** that renders a drag-and-drop block editing surface inside a DOM element, and provides APIs to convert the resulting block graph into strings of code (JavaScript, Python, Dart, Lua, PHP, or any custom language).

Architecturally it is "a fancy string builder with a visual editor in front of it." The library owns rendering, user interaction, and the block graph data model. What happens with the generated code string is entirely the application's responsibility.

**Evidence**: developers.google.com/blockly/guides/overview — "You define the string (usually code) that gets generated for each block, and then Blockly handles concatenating whole strings of blocks."

---

## Major Modules

### 1. Workspace (`Blockly.Workspace` / `Blockly.WorkspaceSvg`)

- `Workspace` — headless base class; holds the block tree, variable map, undo stack, and change listeners. Can be instantiated in Node.js.
- `WorkspaceSvg` — extends `Workspace` with SVG rendering, toolbox, scrollbars, drag handling.
- `inject(container, options)` — mounts a `WorkspaceSvg` into a DOM element; returns the workspace.
- `ws.addChangeListener(fn)` / `ws.removeChangeListener(fn)` — event subscription.
- `ws.isDragging()` — guard for code generation (do not generate during drags).
- `ws.dispose()` — cleanup; must be called when unmounting.
- `ws.resize()` / `ws.resizeContents()` — recalculate layout after container resizes.
- `ws.clear()` — removes all blocks from the workspace.
- `MAX_UNDO` — integer; 0 = undo off, Infinity = unlimited.

**Limits**: `WorkspaceSvg` requires a real DOM (or jsdom). For Node.js headless use, import from `blockly/core` (which triggers the jsdom polyfill in `core-node.js`).

**Evidence**: `/tmp/package/core/workspace.d.ts`, `/tmp/package/core/workspace_svg.d.ts`, `/tmp/package/core/inject.d.ts`, `/tmp/package/core-node.js`.

### 2. Toolbox

Two types:
- **Flyout toolbox** — single flat list of blocks, always visible.
- **Category toolbox** — multiple categories with collapsible groups.

Defined as a JSON object (`ToolboxDefinition`) or XML string. JSON format (preferred since September 2020):

```js
{
  kind: 'categoryToolbox',  // or 'flyoutToolbox'
  contents: [
    {
      kind: 'category',
      name: 'Logic',
      categorystyle: 'logic_category',
      contents: [{ kind: 'block', type: 'controls_if' }]
    },
    { kind: 'sep' },
    { kind: 'category', name: 'Variables', custom: 'VARIABLE' }
  ]
}
```

Supports: nested categories, dynamic categories (`custom: 'VARIABLE'`, `custom: 'PROCEDURE'`), separators (`kind: 'sep'`), buttons and labels, preset block field values, shadow blocks.

**Limits**: Toolbox changes after injection require calling `ws.updateToolbox(newDefinition)`. Dynamic categories must register a flyout population function.

**Evidence**: `toolbox.ts` in `google/blockly-samples/examples/sample-app-ts/src/toolbox.ts`, developers.google.com/blockly/guides/configure/web/toolbox.

### 3. Blocks

Blocks are defined via:
- **JSON** — `Blockly.common.defineBlocksWithJsonArray([...])` or `Blockly.common.createBlockDefinitionsFromJsonArray([...])` + `Blockly.common.defineBlocks(blocks)`.
- **JavaScript** — `Blockly.Blocks['type'] = { init() { ... } }`.

Block definition controls: inputs, fields, connections, colour, tooltip, helpUrl, extensions, mutator.

**Connection types** (from `ConnectionType` enum):
- `INPUT_VALUE = 1` — value input socket (horizontal plug)
- `OUTPUT_VALUE = 2` — value output plug
- `NEXT_STATEMENT = 3` — bottom notch (for stacking)
- `PREVIOUS_STATEMENT = 4` — top notch (for stacking)

A block with `output` cannot have `previousStatement`/`nextStatement` and vice versa (the two shapes are mutually exclusive).

**Evidence**: `/tmp/package/core/connection_type.d.ts`, developers.google.com/blockly/guides/create-custom-blocks/define-blocks.

### 4. Fields

Built-in field types (all registered in the core):
- `field_input` / `FieldTextInput` — plain text input
- `field_number` / `FieldNumber` — numeric input with optional min/max/precision
- `field_dropdown` / `FieldDropdown` — dropdown with static or dynamic options; options can now be `HTMLElement` (new in v12)
- `field_checkbox` / `FieldCheckbox` — boolean toggle
- `field_variable` / `FieldVariable` — variable selector
- `field_label` / `FieldLabel` — non-editable text
- `field_image` / `FieldImage` — inline image

Plugin fields (separate npm packages, not bundled): `field_angle`, `field_colour`, `field_date`, `field_bitmap`, `field_slider`, `field_multilineinput`.

Field validators are functions that run on every value change and can return a corrected value or `null` to reject. **Silent failure risk**: a validator returning `undefined` (instead of `null`) causes the field to accept the invalid value — a known gotcha.

**Evidence**: `/tmp/package/core/field_textinput.d.ts`, `/tmp/package/core/field_number.d.ts`, `/tmp/package/core/field_dropdown.d.ts`, `/tmp/package/core/blockly.d.ts`.

### 5. Mutators

Mutators allow a block to **change its own shape** at runtime and persist that extra state across serialization. They require:
- `saveExtraState() → object | null` — serializes extra state to JSON-compatible object.
- `loadExtraState(state)` — restores shape from saved state.
- Optionally `compose(topBlock)` + `decompose(workspace)` — provide a mini-workspace UI for the user to reconfigure the block.

Registered via `Blockly.Extensions.registerMutator(name, mixinObj, helperFn?, blockList?)`. Referenced in block JSON as `"mutator": "my_mutator_name"`. One block can only have one mutator.

Legacy: `mutationToDom()` / `domToMutation()` use XML; `saveExtraState`/`loadExtraState` use JSON. Prefer JSON for new code.

**Evidence**: `/tmp/package/core/extensions.d.ts`, `/tmp/package/core/icons/mutator_icon.d.ts`, developers.google.com/blockly/guides/create-custom-blocks/mutators.

### 6. Code Generators

- `javascriptGenerator` (from `blockly/javascript`) — produces JavaScript ES5 strings.
- Also: `pythonGenerator`, `dartGenerator`, `luaGenerator`, `phpGenerator`.
- Generators are decoupled from block definitions — you can have a block with no generator, or a generator for a block from another package.
- `javascriptGenerator.workspaceToCode(workspace)` — traverses all top-level blocks and returns the concatenated code string.
- `javascriptGenerator.forBlock['type'] = function(block, generator) { ... }` — registers a per-block generator.
- Block generators return: `string` (statement blocks) or `[string, Order]` tuple (value/expression blocks).
- Key helper methods on `generator` (the `CodeGenerator` instance passed to each block generator): `valueToCode(block, inputName, outerOrder)`, `statementToCode(block, inputName)`, `provideFunction_(name, codeLines)`.

**Evidence**: `/tmp/package/generators/javascript/javascript_generator.d.ts`, `/tmp/package/core/generator.d.ts`, `generators/javascript.ts` in `google/blockly-samples`.

### 7. Serialization

Two supported formats:
- **JSON** (recommended, v11+): `Blockly.serialization.workspaces.save(workspace)` → plain JS object; `Blockly.serialization.workspaces.load(state, workspace)`.
- **XML** (legacy): `Blockly.Xml.workspaceToDom(workspace)` → DOM element; `Blockly.Xml.domToWorkspace(dom, workspace)`.

JSON serialization captures: blocks (type, id, position, fields, inputs, mutator `extraState`), variables.

**Evidence**: `/tmp/package/core/serialization/workspaces.d.ts`, `serialization.ts` from `google/blockly-samples`.

### 8. Events

All workspace mutations fire events. Listen with `ws.addChangeListener(fn)`. Event types include:
`BLOCK_CREATE`, `BLOCK_DELETE`, `BLOCK_CHANGE`, `BLOCK_MOVE`, `BLOCK_DRAG`, `BLOCK_FIELD_INTERMEDIATE_CHANGE`, `FINISHED_LOADING`, `VAR_CREATE`, `VAR_DELETE`, `VAR_RENAME`, `VIEWPORT_CHANGE`, `CLICK`, `SELECTED`, `THEME_CHANGE`, plus comment and toolbox events.

Events have an `isUiEvent` property — scroll/zoom/drag events are UI events that should not trigger code regeneration or workspace saves.

Suppress events during programmatic changes: `Blockly.Events.disable()` / `Blockly.Events.enable()`.

**Evidence**: `/tmp/package/core/events/events.d.ts`, `index.ts` from `google/blockly-samples/examples/sample-app-ts/src/`.

### 9. Themes

Set via `options.theme` at inject time or `ws.setTheme(theme)`. Built-in themes: `Blockly.Themes.Classic`, `Blockly.Themes.Dark`, `Blockly.Themes.Deuteranopia`, `Blockly.Themes.Highcontrast`, `Blockly.Themes.Zelos`.

Category styles like `'logic_category'` reference theme-defined category colors.

### 10. Plugins

The `@blockly/*` npm scope hosts official plugins. Plugins are self-contained modules that extend Blockly. Types: field plugins, theme plugins, renderer plugins, toolbox plugins. They register themselves via `Blockly.fieldRegistry.register()` or renderer/theme APIs.

The `options.plugins` map at inject time can override core components with plugin implementations.

### 11. Headless Mode

`Blockly.Workspace` (not `WorkspaceSvg`) can be instantiated without a DOM in Node.js, using the `blockly/core` entry point (or `require('blockly/core')` which triggers the jsdom bootstrap).

Useful for: server-side code generation from a saved workspace state, test fixtures, offline validation.

**Limitation**: Even "headless" in Node.js, Blockly uses jsdom internally for XML parsing (see `core-node.js`). This is a bundled dependency (`jsdom@26.1.0`).

**Evidence**: `/tmp/package/core-node.js`, `/tmp/package/package.json` (dependencies field).

---

## What Blockly Does NOT Do

| Capability | Status |
|---|---|
| Execute generated code | No — execution is application responsibility. Use eval (prototype only) or JS-Interpreter (production). |
| Produce async/await blocks natively | No — built-in generators produce ES5; no built-in async support. Custom generators can emit async code but precedence system still applies. |
| Render in SSR (Node.js server) | No — `WorkspaceSvg` requires real DOM or jsdom. |
| Tree-shake sub-components | Partial — the package is UMD with thin `.mjs` wrappers; true tree-shaking is not supported because the compressed bundles are monolithic. |
| Produce TypeScript | No — code generators output strings; the string language is whatever the generator targets. |
| Serialize to a diff-friendly format | Partial — JSON serialization is more stable than XML but still a full snapshot, not a patch format. |
| Hot-reload block definitions | No — block definitions are global and cannot be unregistered cleanly; workspace must be cleared/re-injected when block types change. |
| Provide undo/redo to the host app | Partial — the workspace has its own undo stack (`ws.undo(false/true)`), but there is no event for undo stack state changes. |
