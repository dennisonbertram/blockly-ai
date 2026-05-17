/**
 * stop-condition.ts — L4
 *
 * StopCondition — expression block producing a stop function.
 * Block type: ai_stop_condition
 *
 * Variants (dropdown field VARIANT):
 *   stepCountIs  → emits stepCountIs(<N>)   where N is a numeric field
 *   hasToolCall  → emits hasToolCall('<name>') where name is a text field
 *
 * Returns [code, Order.FUNCTION_CALL].
 *
 * Import detection:
 * - async-generator.ts scans for 'stepCountIs(' and 'hasToolCall(' in body
 *   and includes matching imports from 'ai'.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_stop_condition'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('StopCondition')
      .appendField(
        new Blockly.FieldDropdown([
          ['stepCountIs', 'stepCountIs'],
          ['hasToolCall', 'hasToolCall'],
        ]),
        'VARIANT'
      )
    this.appendDummyInput('STEP_COUNT_INPUT')
      .appendField('N:')
      .appendField(new Blockly.FieldNumber(5, 1, 100, 1), 'N')
    this.appendDummyInput('TOOL_NAME_INPUT')
      .appendField('toolName:')
      .appendField(new Blockly.FieldTextInput('myTool'), 'TOOL_NAME')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(45)
    this.setTooltip('A stop condition for multi-step agent loops. stepCountIs(N) stops after N steps; hasToolCall(name) stops when the named tool is called.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_stop_condition'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, number] {
  const variant = block.getFieldValue('VARIANT') as string

  if (variant === 'stepCountIs') {
    const n = block.getFieldValue('N') as string
    const code = `stepCountIs(${n})`
    return [code, Order.FUNCTION_CALL]
  } else {
    // hasToolCall
    const toolName = block.getFieldValue('TOOL_NAME') as string
    const escapedName = toolName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const code = `hasToolCall('${escapedName}')`
    return [code, Order.FUNCTION_CALL]
  }
}
