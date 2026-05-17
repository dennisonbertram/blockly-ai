/**
 * zod-object.ts — L3
 *
 * ZodObject { fields } — expression block returning a Zod object schema.
 *
 * Has a statement input where ZodField blocks are stacked.
 *
 * Compiles to:
 *   z.object({ field1: z.string(), field2: z.number().nullable(), ... })
 *
 * Returns [code, Order.FUNCTION_CALL].
 *
 * Design: The generator calls statementToCode('FIELDS') which recursively runs
 * all the ZodField generators in the stack. Each ZodField emits a line like:
 *   "fieldName: z.string(),\n"
 * ZodObject joins them into the object literal body.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_zod_object'] = {
  init(this: Blockly.Block) {
    this.appendStatementInput('FIELDS')
      .setCheck(null)
      .appendField('ZodObject fields:')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(290)
    this.setTooltip('Create a Zod object schema from stacked ZodField blocks.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_zod_object'] = function (
  block: Block,
  generator: JavascriptGenerator
): [string, number] {
  // statementToCode traverses the statement chain and concatenates all field generators
  const rawFields = generator.statementToCode(block, 'FIELDS')

  // rawFields looks like: "  city: z.string(),\n  name: z.number(),\n"
  // (statementToCode adds indentation prefix per line)
  // We parse it into individual field entries, trimming whitespace.
  const fieldEntries = rawFields
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== ',')
    // Remove trailing comma if present (statementToCode may produce double commas)
    .map((line) => line.endsWith(',') ? line.slice(0, -1) : line)

  const fieldsStr = fieldEntries.join(', ')
  const code = `z.object({ ${fieldsStr} })`
  return [code, Order.FUNCTION_CALL]
}
