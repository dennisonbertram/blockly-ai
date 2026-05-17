# Blockly Serialization

## Two Formats

### JSON (Recommended — v11+)

API: `Blockly.serialization.workspaces.save(workspace)` and `Blockly.serialization.workspaces.load(state, workspace)`.

- Returns a **plain JS object** (not a string). Stringify yourself with `JSON.stringify`.
- Introduced in Blockly v6, recommended as the default since v11.
- More stable than XML: field values are explicit, not attribute strings.
- Supports `extraState` for mutator state (clean, typed JSON).

### XML (Legacy — Still Supported)

API: `Blockly.Xml.workspaceToDom(workspace)` and `Blockly.Xml.domToWorkspace(dom, workspace)`.

- Returns a DOM Element. Use `Blockly.utils.xml.domToText(dom)` to get a string.
- Older format; most tutorials and StackOverflow answers reference it.
- Mutator state stored as `<mutation ...>` child elements.
- XML attributes are all strings — type information is implicit.

**Do NOT mix formats** for the same workspace state. Pick one and stick with it.

**Evidence**: `google/blockly-samples/examples/sample-app-ts/src/serialization.ts` (uses JSON API), `/tmp/package/core/serialization/workspaces.d.ts` (function signatures), `/tmp/package/core/serialization.d.ts` (module re-exports).

---

## JSON Format in Detail

A workspace saved with `Blockly.serialization.workspaces.save(ws)` produces:

```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "controls_if",
        "id": "blockId123",
        "x": 150,
        "y": 100,
        "extraState": {
          "elseIfCount": 1,
          "hasElse": true
        },
        "inputs": {
          "IF0": {
            "block": {
              "type": "logic_boolean",
              "id": "blockId456",
              "fields": {
                "BOOL": "TRUE"
              }
            }
          },
          "DO0": {
            "block": {
              "type": "text_print",
              "id": "blockId789",
              "inputs": {
                "TEXT": {
                  "shadow": {
                    "type": "text",
                    "id": "blockId012",
                    "fields": { "TEXT": "" }
                  }
                }
              }
            }
          }
        }
      }
    ]
  },
  "variables": [
    {
      "name": "myVariable",
      "id": "varId123",
      "type": ""
    }
  ]
}
```

Key structure notes:
- `blocks.blocks` is an array of **top-level** blocks only. Nested blocks appear recursively in `inputs[name].block`.
- Shadow blocks are under `inputs[name].shadow`, not `inputs[name].block`.
- `extraState` appears only if the block has a mutator that returns non-null from `saveExtraState`.
- Block `id` values are strings; they are preserved on load.
- `x`/`y` are only present on top-level blocks.

---

## Save/Load API

```typescript
import * as Blockly from 'blockly/core';

// Save
const state = Blockly.serialization.workspaces.save(workspace);
localStorage.setItem('blocklyState', JSON.stringify(state));

// Load (suppress events during load to avoid partial state generation)
const saved = localStorage.getItem('blocklyState');
if (saved) {
  Blockly.Events.disable();
  Blockly.serialization.workspaces.load(
    JSON.parse(saved),
    workspace,
    { recordUndo: false }   // optional: don't push load onto undo stack
  );
  Blockly.Events.enable();
}
```

**Critical**: Suppressing events during load (`Blockly.Events.disable()`) prevents change listeners from firing on every block creation. Without this, a code-generation listener will run N times with partially-loaded workspace state.

**Evidence**: `google/blockly-samples/examples/sample-app-ts/src/serialization.ts` (official sample), `/tmp/package/core/serialization/workspaces.d.ts` (load signature with `{ recordUndo? }` option).

---

## Migration: XML to JSON

There is no built-in migration function. The approach:
1. Load the existing XML into a temporary workspace with `Blockly.Xml.domToWorkspace`.
2. Save that workspace as JSON with `Blockly.serialization.workspaces.save`.
3. Discard the old XML format.

If the workspace uses custom mutators with `mutationToDom`/`domToMutation`, those must also be updated to `saveExtraState`/`loadExtraState` before migration, or the mutator state will be lost.

---

## Forward Compatibility

Blockly does NOT guarantee forward compatibility of serialized state. Loading a state saved with v12 blocks into a v11 runtime may fail if v12 introduced new block types or changed the schema.

**Recommendation for POCs**: store the Blockly version alongside the saved state:

```json
{
  "blocklyVersion": "12.5.1",
  "state": { ... }
}
```

And validate the version before loading. If versions mismatch, warn the user rather than silently loading possibly-incompatible state.

---

## Block-Level Serialization (`saveExtraState` / `loadExtraState`)

For custom blocks with mutators:

```typescript
Blockly.Blocks['my_list'] = {
  init: function() {
    this.itemCount_ = 3;
    this.updateShape_();
    this.setMutator(new Blockly.icons.MutatorIcon(['my_list_item'], this));
  },
  saveExtraState: function() {
    // Return null when block is in default state (omits extraState from JSON)
    if (this.itemCount_ === 3) return null;
    return { itemCount: this.itemCount_ };
  },
  loadExtraState: function(state: { itemCount: number }) {
    this.itemCount_ = state.itemCount;
    this.updateShape_();
  },
  updateShape_: function() {
    // add/remove inputs based on this.itemCount_
  }
};
```

The `doFullSerialization` parameter on `saveExtraState` is set to `true` during single-block copy-paste operations, signaling that the block should inline all state rather than reference external data.

**Evidence**: developers.google.com/blockly/guides/create-custom-blocks/mutators — `saveExtraState`/`loadExtraState` section, `/tmp/package/core/block.d.ts` — `saveExtraState?: (doFullSerialization?: boolean) => any`.

---

## Serialization of Variables

Variables are workspace-level, not block-level. They appear in the top-level `variables` array. If you delete all blocks that reference a variable, the variable may or may not be removed from the variables list depending on workspace settings.

A `FieldVariable` field stores the variable's **ID**, not its name. The name is looked up from the workspace's variable map. This is important for serialization: the `variables` array must include every variable referenced by field values in the blocks array.
