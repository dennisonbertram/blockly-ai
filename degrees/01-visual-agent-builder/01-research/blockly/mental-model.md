# Blockly Mental Model

This document synthesizes the conceptual model an LLM agent needs to reason about Blockly correctly — going beyond what the quickstart shows.

---

## The Two-Layer Architecture

Blockly has two distinct layers that are deliberately decoupled:

**Layer 1 — Block Definitions** (visual + behavioral shape)
- Defined once, globally, via `Blockly.common.defineBlocksWithJsonArray(...)` or `Blockly.Blocks['type'] = { init() {...} }`.
- Controls what the block looks like, what inputs/fields it has, and what connections it accepts.
- Has NO knowledge of what code it produces.

**Layer 2 — Code Generators** (per-language output)
- Defined per language on the generator object: `javascriptGenerator.forBlock['type'] = fn`.
- Has NO knowledge of what the block looks like.
- Can access block field values and recursively generate code for child blocks.

This means: you can define a block, show it in the toolbox, let users drag it onto the workspace, and serialize/deserialize the workspace — ALL WITHOUT a code generator. The generator is only needed when you call `workspaceToCode`.

**Implication for agent building**: if an LLM is generating block definitions for an AI agent tool palette, it can define blocks that map to LLM API calls or tool invocations. The generator layer then translates those visual constructs into actual runnable JS that calls the tools.

---

## The Workspace Is Canonical State

Think of the workspace as a **live document**. It contains:
- A forest of `Block` trees (not necessarily a single tree — there can be many independent top-level blocks).
- A variable map (variables are workspace-level, not block-level).
- An undo stack.
- A set of change listeners.

The workspace is NOT a React component or a Redux store. It has its own internal state management. You interact with it imperatively. If you want React state to mirror the workspace, you must write a change listener that reads from the workspace and updates React state.

**Critical**: The workspace state is not derived from your React state. The authoritative source of block structure is the workspace object itself.

---

## The Block Tree and Code Generation

Blocks form a tree via connections. There are two tree shapes:

**Statement stack** (vertical chain):
```
[block A]  ← previousStatement / nextStatement
[block B]
[block C]
```
Code generator traverses: A then B then C, concatenating strings. The `scrub_` method on the generator handles appending the next-block's code after each block's own code.

**Value tree** (nested inputs):
```
[outer block]
   └── VALUE input → [inner block]
```
The outer generator calls `generator.valueToCode(block, 'VALUE', Order.X)` which recursively invokes the inner block's generator and returns its string, possibly wrapped in parentheses.

A **statement input** (`input_statement`) contains a stack of statement blocks:
```
[if block]
   └── DO input → [statement block 1]
                  [statement block 2]
```
The generator calls `generator.statementToCode(block, 'DO')` which traverses the attached stack.

---

## Connection Types and Block Shape

A block's shape is determined by which connections it declares. The two "modes" are mutually exclusive:

| Mode | Connections | Typical use |
|---|---|---|
| **Statement block** | `previousStatement` + `nextStatement` (or either alone) | Actions: if/else, loops, assignments, function calls |
| **Value/expression block** | `output` | Values: numbers, strings, boolean expressions, computed results |

You cannot have both `output` and `previousStatement`/`nextStatement` on the same block. This mirrors how most languages distinguish statements from expressions.

---

## The `scrub_` Method

`scrub_(block, code, thisOnly?)` is an internal method called by the code generator for every block. Its job is to:
1. Append any comments associated with the block.
2. If `thisOnly` is false (the default), call the **next block's** generator and append that code.

This is how statement chains produce sequential code — each block only generates its own code string, and `scrub_` chains them together. You rarely override `scrub_`, but knowing it exists explains why statement generators just return a string (not a list).

**Evidence**: `/tmp/package/generators/javascript/javascript_generator.d.ts` — `scrub_(block, code, thisOnly?)`.

---

## Operator Precedence in Value Generators

