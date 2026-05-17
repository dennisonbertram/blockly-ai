/**
 * greet-block.test.ts
 *
 * Unit tests for the custom "greet" block definition and JS generator.
 *
 * BT-004 (also covered in codegen.test.ts): greet block with text input
 *         generates console.log('Hello, ' + <name>)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { javascriptGenerator } from 'blockly/javascript'

// This import triggers block registration as a side effect.
// Will fail until the file exists — RED state.
import '../src/blocks/greet'

void libraryBlocks

describe('greet block definition and generator', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it("registers 'greet' block type in Blockly.Blocks", () => {
    // After import, the block must be registered
    expect(Blockly.Blocks['greet']).toBeDefined()
    expect(typeof Blockly.Blocks['greet'].init).toBe('function')
  })

  it("registers 'greet' JS generator in javascriptGenerator.forBlock", () => {
    expect(typeof javascriptGenerator.forBlock['greet']).toBe('function')
  })

  it("generates console.log('Hello, ' + 'Alice') for Greet('Alice') inline block", () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'greet',
            id: 'g1',
            x: 0,
            y: 0,
            inputs: {
              NAME: {
                block: {
                  type: 'text',
                  id: 't1',
                  fields: { TEXT: 'Alice' },
                },
              },
            },
          },
        ],
      },
    }

    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(state, workspace)
    Blockly.Events.enable()

    const code = javascriptGenerator.workspaceToCode(workspace)
    expect(code).toContain("console.log('Hello, ' + 'Alice')")
  })

  it("generates greeting with default name when NAME input is empty", () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'greet',
            id: 'g2',
            x: 0,
            y: 0,
            // No NAME input — should fall back to default
          },
        ],
      },
    }

    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(state, workspace)
    Blockly.Events.enable()

    const code = javascriptGenerator.workspaceToCode(workspace)
    // Should produce some console.log with a default name
    expect(code).toContain('console.log(')
    expect(code).toContain("'Hello, '")
  })
})
