/**
 * agent.ts — L4
 *
 * Agent(model, tools, stopWhen, system?, prompt) — expression block.
 * Block type: ai_agent
 *
 * Compiles to:
 *   (await generateText({
 *     model: <model>,
 *     prompt: <prompt>,
 *     system: <system or omitted>,
 *     tools: <tools_code>,
 *     stopWhen: <stop_code>
 *   })).text
 *
 * Returns [code, Order.AWAIT].
 *
 * Design choice: We use raw generateText with stopWhen over ToolLoopAgent because:
 * 1. generateText with stopWhen is the canonical v6 pattern for one-shot agent runs.
 * 2. ToolLoopAgent is designed for reuse — instantiated once, called many times.
 *    Our blocks generate code called once per program run.
 * 3. generateText is simpler to compile and test (no class instantiation needed).
 * 4. Both approaches are v6-correct; generateText is the safer, more explicit choice
 *    that makes the agent loop visible in emitted code.
 * Documented in decision-log.md.
 *
 * If no STOP_WHEN is connected, defaults to stopWhen: stepCountIs(5) for safety.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_agent'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('MODEL')
      .setCheck(null)
      .appendField('Agent model:')
    this.appendValueInput('PROMPT')
      .setCheck('String')
      .appendField('prompt:')
    this.appendValueInput('SYSTEM')
      .setCheck('String')
      .appendField('system (optional):')
    this.appendValueInput('TOOLS')
      .setCheck(null)
      .appendField('tools:')
    this.appendValueInput('STOP_WHEN')
      .setCheck(null)
      .appendField('stopWhen:')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(30)
    this.setTooltip('Multi-step agent using generateText with stopWhen. Returns the final text response.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_agent'] = function (
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
  }
  // Always include stopWhen — default to stepCountIs(5) if not connected
  if (stopWhenCode) {
    parts.push(`stopWhen: ${stopWhenCode}`)
  } else {
    parts.push(`stopWhen: stepCountIs(5)`)
  }

  const opts = parts.join(', ')
  const code = `(await generateText({ ${opts} })).text`
  return [code, Order.AWAIT]
}
