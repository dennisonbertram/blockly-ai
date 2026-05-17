/**
 * stream-sink.ts — L4
 *
 * StreamSink(label, source) — statement block.
 * Block type: ai_stream_sink
 *
 * Iterates source.textStream and calls __sink(label, chunk) for each chunk.
 *
 * Compiles to:
 *   for await (const __chunk of (<source_code>).textStream) {
 *     __sink?.('<label>', __chunk);
 *   }
 *
 * Note: Uses 'for await' because textStream is an async iterable.
 * The __chunk variable is named with __ prefix to avoid collision with user variables.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_stream_sink'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('SOURCE')
      .setCheck(null)
      .appendField('StreamSink label:')
      .appendField(new Blockly.FieldTextInput('out'), 'LABEL')
      .appendField('source:')
    this.setInputsInline(false)
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(90)
    this.setTooltip('Iterate over a StreamText result\'s textStream and send each chunk to the output sink.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_stream_sink'] = function (
  block: Block,
  generator: JavascriptGenerator
): string {
  const label = block.getFieldValue('LABEL') as string
  const escapedLabel = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const sourceCode =
    generator.valueToCode(block, 'SOURCE', Order.NONE) || 'null'

  return [
    `for await (const __chunk of (${sourceCode}).textStream) {`,
    `  __sink?.('${escapedLabel}', __chunk);`,
    `}`,
    '',
  ].join('\n')
}
