/**
 * for-each.ts — L4
 *
 * ForEach(item, iterable) { body } — statement block.
 * Block type: ai_for_each
 *
 * Fields:
 *   VAR — text field for the loop variable name (default: '__item')
 * Inputs:
 *   ITERABLE — value input (the iterable expression)
 *   BODY     — statement input (loop body)
 *
 * Compiles to:
 *   for (const <var> of <iterable>) {
 *     <body>
 *   }
 *
 * Use for-of (synchronous) for arrays and synchronous iterables.
 * For async iterables (like streamText.textStream), use StreamSink instead.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_for_each'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('ForEach')
      .appendField(new Blockly.FieldTextInput('__item'), 'VAR')
      .appendField('in')
    this.appendValueInput('ITERABLE')
      .setCheck(null)
      .appendField('iterable:')
    this.appendStatementInput('BODY')
      .setCheck(null)
      .appendField('do:')
    this.setInputsInline(false)
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(120)
    this.setTooltip('Iterate over each item in an iterable (array or synchronous iterable).')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_for_each'] = function (
  block: Block,
  generator: JavascriptGenerator
): string {
  const varName = block.getFieldValue('VAR') as string
  const iterableCode =
    generator.valueToCode(block, 'ITERABLE', Order.NONE) || '[]'
  const bodyCode = generator.statementToCode(block, 'BODY')

  return [
    `for (const ${varName} of ${iterableCode}) {`,
    bodyCode,
    `}`,
    '',
  ].join('\n')
}
