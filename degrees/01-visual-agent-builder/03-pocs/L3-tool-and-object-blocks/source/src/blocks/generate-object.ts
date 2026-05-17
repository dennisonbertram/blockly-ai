/**
 * generate-object.ts — L3
 *
 * GenerateObject(model, schema, prompt, system?) — expression block returning typed object.
 *
 * Inputs:
 *   MODEL  — value input (accepts ai_model block)
 *   SCHEMA — value input (expects ai_zod_object)
 *   PROMPT — value input (accepts string)
 *   SYSTEM — value input, OPTIONAL
 *
 * Compiles to (WITHOUT system):
 *   (await generateText({
 *     model: <model_code>,
 *     prompt: <prompt_code>,
 *     output: Output.object({ schema: <schema_code> })
 *   })).object
 *
 * Compiles to (WITH system):
 *   (await generateText({
 *     model: <model_code>,
 *     prompt: <prompt_code>,
 *     system: <system_code>,
 *     output: Output.object({ schema: <schema_code> })
 *   })).object
 *
 * Returns [code, Order.AWAIT].
 *
 * Note: Uses generateText + Output.object (NOT the deprecated generateObject).
 * The async-generator.ts import builder detects 'Output.object(' in body
 * and adds 'Output' to the ai import and 'z' from 'zod'.
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator, Order } from 'blockly/javascript'
import type { Block } from 'blockly/core'
import type { JavascriptGenerator } from 'blockly/javascript'

Blockly.Blocks['ai_generate_object'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('MODEL')
      .setCheck(null)
      .appendField('GenerateObject model:')
    this.appendValueInput('SCHEMA')
      .setCheck(null)
      .appendField('schema:')
    this.appendValueInput('PROMPT')
      .setCheck('String')
      .appendField('prompt:')
    this.appendValueInput('SYSTEM')
      .setCheck('String')
      .appendField('system (optional):')
    this.setInputsInline(false)
    this.setOutput(true, null)
    this.setColour(310)
    this.setTooltip('Call generateText with Output.object({ schema }) and return the typed object.')
    this.setHelpUrl('')
  },
}

javascriptGenerator.forBlock['ai_generate_object'] = function (
  block: Block,
  generator: JavascriptGenerator
): [string, number] {
  const modelCode =
    generator.valueToCode(block, 'MODEL', Order.NONE) || `(__model_provider ?? undefined)`
  const promptCode =
    generator.valueToCode(block, 'PROMPT', Order.NONE) || `'No prompt provided'`
  const schemaCode =
    generator.valueToCode(block, 'SCHEMA', Order.NONE) || 'z.object({})'

  const systemInput = block.getInput('SYSTEM')
  const systemIsConnected = systemInput?.connection?.isConnected() ?? false
  const systemCode = systemIsConnected
    ? generator.valueToCode(block, 'SYSTEM', Order.NONE)
    : null

  // Build the options object
  const parts: string[] = [
    `model: ${modelCode}`,
    `prompt: ${promptCode}`,
  ]
  if (systemCode) {
    parts.push(`system: ${systemCode}`)
  }
  parts.push(`output: Output.object({ schema: ${schemaCode} })`)

  const opts = `{ ${parts.join(', ')} }`
  // Access .output on the result to extract the parsed typed object
  // Note: The v6 SDK uses `.output` (not `.object`) on the GenerateTextResult.
  // The task spec mentioned `.object` but the actual SDK has `.output`.
  // Documented in surprises.md.
  const code = `(await generateText(${opts})).output`
  return [code, Order.AWAIT]
}
