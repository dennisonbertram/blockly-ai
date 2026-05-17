/**
 * prompt.ts
 *
 * Custom "Prompt (text)" expression block and JS generator.
 *
 * Block type: ai_prompt
 * Shape: expression block (has output connection)
 * Field: TEXT — text field (default empty)
 *
 * Generator output:
 *   '<escaped text>'   (a quoted string literal)
 *
 * Design decision: using a custom ai_prompt block rather than Blockly's built-in
 * 'text' block. Rationale: The custom block is visually distinct in the AI toolbox
 * category, has a label ("Prompt"), and can be extended with additional metadata
 * (e.g., prompt templates) in future POCs. The built-in text block would also work
 * but lacks the AI-specific UX label. Documented in implementation-notes.md.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// ─── Block Definition ────────────────────────────────────────────────────────

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

// ─── Code Generator ──────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_prompt'] = function (
  block: Block,
  _generator: JavascriptGenerator
): [string, number] {
  const text = block.getFieldValue('TEXT') as string
  // Escape single quotes and backslashes in the prompt text
  const escaped = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const code = `'${escaped}'`
  return [code, Order.ATOMIC]
}
