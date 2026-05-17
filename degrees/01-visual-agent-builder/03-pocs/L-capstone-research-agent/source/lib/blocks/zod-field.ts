/**
 * zod-field.ts — L3
 *
 * ZodField(name, type, optional) — statement block (stacked inside ZodObject).
 *
 * Fields:
 *   NAME     — text field (field name)
 *   TYPE     — dropdown: string | number | boolean | string[]
 *   OPTIONAL — checkbox: if true, appends .nullable() (NOT .optional() — OpenAI strict mode compat)
 *
 * The generator emits one entry per field as a string of shape:
 *   "fieldName: z.string()"
 *   "fieldName: z.string().nullable()"
 *
 * The ZodObject generator iterates the statement chain to collect all field entries.
 * Each ZodField generator stores its rendered entry in a custom property on the generator
 * so the ZodObject generator can collect them via statementToCode pattern.
 *
 * Design decision: ZodField as statement block (not expression) means it can be stacked
 * vertically — this is more intuitive visually. The ZodObject generator traverses the chain
 * using generator.statementToCode() and splits entries by newline.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// ai_zod_field: ZodField(name, type, optional) — statement block (inside ZodObject)
Blockly.Blocks['ai_zod_field'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('field name:')
      .appendField(new Blockly.FieldTextInput('fieldName'), 'NAME')
      .appendField('type:')
      .appendField(
        new Blockly.FieldDropdown([
          ['string', 'string'],
          ['number', 'number'],
          ['boolean', 'boolean'],
          ['string[]', 'string[]'],
        ]),
        'TYPE'
      )
      .appendField('nullable:')
      .appendField(new Blockly.FieldCheckbox('FALSE'), 'OPTIONAL')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(290)
    this.setTooltip('Add a field to a ZodObject schema. Use nullable for OpenAI strict mode compatibility.')
    this.setHelpUrl('')
  },
}

/**
 * Map TYPE dropdown value to Zod type expression.
 */
function typeToZod(type: string): string {
  switch (type) {
    case 'string':   return 'z.string()'
    case 'number':   return 'z.number()'
    case 'boolean':  return 'z.boolean()'
    case 'string[]': return 'z.array(z.string())'
    default:         return 'z.string()'
  }
}

/**
 * ZodField generator — emits one field entry line.
 * Each entry is on its own line so the ZodObject generator can split and join them.
 * Format: "  fieldName: z.string(),"
 */
javascriptGenerator.forBlock['ai_zod_field'] = function (
  block: Block,
  _generator: JavascriptGenerator
): string {
  const name = block.getFieldValue('NAME') as string
  const type = block.getFieldValue('TYPE') as string
  const optional = block.getFieldValue('OPTIONAL') === 'TRUE'

  const escapedName = name.replace(/'/g, "\\'")
  let zodType = typeToZod(type)
  if (optional) {
    zodType += '.nullable()'
  }

  // Emit the field entry as a line, one per field
  // Use a sentinel separator that ZodObject can split on
  return `${escapedName}: ${zodType},\n`
}
