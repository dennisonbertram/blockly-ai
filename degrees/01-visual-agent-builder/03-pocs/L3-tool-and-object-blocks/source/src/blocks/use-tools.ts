/**
 * use-tools.ts — L3
 *
 * UseTools(tool0, tool1?, tool2?) — expression block returning a tools map object.
 *
 * Compiles to: { toolName: tool({...}), ... }
 *
 * The key for each tool is derived from the NAME field of the connected ai_tool block.
 * If no ai_tool is connected (just a plain expression block), the key is auto-generated
 * as "tool0", "tool1", etc.
 *
 * Design: Fixed N=3 inputs for simplicity (documented limitation).
 * Limitation: Maximum 3 tools per UseTools block. For more tools, a mutator
 * pattern would be needed (L4+ work). This is documented in implementation-notes.md.
 *
 * Tool name extraction: We read the NAME field from the connected ai_tool block
 * directly. If the connected block is not an ai_tool, we fall back to the slot index.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_use_tools'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('TOOL_0')
      .setCheck(null)
      .appendField('UseTools tool 1:')
    this.appendValueInput('TOOL_1')
      .setCheck(null)
      .appendField('tool 2 (optional):')
    this.appendValueInput('TOOL_2')
      .setCheck(null)
      .appendField('tool 3 (optional):')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(270)
    this.setTooltip('Compose up to 3 tool definitions into a tools map for generateText. Limitation: max 3 tools.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_use_tools'] = function (
  block: Block,
  generator: JavascriptGenerator
): [string, number] {
  const toolSlots = ['TOOL_0', 'TOOL_1', 'TOOL_2']
  const entries: string[] = []

  for (let i = 0; i < toolSlots.length; i++) {
    const slotName = toolSlots[i]
    const input = block.getInput(slotName)
    if (!input?.connection?.isConnected()) continue

    const connectedBlock = input.connection.targetBlock()
    const toolCode = generator.valueToCode(block, slotName, Order.NONE)
    if (!toolCode) continue

    // Extract the tool name from the connected block's NAME field if it's an ai_tool
    let toolKey: string
    if (connectedBlock?.type === 'ai_tool') {
      toolKey = (connectedBlock.getFieldValue('NAME') as string) || `tool${i}`
    } else {
      toolKey = `tool${i}`
    }

    // Escape the key for use as an object property
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(toolKey)
      ? toolKey
      : `'${toolKey.replace(/'/g, "\\'")}'`

    entries.push(`${safeKey}: ${toolCode}`)
  }

  const code = `{ ${entries.join(', ')} }`
  return [code, Order.ATOMIC]
}
