/**
 * model.ts — L3 (copied from L2)
 *
 * Custom "Model (provider, name)" expression block and JS generator.
 * Block type: ai_model
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_model'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Model')
      .appendField(
        new Blockly.FieldDropdown([
          ['anthropic', 'anthropic'],
          ['openai', 'openai'],
        ]),
        'PROVIDER'
      )
      .appendField(new Blockly.FieldTextInput('claude-haiku-4-5'), 'NAME')
    this.setOutput(true, null)
    this.setColour(160)
    this.setTooltip('Select a language model provider and name.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_model'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, number] {
  const provider = block.getFieldValue('PROVIDER') as string
  const name = block.getFieldValue('NAME') as string
  const escapedName = name.replace(/'/g, "\\'")
  const code = `(__model_provider ?? ${provider}('${escapedName}'))`
  return [code, Order.FUNCTION_CALL]
}
