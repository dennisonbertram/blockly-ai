/**
 * tool.ts — L3
 *
 * Tool(name, description, inputSchema, body) — expression block returning a tool definition.
 *
 * Inputs:
 *   NAME         — text field (tool name, used as key in UseTools)
 *   DESCRIPTION  — text field (description for the model)
 *   INPUT_SCHEMA — value input (expects ai_zod_object)
 *   BODY         — statement input (execute function body with ToolReturn)
 *
 * Compiles to:
 *   tool({
 *     description: '<description>',
 *     inputSchema: <schema_code>,
 *     execute: async (input) => {
 *       <body_statements>
 *     }
 *   })
 *
 * Returns [code, Order.FUNCTION_CALL].
 *
 * The NAME field is used by UseTools to build the tools map key.
 *
 * Decision on multi-line body: We use a companion ToolReturn statement block
 * rather than a "return" field on the Tool block because:
 * 1. Blockly fields are single-line — they can't hold complex expressions.
 * 2. The execute body may have multiple statements before the final return.
 * 3. Using a statement block follows Blockly's natural composition model.
 * Documented in decision-log.md.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// ─── ai_tool block ──────────────────────────────────────────────────────────

Blockly.Blocks['ai_tool'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Tool name:')
      .appendField(new Blockly.FieldTextInput('myTool'), 'NAME')
    this.appendDummyInput()
      .appendField('description:')
      .appendField(new Blockly.FieldTextInput(''), 'DESCRIPTION')
    this.appendValueInput('INPUT_SCHEMA')
      .setCheck(null)
      .appendField('inputSchema:')
    this.appendStatementInput('BODY')
      .setCheck(null)
      .appendField('execute body:')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(270)
    this.setTooltip('Define a tool with a name, description, Zod schema, and execute body.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_tool'] = function (
  block: Block,
  generator: JavascriptGenerator
): [string, number] {
  const name = block.getFieldValue('NAME') as string
  const description = block.getFieldValue('DESCRIPTION') as string

  const escapedDescription = description.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  const schemaCode =
    generator.valueToCode(block, 'INPUT_SCHEMA', Order.NONE) || 'z.object({})'

  // Get the body statements (includes ToolReturn)
  const bodyCode = generator.statementToCode(block, 'BODY')

  const indentedBody = bodyCode
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : '    ' + line))
    .join('\n')
    .trimEnd()

  const code = [
    `tool({`,
    `  description: '${escapedDescription}',`,
    `  inputSchema: ${schemaCode},`,
    `  execute: async (input) => {`,
    indentedBody,
    `  }`,
    `})`,
  ].join('\n')

  return [code, Order.FUNCTION_CALL]
}

// ─── ai_tool_return block ────────────────────────────────────────────────────

/**
 * ToolReturn(value) — statement block that compiles to `return <value>;`
 *
 * Companion to ai_tool. Must be the last statement in the BODY.
 *
 * Design decision: We use a dedicated ToolReturn block rather than a "return"
 * text input field on the Tool block because:
 * - Blockly fields are single-line strings; they cannot hold composed block expressions.
 * - A block composition model allows any expression block to be the return value.
 * - This follows the same pattern Blockly's procedures_return block uses.
 */
Blockly.Blocks['ai_tool_return'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('VALUE')
      .setCheck(null)
      .appendField('return')
    this.setPreviousStatement(true, null)
    this.setNextStatement(false, null)
    this.setColour(270)
    this.setTooltip('Return a value from the tool execute function. Must be the last statement.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_tool_return'] = function (
  block: Block,
  generator: JavascriptGenerator
): string {
  const valueCode =
    generator.valueToCode(block, 'VALUE', Order.NONE) || 'undefined'
  return `return ${valueCode};\n`
}
