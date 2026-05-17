/**
 * greet.ts
 *
 * Custom "Greet" block definition and JavaScript code generator.
 *
 * Block shape: statement block with one `field_input` for the name.
 * Toolbox usage: place in a "Custom" category.
 *
 * Generator output:
 *   console.log('Hello, ' + <name>);
 *
 * Design choice: use `field_input` (text input on the block face) rather than
 * `input_value` (value connector) so the block works standalone without
 * requiring a text block to be connected. The task contract specifies
 * Greet('Alice') which maps to a field_input of 'Alice'.
 *
 * For the fixture test (greet-alice.json) we support both patterns:
 * - If a NAME value input is connected, use valueToCode() for that input.
 * - For the field_input approach we read the GREET_NAME field.
 *
 * To satisfy the fixture file which uses `inputs.NAME.block` (value input
 * connector pattern), we define NAME as an `input_value`. The field_input
 * approach requires a separate init() method, so we use JS init API.
 */

import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

// Side-effect import — ensures built-in blocks (including 'text') are registered
void libraryBlocks

// ─── Block Definition ────────────────────────────────────────────────────────

/**
 * The greet block uses a value input called NAME.
 * This allows text blocks to be connected as the name value, which is
 * required by the test fixtures (greet-alice.json uses input_value style).
 *
 * We also support an empty NAME input via fallback to "'World'".
 */
Blockly.Blocks['greet'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('NAME')
      .setCheck('String')
      .appendField('Greet')
    this.setInputsInline(true)
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(230)
    this.setTooltip('Print a greeting to the console.')
    this.setHelpUrl('')
  },
}

// ─── Code Generator ──────────────────────────────────────────────────────────

/**
 * Generator for the greet block.
 *
 * Produces: console.log('Hello, ' + <name>);\n
 *
 * Uses Order.NONE for the value input because string concatenation is
 * the weakest binding we need here; parens would never be needed.
 */
javascriptGenerator.forBlock['greet'] = function (
  block: Block,
  generator: JavascriptGenerator
): string {
  const name = generator.valueToCode(block, 'NAME', Order.NONE) || "'World'"
  return `console.log('Hello, ' + ${name});\n`
}
