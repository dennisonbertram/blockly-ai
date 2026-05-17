/**
 * block-defs.test.ts
 *
 * Block registration sanity tests.
 * Verifies that all L2 custom blocks are registered in Blockly.Blocks after import.
 */

import { describe, it, expect } from 'vitest'
import * as Blockly from 'blockly/core'

// Side-effect: registers L2 custom blocks + generators
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'

describe('block registrations', () => {
  it('ai_model block is registered in Blockly.Blocks', () => {
    expect(Blockly.Blocks['ai_model']).toBeDefined()
  })

  it('ai_prompt block is registered in Blockly.Blocks', () => {
    expect(Blockly.Blocks['ai_prompt']).toBeDefined()
  })

  it('ai_generate_text block is registered in Blockly.Blocks', () => {
    expect(Blockly.Blocks['ai_generate_text']).toBeDefined()
  })

  it('ai_output_sink block is registered in Blockly.Blocks', () => {
    expect(Blockly.Blocks['ai_output_sink']).toBeDefined()
  })

  it('ai_model block has an init() method', () => {
    expect(typeof Blockly.Blocks['ai_model'].init).toBe('function')
  })

  it('ai_output_sink block has an init() method', () => {
    expect(typeof Blockly.Blocks['ai_output_sink'].init).toBe('function')
  })
})
