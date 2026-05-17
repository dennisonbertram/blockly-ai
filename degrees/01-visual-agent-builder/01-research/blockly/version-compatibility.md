# Blockly Version Compatibility

## Version Pin for POCs

```
blockly@12.5.1
```

**Rationale**:
- `12.5.1` is the npm `latest` tag as of 2026-05-16.
- v13 is in beta (v13.0.0-beta.4 as of 2026-05-14) with active breaking changes to the keyboard/focus system and SVG icon assets.
- v12 has been stable since its release in May 2025, with patch releases through March 2026.
- All official documentation at developers.google.com/blockly targets v12.

**Evidence**: `npm view blockly dist-tags` → `{ latest: '12.5.1', beta: '13.0.0-beta.4' }` (verified 2026-05-16). GitHub releases list confirms `blockly-v12.5.1` was published 2026-03-20.

---

## Version Timeline

| Version | Released | Status | Notes |
|---|---|---|---|
| v10.x | ~2023 | EOL | Last version before major ESM work |
| v11.x | Early 2024 | Stable | Added `.mjs` ESM wrappers, `saveExtraState`/`loadExtraState` JSON serialization |
| v11.2.2 | 2025-03-20 | Last v11 | Final v11 stable release |
| v12.0.0 | 2025-05-15 | Stable | Major accessibility + focus system rewrite |
| v12.5.1 | 2026-03-20 | **Current stable** | Latest stable; reverted a DOM structure change |
| v13.0.0-beta.4 | 2026-05-14 | Beta | Keyboard nav, shadow DOM, SVG icons, breaking |

**Evidence**: GitHub releases API (`gh api "repos/google/blockly/releases"`) listing 10 most recent releases by tag and publication date.

---

## Key Breaking Changes by Version

### v10 → v11

- ESM entry points (`.mjs` wrappers) introduced.
- `saveExtraState`/`loadExtraState` added as the preferred JSON-based mutator serialization hooks.
- `Blockly.serialization.workspaces.save/load` API promoted as the recommended serialization path.
- `defineBlocksWithJsonArray` supplemented with `createBlockDefinitionsFromJsonArray` + `defineBlocks` pattern (separates creation from registration for better testability).

**Evidence**: GitHub issue #7449 comments mentioning "v11 beta in early 2024 Q1" with ESM entry points; sample app uses v12 patterns.

### v11 → v12

Major breaking changes (from GitHub release notes for `blockly-v12.0.0`):

- **`ASTNode` class removed** — keyboard navigation completely rewritten. If you used `ASTNode`, `IASTNodeLocation`, `MarkerSvg`, or `InsertionMarkerManager`, all must be replaced.
- **`INavigable` removed** → replaced by `IFocusableNode`.
- **Focus system rewritten** — `FocusManager` introduced; workspaces, blocks, toolboxes, and connections are now focusable nodes.
- **CSS class renames** (affects custom themes):
  - `blocklyTreeRow` → no direct equivalent (restructured)
  - `blocklyEditableText` → `blocklyEditableField`
  - `blocklyNonEditableText` → `blocklyNonEditableField`
  - `blocklyFocused` → replaced by `:focus` pseudo-class
  - `blocklyMenuItemHighlight` → removed (use hover styles)
  - Icon CSS classes converted to camelCase
- **`FieldDropdown` options** can now accept `HTMLElement` (new capability, not breaking)
- **Alt+key keyboard shortcuts removed**
- **`scopeType` deprecated** in context menu options; `focusedNode` used instead
- **Dynamic toolbox categories** now use JSON instead of XML.
- **Variable-related APIs refactored**: `IVariableMap` interface, `IVariableModel`, various `WorkspaceSvg` variable methods changed.

If you wrote custom renderers, toolbox themes, or keyboard navigation using v11 APIs, most of these APIs changed in v12.

**Evidence**: developers.google.com/blockly — v12 release notes; WebFetch of GitHub release `blockly-v12.0.0`.

### v12 → v13 (Beta — Upcoming Breaking Changes)

From GitHub releases for v13.0.0-beta.0 through beta.4:

- **`ISelectable.workspace` type narrowed** from `Workspace` to `WorkspaceSvg` — affects any code implementing `ISelectable`.
- **Event dependencies on XML removed** — events no longer serialize to/from XML format internally.
- **`box-sizing: border-box` by default** — may affect custom layout/CSS.
- **SVG icon assets** — Blockly's built-in icons migrated to SVG; any icon CSS/image overrides may need updating.
- **`Block.getVars()` deprecated**.
- **Shadow DOM support** added (Blockly can now be mounted inside a web component shadow DOM).
- **Full keyboard navigation** with new shortcut system.
- **Context menu keyboard shortcuts** added.

**Evidence**: GitHub releases API output for v13.0.0-beta.0 through beta.4 (published 2026-04-08 through 2026-05-14).

---

## Deprecations to Avoid (in v12.5.1)

| Deprecated API | Replacement |
|---|---|
| `Blockly.Xml.workspaceToDom()` | `Blockly.serialization.workspaces.save()` |
| `Blockly.Xml.domToWorkspace()` | `Blockly.serialization.workspaces.load()` |
| `mutationToDom()` / `domToMutation()` | `saveExtraState()` / `loadExtraState()` |
| `Blockly.common.defineBlocksWithJsonArray()` | `createBlockDefinitionsFromJsonArray()` + `defineBlocks()` |
| `CHANGE` event constant | `BLOCK_CHANGE` |
| `CREATE` event constant | `BLOCK_CREATE` |
| `DELETE` event constant | `BLOCK_DELETE` |
| `MOVE` event constant | `BLOCK_MOVE` |
| `scopeType` in context menu options | `focusedNode` |

XML serialization APIs (`Blockly.Xml.*`) still work in v12 but are considered legacy. Do not use them in new code.

---

## Repository Ownership Change

On **2025-11-10**, Blockly's development and maintenance transferred from **Google** to the **Raspberry Pi Foundation**. The GitHub repository moved from `google/blockly` to `RaspberryPiFoundation/blockly`, though the old URL (`github.com/google/blockly`) still redirects.

The npm package name `blockly` and the documentation at `developers.google.com/blockly` remain the same for now. The `blockly-samples` repo also transferred.

**Impact for consumers**: 
- Issue tracking is now in the RaspberryPiFoundation org.
- Release cadence may change under new stewardship.
- The documentation domain may eventually move away from `developers.google.com`.

**Evidence**: developers.google.com/blockly/guides/overview — "Blockly moved to the Raspberry Pi Foundation on November 10, 2025" (banner on multiple doc pages).

---

## Node.js Version Requirement

`blockly@12.5.1` requires **Node.js >= 18**.

**Evidence**: `/tmp/package/package.json` — `"engines": { "node": ">=18" }`.
