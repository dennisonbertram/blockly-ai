/**
 * tool-call.ts — L-capstone
 *
 * ToolCallExpr(toolName, argExpr) — expression block that emits:
 *   await __tools.<toolName>(<argExpr>)
 *
 * This block is used inside an ai_tool BODY to call an injected __tools
 * implementation. The executor injects __tools as part of the run() signature.
 *
 * Fields:
 *   TOOL_NAME — text field (name of the tool function on __tools)
 *   ARG_FIELD — text field (raw argument expression, typically "input.query" or "input.url")
 *
 * Returns [code, Order.AWAIT] — this is an awaited expression.
 *
 * Design decision: we use a text field for the arg rather than a value input
 * because the argument is always a simple input field access (input.query, input.url)
 * and a text field keeps the workspace JSON simple for the capstone fixture.
 *
 * The __tools injection pattern is documented in implementation-notes.md.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_tool_call'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('call __tools.')
      .appendField(new Blockly.FieldTextInput('search'), 'TOOL_NAME')
      .appendField('(')
      .appendField(new Blockly.FieldTextInput('input.query'), 'ARG_FIELD')
      .appendField(')')
    this.setOutput(true, null)
    this.setColour(270)
    this.setTooltip('Call an injected tool implementation via __tools.<name>(<arg>). Used inside a Tool body to invoke the stub.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_tool_call'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, number] {
  const toolName = block.getFieldValue('TOOL_NAME') as string
  const argField = block.getFieldValue('ARG_FIELD') as string

  // Sanitize tool name — must be a valid JS identifier
  const safeName = toolName.replace(/[^a-zA-Z0-9_$]/g, '_')

  const code = `await __tools.${safeName}(${argField})`
  return [code, Order.AWAIT]
}
