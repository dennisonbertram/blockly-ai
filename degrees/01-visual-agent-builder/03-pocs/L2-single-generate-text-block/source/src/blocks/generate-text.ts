/**
 * generate-text.ts
 *
 * Custom "GenerateText (model, prompt, system?)" expression block and JS generator.
 *
 * Block type: ai_generate_text
 * Shape: expression block (has output connection — returns string)
 * Inputs:
 *   MODEL  — value input (accepts ai_model block)
 *   PROMPT — value input (accepts string)
 *   SYSTEM — value input, OPTIONAL (may be unconnected)
 *
 * Generator output (without system):
 *   (await generateText({ model: <model_code>, prompt: <prompt_code> })).text
 *
 * Generator output (with system):
 *   (await generateText({ model: <model_code>, prompt: <prompt_code>, system: <system_code> })).text
 *
 * Returns [code, Order.AWAIT] — the outermost operator is 'await'.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// ─── Block Definition ────────────────────────────────────────────────────────

Blockly.Blocks['ai_generate_text'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('MODEL')
      .setCheck(null)
      .appendField('GenerateText model:')
    this.appendValueInput('PROMPT')
      .setCheck('String')
      .appendField('prompt:')
    this.appendValueInput('SYSTEM')
      .setCheck('String')
      .appendField('system (optional):')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(160)
    this.setTooltip('Call generateText and return the response text.')
    this.setHelpUrl('')
  },
}

// ─── Code Generator ──────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_generate_text'] = function (
  block: Block,
  generator: JavascriptGenerator
): [string, number] {
  const modelCode =
    generator.valueToCode(block, 'MODEL', Order.NONE) || `(__model_provider ?? undefined)`
  const promptCode =
    generator.valueToCode(block, 'PROMPT', Order.NONE) || `'No prompt provided'`

  // System is optional — only include if the input is connected
  const systemInput = block.getInput('SYSTEM')
  const systemIsConnected = systemInput?.connection?.isConnected() ?? false
  const systemCode = systemIsConnected
    ? generator.valueToCode(block, 'SYSTEM', Order.NONE)
    : null

  // Build the options object
  let opts: string
  if (systemCode) {
    opts = `{ model: ${modelCode}, prompt: ${promptCode}, system: ${systemCode} }`
  } else {
    opts = `{ model: ${modelCode}, prompt: ${promptCode} }`
  }

  const code = `(await generateText(${opts})).text`
  return [code, Order.AWAIT]
}
