/**
 * model.ts
 *
 * Custom "Model (provider, name)" expression block and JS generator.
 *
 * Block type: ai_model
 * Shape: expression block (has output connection)
 * Fields:
 *   PROVIDER — dropdown: 'anthropic' | 'openai'
 *   NAME — text field (default: 'claude-haiku-4-5' for anthropic, 'gpt-4o-mini' for openai)
 *
 * Generator output:
 *   (__model_provider ?? anthropic('<name>'))
 *   (__model_provider ?? openai('<name>'))
 *
 * The `__model_provider` injection allows tests to pass a MockLanguageModelV3
 * without hitting a real API. In production use, `__model_provider` is undefined
 * and the real provider constructor is called.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// ─── Block Definition ────────────────────────────────────────────────────────

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

// ─── Code Generator ──────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_model'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, number] {
  const provider = block.getFieldValue('PROVIDER') as string
  const name = block.getFieldValue('NAME') as string

  // Escape the model name for use in a string literal
  const escapedName = name.replace(/'/g, "\\'")

  // The emitted expression allows test injection via __model_provider
  const code = `(__model_provider ?? ${provider}('${escapedName}'))`
  return [code, Order.FUNCTION_CALL]
}
