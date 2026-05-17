# Reference: Blockly Code Generator Cheatsheet

**Blockly version:** `12.5.1`

---

## Block Types: Statement vs Expression

### Statement Block

Emits standalone code (a line or sequence of lines). Has previous/next statement connections.

```ts
Blockly.Blocks['my_statement'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('Do something')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
  },
}

javascriptGenerator.forBlock['my_statement'] = function (
  block: Block,
  _generator: JavascriptGenerator
): string {
  return `doSomething();\n`   // statement: return a string (no tuple)
}
```

### Expression Block (Value Block)

Emits a value that can be embedded in another block's output. Has an output connection.

```ts
Blockly.Blocks['my_expression'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('Some value')
    this.setOutput(true, null)       // output connection instead of statement
    this.setColour(120)
  },
}

javascriptGenerator.forBlock['my_expression'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, Order] {              // expression: MUST return a tuple
  const code = `'hello'`
  return [code, Order.ATOMIC]
}
```

**Critical:** Expression generators MUST return `[code, Order]`. Returning a plain string causes the block to be silently ignored in the parent's output.

---

## Reading Block Fields

```ts
// Text input
const name = block.getFieldValue('NAME') as string

// Dropdown
const type = block.getFieldValue('TYPE') as string

// Checkbox
const isChecked = block.getFieldValue('IS_OPTIONAL') === 'TRUE'

// Getting a connected value block's code
const valueCode = generator.valueToCode(block, 'VALUE', Order.ATOMIC)
```

## Reading Connected Statements

```ts
// Get the code from connected statement blocks
const bodyCode = generator.statementToCode(block, 'BODY')
```

---

## Loading a Workspace in Tests

Always wrap load/save calls in `Events.disable()`/`Events.enable()` to suppress change events during programmatic load:

```ts
Blockly.Events.disable()
Blockly.serialization.workspaces.load(fixtureJson, workspace)
Blockly.Events.enable()
```

Failing to disable events causes spurious change events during the load, which can trigger listeners that assume the workspace is in a valid post-edit state.

---

## Fixture JSON Format

```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "ai_generate_text",
        "inputs": {
          "MODEL": {
            "block": {
              "type": "ai_model",
              "fields": {
                "PROVIDER": "anthropic",
                "NAME": "claude-haiku-4-5"
              }
            }
          }
        }
      }
    ]
  }
}
```

The `type` field must match the block's registered type exactly (case-sensitive).

---

## Common Patterns in This Codebase

### Model Block (expression)

```ts
// Emits: (__model_provider ?? anthropic('claude-haiku-4-5'))
return [`(__model_provider ?? ${provider}('${name}'))`, Order.FUNCTION_CALL]
```

### GenerateText Block (statement)

```ts
// Emits: __sink?.('output', (await generateText({ model: ..., prompt: ... })).text);
return `__sink?.('output', (await generateText({ model: ${modelCode}, prompt: ${promptCode} })).text);\n`
```

### Tool Block (expression)

```ts
// Emits: tool({ description: '...', inputSchema: z.object({...}), execute: async (input) => { ... } })
return [`tool({\n  description: '${desc}',\n  inputSchema: ${schema},\n  execute: async (input) => {\n${body}  },\n})`, Order.FUNCTION_CALL]
```

---

## Block Registration Pattern

Block modules register via side effects. They must be imported (not just bundled) in both the test file and the route handler:

```ts
// test/codegen.test.ts
import '../src/blocks/generate-text'    // side-effect import
import '../src/blocks/model'

// app/api/run/route.ts
import 'lib/blocks/generate-text'
import 'lib/blocks/model'
```

If a block type is not registered when `workspaceToCode` runs, it silently emits an empty string for that block.

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Lab 01: Write a Greet Block](../labs/lab-01-write-a-greet-block.md)
- [Reference: Block Catalog](block-catalog.md)
- [Back to Index](../index.md)
