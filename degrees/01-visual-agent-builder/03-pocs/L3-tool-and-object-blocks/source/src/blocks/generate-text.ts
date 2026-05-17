/**
 * generate-text.ts — L3 (extended from L2)
 *
 * Custom "GenerateText (model, prompt, system?, tools?)" expression block.
 * Block type: ai_generate_text
 *
 * Extended in L3: added TOOLS value input.
 * If TOOLS is connected, emits:
 *   tools: <tools_map_code>, toolChoice: 'auto'
 * in the generateText call object.
 *
 * Decision: toolChoice defaults to 'auto' when tools are wired in, so the model
 * decides when to call tools. This is the most useful default and matches
 * the SDK default. Documented in decision-log.md.
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
    parts.push(`stopWhen: stepCountIs(5)`)
  }

  const opts = `{ ${parts.join(', ')} }`
  const code = `(await generateText(${opts})).text`
  return [code, Order.AWAIT]
}
