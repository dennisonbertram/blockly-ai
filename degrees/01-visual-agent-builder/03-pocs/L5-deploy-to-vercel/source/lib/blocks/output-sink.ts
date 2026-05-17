/**
 * output-sink.ts — L3 (copied from L2)
 *
 * Custom "OutputSink (label, value)" statement block and JS generator.
 * Block type: ai_output_sink
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_output_sink'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('VALUE')
      .setCheck(null)
      .appendField('Output')
      .appendField(new Blockly.FieldTextInput('output'), 'LABEL')
      .appendField(':')
    this.setInputsInline(false)
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(20)
    this.setTooltip('Send a labeled value to the output sink callback.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_output_sink'] = function (
  block: Block,
  generator: JavascriptGenerator
): string {
  const label = block.getFieldValue('LABEL') as string
  const valueCode =
    generator.valueToCode(block, 'VALUE', Order.NONE) || 'undefined'
  const escapedLabel = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `__sink?.('${escapedLabel}', ${valueCode});\n`
}
