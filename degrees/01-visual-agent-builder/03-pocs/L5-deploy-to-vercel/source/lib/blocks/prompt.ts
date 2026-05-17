/**
 * prompt.ts — L3 (copied from L2)
 *
 * Custom "Prompt (text)" expression block and JS generator.
 * Block type: ai_prompt
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_prompt'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Prompt')
      .appendField(new Blockly.FieldTextInput(''), 'TEXT')
    this.setOutput(true, 'String')
    this.setColour(210)
    this.setTooltip('A text prompt or system instruction.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_prompt'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, number] {
  const text = block.getFieldValue('TEXT') as string
  const escaped = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const code = `'${escaped}'`
  return [code, Order.ATOMIC]
}