When value blocks return `[code, Order]`, the `Order` enum encodes JavaScript operator precedence. Lower numbers = stronger binding.

The system works like this:
- **Outer block** asks for inner block's code with `valueToCode(block, input, outerOrder)` — passing the precedence of the strongest operator acting on the child's output.
- **Inner block** returns `[code, innerOrder]` — declaring the weakest operator within its own code.
- If `outerOrder < innerOrder` (outer is stronger), Blockly wraps the inner code in parentheses.

Practical rules:
- Literal/atomic value (number, string) → return `Order.ATOMIC` (0).
- When in doubt → pass `Order.NONE` (99) to `valueToCode` and return `Order.NONE` from your generator. This forces parentheses always and is always safe, just verbose.

**Evidence**: `javascript_generator.d.ts` (Order enum), developers.google.com/blockly/guides/create-custom-blocks/operator-precedence.

---

## When Does a Block Need a Mutator?

A mutator is needed when:
1. The block has a **dynamic number of inputs** (e.g., a function call with variable arity, a list with N items).
2. That structural variation must survive **serialization and deserialization**.

A mutator is NOT needed when:
- A dropdown field drives a different block appearance — if the dropdown value is already serialized as a field value, `loadExtraState` can reconstruct the shape from that field alone.
- The block shape is fixed at definition time.

The critical distinction: mutators exist to serialize structural state that is NOT already captured by field values.

**Evidence**: developers.google.com/blockly/guides/create-custom-blocks/mutators — "changing the shape of your block does not necessarily mean you need extra serialization."

---

## Extensions vs Mutators

| | Extension | Mutator |
|---|---|---|
| Purpose | Add behavior/lifecycle hooks (e.g., onchange, tooltips) | Add shape-changing + serialization |
| Per block | Multiple allowed | Only one allowed |
| UI | None by default | Optional mini-workspace bubble |
| Register | `Blockly.Extensions.register(name, fn)` | `Blockly.Extensions.registerMutator(name, mixin, helperFn?, blockList?)` |

---

## Shadow Blocks vs Real Blocks

Shadow blocks appear in toolbox entries as pre-filled values. In the toolbox JSON, they use `shadow` instead of `block`:
```js
inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } }
```
A shadow block is replaced when the user drags a real block onto the input, but remains visible when the input is empty. They are NOT serialized in the workspace state by default — only real blocks are.

---

## The Serialization State Machine

The JSON workspace state returned by `Blockly.serialization.workspaces.save(ws)` looks like:
```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "controls_if",
        "id": "abc123",
        "x": 100,
        "y": 80,
        "inputs": {
          "IF0": { "block": { "type": "logic_boolean", "fields": { "BOOL": "TRUE" } } },
          "DO0": { "block": { "type": "text_print", ... } }
        },
        "extraState": { "elseIfCount": 1 }
      }
    ]
  },
  "variables": [{ "name": "myVar", "id": "xyz789" }]
}
```

The state is a **plain JS object** (not a string). Call `JSON.stringify` yourself if you need a string. Call `JSON.parse` yourself before `load`.

**Evidence**: `serialization.ts` in google/blockly-samples; `/tmp/package/core/serialization/workspaces.d.ts`.

---

## How Blockly's Events Fire During Programmatic Changes

This is a critical gotcha. When you load state programmatically (`serialization.workspaces.load`), events fire for every block creation. If you have a change listener that triggers code generation, you'll generate code multiple times during loading — with partially-constructed workspace state.

The correct pattern (from official samples):
```js
Blockly.Events.disable();
Blockly.serialization.workspaces.load(state, workspace);
Blockly.Events.enable();
```

Also: skip events with type `FINISHED_LOADING` and `isUiEvent` in your generation listener.

**Evidence**: `serialization.ts` from `google/blockly-samples/examples/sample-app-ts/src/`, `index.ts` from same — `if (e.isUiEvent || e.type == Blockly.Events.FINISHED_LOADING || ws.isDragging()) return;`.
