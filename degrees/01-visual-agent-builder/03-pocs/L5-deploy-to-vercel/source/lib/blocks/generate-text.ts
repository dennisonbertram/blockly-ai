/**
 * generate-text.ts — L4 (extended from L3)
 *
 * Custom "GenerateText (model, prompt, system?, tools?, stopWhen?)" expression block.
 * Block type: ai_generate_text
 *
 * Extended in L3: added TOOLS value input.
 * Extended in L4: added STOP_WHEN value input.
 *
 * Compilation rules:
 * - If STOP_WHEN connected: emit stopWhen: <stop_code>
 * - If TOOLS connected but no STOP_WHEN: emit default stopWhen: stepCountIs(5)
 * - If neither TOOLS nor STOP_WHEN: omit stopWhen
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

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
    this.appendValueInput('TOOLS')
      .setCheck(null)
      .appendField('tools (optional):')
    this.appendValueInput('STOP_WHEN')
      .setCheck(null)
      .appendField('stopWhen (optional):')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(160)
    this.setTooltip('Call generateText and return the response text.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_generate_text'] = function (
  block: Block,
  generator: JavascriptGenerator
): [string, number] {
  const modelCode =
    generator.valueToCode(block, 'MODEL', Order.NONE) || `(__model_provider ?? undefined)`
  const promptCode =
    generator.valueToCode(block, 'PROMPT', Order.NONE) || `'No prompt provided'`

  const systemInput = block.getInput('SYSTEM')
  const systemIsConnected = systemInput?.connection?.isConnected() ?? false
  const systemCode = systemIsConnected
    ? generator.valueToCode(block, 'SYSTEM', Order.NONE)
    : null

  const toolsInput = block.getInput('TOOLS')
  const toolsIsConnected = toolsInput?.connection?.isConnected() ?? false
  const toolsCode = toolsIsConnected
    ? generator.valueToCode(block, 'TOOLS', Order.NONE)
    : null

  const stopWhenInput = block.getInput('STOP_WHEN')
  const stopWhenIsConnected = stopWhenInput?.connection?.isConnected() ?? false
  const stopWhenCode = stopWhenIsConnected
    ? generator.valueToCode(block, 'STOP_WHEN', Order.NONE)
    : null

  // Build the options object
  const parts: string[] = [
    `model: ${modelCode}`,
    `prompt: ${promptCode}`,
  ]
  if (systemCode) {
    parts.push(`system: ${systemCode}`)
  }
  if (toolsCode) {
    parts.push(`tools: ${toolsCode}`)
    parts.push(`toolChoice: 'auto'`)
    // If no explicit stop condition, use safe default
    if (stopWhenCode) {
      parts.push(`stopWhen: ${stopWhenCode}`)
    } else {
      parts.push(`stopWhen: stepCountIs(5)`)
    }
  } else if (stopWhenCode) {
    parts.push(`stopWhen: ${stopWhenCode}`)
  }

  const opts = `{ ${parts.join(', ')} }`
  const code = `(await generateText(${opts})).text`
  return [code, Order.AWAIT]
}
