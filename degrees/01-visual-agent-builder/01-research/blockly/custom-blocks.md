# Custom Blocks in Blockly

## Two Definition Approaches

### JSON (recommended for most blocks)

```typescript
import * as Blockly from 'blockly/core';

const greetBlock = {
  type: 'greet',
  message0: 'Greet %1',
  args0: [
    {
      type: 'input_value',
      name: 'NAME',
      check: 'String',
    },
  ],
  previousStatement: null,   // can stack below another block
  nextStatement: null,       // can stack above another block
  colour: 230,               // HSV hue, 0-360
  tooltip: 'Greet a person by name.',
  helpUrl: '',
};

// Creates BlockDefinition objects but does NOT register them yet
export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([greetBlock]);
// Register with Blockly globally:
Blockly.common.defineBlocks(blocks);
```

Or the older one-step approach:
```typescript
Blockly.common.defineBlocksWithJsonArray([greetBlock]);
```

### JavaScript `init` Function (needed for dynamic behavior)

```typescript
Blockly.Blocks['greet'] = {
  init: function() {
    this.appendValueInput('NAME')
        .setCheck('String')
        .appendField('Greet');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip('Greet a person by name.');
    this.setHelpUrl('');
  }
};
```

Use the JavaScript API when: you need runtime-computed dropdown options, conditional inputs, or `onchange` callbacks.

---

## Field Types Reference

### In JSON `args0` Array

| JSON type | Class | Key properties |
|---|---|---|
| `field_input` | `FieldTextInput` | `text` (default value), `spellcheck` |
| `field_number` | `FieldNumber` | `value`, `min`, `max`, `precision` |
| `field_dropdown` | `FieldDropdown` | `options: [[label, value], ...]` |
| `field_checkbox` | `FieldCheckbox` | `checked: true\|false` |
| `field_variable` | `FieldVariable` | `variable` (initial name), `variableTypes` |
| `field_label` | `FieldLabel` | `text` |
| `field_image` | `FieldImage` | `src`, `width`, `height`, `alt` |

### Input Types

| JSON type | Description |
|---|---|
| `input_value` | Horizontal value socket (connects to output blocks) |
| `input_statement` | Stacked statement slot (connects to statement blocks) |
| `input_dummy` | No connection point; just groups fields on a row |

**Evidence**: `/tmp/package/core/blockly.d.ts` (field class imports), `/tmp/package/core/inputs/` directory listing.

---

## Connection Types and Shapes

```
output + no prev/next    →  Reporter shape (round/diamond peg)
prev/next only           →  Statement shape (notched top/bottom)
```

In JSON:
```json
// Statement block (can stack):
{ "previousStatement": null, "nextStatement": null }

// Value block (produces a value, cannot stack):
{ "output": "String" }  // or "Number", "Boolean", null (any type)

// Statement that only starts a stack (no previousStatement):
{ "nextStatement": null }
```

`null` means any type is accepted. A string like `"String"` or `"Number"` restricts connections to same-typed outputs.

Connection types can also be arrays: `"check": ["String", "Number"]` accepts either type.

---

## Block Colours

Set with `colour` (note: British spelling in the API). Accepts:
- Integer HSV hue 0-360: `colour: 230`
- Hex string: `colour: '#4a90d9'` (v10+)
- Theme-defined style name: via `style: 'logic_blocks'`

Using theme styles makes blocks respect the active theme's color scheme, which is preferred for user-facing apps.

---

## Complete "Greet" Block Example

### Block Definition

```typescript
// src/blocks/greet.ts
import * as Blockly from 'blockly/core';

const greetBlockJson = {
  type: 'greet',
  message0: 'Greet %1 with message %2',
  args0: [
    {
      type: 'input_value',
      name: 'NAME',
      check: 'String',
    },
    {
      type: 'input_value',
      name: 'MESSAGE',
      check: 'String',
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 230,
  tooltip: 'Greet a person by name with a custom message.',
  helpUrl: '',
};

export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([greetBlockJson]);
```

### Code Generator

```typescript
// src/generators/javascript.ts
import { Order } from 'blockly/javascript';
import type { Block } from 'blockly/core';
import type { JavascriptGenerator } from 'blockly/javascript';

export const forBlock: Record<string, (block: Block, generator: JavascriptGenerator) => string> = {};

forBlock['greet'] = function(block: Block, generator: JavascriptGenerator): string {
  const name = generator.valueToCode(block, 'NAME', Order.NONE) || "'World'";
  const message = generator.valueToCode(block, 'MESSAGE', Order.NONE) || "'Hello'";
  // Emit a console.log for the greeting
  return `console.log(${message} + ', ' + ${name} + '!');\n`;
};
```

### Registration (in main entry point)

```typescript
// src/index.ts
import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import { blocks } from './blocks/greet';
import { forBlock } from './generators/javascript';

// Register block definitions
Blockly.common.defineBlocks(blocks);
// Register code generators
Object.assign(javascriptGenerator.forBlock, forBlock);
```

### Toolbox Entry

```typescript
export const toolbox = {
  kind: 'flyoutToolbox',
  contents: [
    {
      kind: 'block',
      type: 'greet',
      inputs: {
        NAME: {
          shadow: {
            type: 'text',
            fields: { TEXT: 'Alice' },
          },
        },
        MESSAGE: {
          shadow: {
            type: 'text',
            fields: { TEXT: 'Hello' },
          },
        },
      },
    },
  ],
};
```

The `inputs.NAME.shadow` provides a default value visible in the toolbox entry. When the user drags the block, the shadow blocks appear pre-filled.

---

## Categories Toolbox Example

```typescript
export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Greetings',
      colour: '230',   // can be a string here
      contents: [
        {
          kind: 'block',
          type: 'greet',
        },
      ],
    },
    {
      kind: 'sep',     // horizontal separator
    },
    {
      kind: 'category',
      name: 'Logic',
      categorystyle: 'logic_category',   // uses theme-defined style
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',   // built-in dynamic category
    },
  ],
};
```

**Evidence**: `google/blockly-samples/examples/sample-app-ts/src/toolbox.ts`, developers.google.com/blockly/guides/configure/web/toolbox.

---

## Field Validators

Validators intercept field value changes and can reject or transform them:

```typescript
Blockly.Blocks['positive_number'] = {
  init: function() {
    const field = new Blockly.FieldNumber(1, 0, Infinity);
    // Validator: reject values <= 0
    field.setValidator((newValue) => {
      if (newValue <= 0) return null; // null = reject
      return newValue;                // return corrected value or accept as-is
    });
    this.appendDummyInput().appendField(field, 'NUM');
    this.setOutput(true, 'Number');
    this.setColour(230);
  }
};
```

**Warning**: If a validator returns `undefined` (not `null`), the field silently accepts the invalid value. `null` is the rejection signal. See `known-failure-modes.md`.

---

## Toolbox Update After Injection

If you need to change the toolbox after the workspace is mounted:

```typescript
workspace.updateToolbox(newToolboxDefinition);
```

This re-renders the toolbox categories and flyout. Note: changing the toolbox does NOT affect blocks already in the workspace.
