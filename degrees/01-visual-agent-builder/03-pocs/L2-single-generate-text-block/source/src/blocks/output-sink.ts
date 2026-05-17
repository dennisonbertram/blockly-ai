/**
 * output-sink.ts
 *
 * Custom "OutputSink (label, value)" statement block and JS generator.
 *
 * Block type: ai_output_sink
 * Shape: statement block (no output, has previous/next connections)
 * Fields:
 *   LABEL — text field (label for the output, e.g. "output")
 * Inputs:
 *   VALUE — value input (any type — accepts the result of GenerateText)
 *
 * Generator output:
 *   __sink('<label>', <value_code>);\n
 *
 * `__sink` is an optional callback passed to the emitted run() function.
 * If __sink is not provided, the call is a no-op (undefined call is guarded below).
 *
 * In tests: pass `sink: (label, value) => results.push({ label, value })`
 * In production: pass `sink: (label, value) => outputPane.append(label, value)`
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// ─── Block Definition ────────────────────────────────────────────────────────

Blockly.Blocks['ai_output_sink'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('VALUE')
      .setCheck(null)
      .appendField('Output')
      .appendField(new Blockly.FieldTextInput('output'), 'LABEL')
      .appendField(':')
    this.setInputsInline(false)
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(20)
    this.setTooltip('Send a labeled value to the output sink callback.')
    this.setHelpUrl('')
  },
}

// ─── Code Generator ──────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_output_sink'] = function (
  block: Block,
  generator: JavascriptGenerator
): string {
  const label = block.getFieldValue('LABEL') as string
  const valueCode =
    generator.valueToCode(block, 'VALUE', Order.NONE) || 'undefined'

  // Escape the label for use in a string literal
  const escapedLabel = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  // __sink may be undefined (no sink provided) — guard with optional chaining
  return `__sink?.('${escapedLabel}', ${valueCode});\n`
}
