# Lab 01 — Write a Custom Greet Block from Scratch

**Goal:** Implement a complete custom Blockly block (definition, generator, toolbox entry, and test) that emits a greeting string.

**Prerequisites:** [Lesson 01](../lessons/01-mount-blockly-safely.md), [Lesson 02](../lessons/02-emit-generate-text-v6.md)

**Time estimate:** 20–30 minutes

---

## Specification

The `ai_greet` block:
- Is a **statement block** (has previous/next statement connections).
- Has a text input field for a name.
- Emits: `__sink?.('output', 'Hello, <name>!');`

---

## Steps

### Step 1 — Write the RED test

Create `test/fixtures/greet-hello.json` (a workspace with one `ai_greet` block, name field = "World"):

```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "ai_greet",
        "fields": { "NAME": "World" }
      }
    ]
  }
}
```

Write the test:

```ts
// test/codegen.test.ts
it('ai_greet emits correct greeting', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(greetFixture, workspace)
  Blockly.Events.enable()
  const code = generate(workspace)
  expect(code).toContain("__sink?.('output', 'Hello, World!')") 
  workspace.clear()
})
```

Run `pnpm test` — confirm it fails because `ai_greet` is not defined.

### Step 2 — Define the block

```ts
// src/blocks/greet.ts
import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_greet'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Greet')
      .appendField(new Blockly.FieldTextInput('World'), 'NAME')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(200)
    this.setTooltip('Emit a greeting to the output sink.')
  },
}

javascriptGenerator.forBlock['ai_greet'] = function (
  block: Block,
  _generator: JavascriptGenerator
): string {
  const name = block.getFieldValue('NAME') as string
  const escapedName = name.replace(/'/g, "\\'")
  return `__sink?.('output', 'Hello, ${escapedName}!');\n`
}
```

### Step 3 — Import for side effects in the test file

Add at the top of `test/codegen.test.ts`:

```ts
import '../src/blocks/greet'
```

### Step 4 — Add to toolbox

In `src/toolbox.ts`, add `{ kind: 'block', type: 'ai_greet' }` to the appropriate category.

### Step 5 — GREEN

Run `pnpm test` — the test should now pass.

### Step 6 — REGRESSION commit

Add a snapshot test:

```ts
it('ai_greet fixture snapshot locked', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(greetFixture, workspace)
  Blockly.Events.enable()
  expect(generate(workspace)).toMatchSnapshot()
})
```

Run `pnpm test` once to write the snapshot. Verify the snapshot file contains the expected `__sink?.('output', 'Hello, World!')` line. Commit.

---

## Acceptance Criteria

- [ ] `pnpm test` passes with all three test phases (codegen, execution, snapshot) green.
- [ ] The emitted code contains `__sink?.('output', 'Hello, World!');`.
- [ ] The snapshot file is committed and reviewed.
- [ ] The block appears in the toolbox.

---

## Hints

- If the fixture load throws "Block type 'ai_greet' not defined" — the import for side effects is missing from the test file.
- If the generated code is empty — check that the workspace loaded correctly (the fixture JSON's `type` field must match the block's registered type exactly).
- Field text input values default to the placeholder string if the JSON doesn't specify a value.

---

## Solution Sketch

The complete implementation is modeled after the capstone's `ai_tool_call` block pattern — see `03-pocs/L-capstone-research-agent/source/lib/blocks/tool.ts` for a reference.

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [TDD Discipline](../lessons/00-tdd-discipline.md)
- [Reference: Blockly Codegen Cheatsheet](../reference/blockly-codegen-cheatsheet.md)
