/**
 * stream-text.ts — L4
 *
 * StreamText(model, prompt, system?, tools?, stopWhen?) — expression block.
 * Block type: ai_stream_text
 *
 * Compiles to: streamText({ model, prompt, system?, tools?, stopWhen? })
 * Returns the result handle (NOT awaited — streamText is synchronous).
 *
 * Returns [code, Order.FUNCTION_CALL].
 *
 * The caller (StreamSink) iterates result.textStream.
 *
 * Decision: We chose raw streamText() over ToolLoopAgent because:
 * 1. streamText with stopWhen is the canonical v6 pattern for streaming agents.
 * 2. ToolLoopAgent is designed for reuse across many requests; our blocks are
 *    called once per program run.
 * 3. streamText is more composable and has direct fixture support in tests.
 * Documented in decision-log.md.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_stream_text'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('MODEL')
      .setCheck(null)
      .appendField('StreamText model:')
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
    this.setColour(90)
    this.setTooltip('Call streamText and return the result handle. Wire to StreamSink to iterate chunks.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_stream_text'] = function (
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
    if (stopWhenCode) {
      parts.push(`stopWhen: ${stopWhenCode}`)
    } else {
      parts.push(`stopWhen: stepCountIs(5)`)
    }
  } else if (stopWhenCode) {
    parts.push(`stopWhen: ${stopWhenCode}`)
  }

  const opts = `{ ${parts.join(', ')} }`
  // Note: streamText is NOT awaited — it returns synchronously with async iterables
  const code = `streamText(${opts})`
  return [code, Order.FUNCTION_CALL]
}
