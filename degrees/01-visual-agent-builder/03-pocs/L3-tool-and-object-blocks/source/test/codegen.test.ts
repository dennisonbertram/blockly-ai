/**
 * codegen.test.ts — L3
 *
 * Behavioral tests for the L3 block code generators.
 *
 * BT-001: tool-only fixture → emitted code contains correct tool() call shape with inputSchema:
 * BT-002: generate-text-with-tool fixture → tools map + toolChoice: 'auto' in generateText call
 * BT-003: generate-object fixture → Output.object import, z import, correct generateText call with .object accessor
 * BT-004: generate-object-optional-field fixture → ZodField with OPTIONAL=true emits .nullable()
 * BT-007: forbidden-name grep (L3 extended) → no generateObject(, parameters:, experimental_output in emitted code
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

// These imports will fail until implementation files exist — that IS the RED state.
import { generate } from '../src/codegen/generate'

// Fixtures
import toolOnlyFixture from './fixtures/tool-only.json'
import generateTextWithToolFixture from './fixtures/generate-text-with-tool.json'
import generateObjectFixture from './fixtures/generate-object.json'
import generateObjectOptionalFieldFixture from './fixtures/generate-object-optional-field.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2 custom blocks + generators (carried forward)
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'

// Side-effect: registers L3 custom blocks + generators
import '../src/blocks/tool'
import '../src/blocks/zod-object'
import '../src/blocks/zod-field'
import '../src/blocks/use-tools'
import '../src/blocks/generate-object'

describe('generate(workspace) — L3 block codegen', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  // BT-001: tool-only fixture
  it('BT-001: tool-only fixture → emitted code contains tool() with description, inputSchema, execute', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(toolOnlyFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must use tool() (not object literal)
    expect(code).toContain('tool({')
    // Must have description field
    expect(code).toContain("description: 'Get weather for a city'")
    // Must use inputSchema: (NOT parameters:)
    expect(code).toContain('inputSchema:')
    expect(code).not.toContain('parameters:')
    // Must have the Zod schema
    expect(code).toContain('z.object(')
    expect(code).toContain('city: z.string()')
    // Must have execute: async (input) =>
    expect(code).toContain('execute: async (input) =>')
    // Must have return statement from ToolReturn block
    expect(code).toContain('return ')
  })

  // BT-001 snapshot
  it('BT-001: tool-only fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(toolOnlyFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-002: generate-text-with-tool
  it('BT-002: generate-text-with-tool fixture → tools map + toolChoice: auto in generateText call', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must contain the tool definition
    expect(code).toContain('tool({')
    expect(code).toContain('inputSchema:')
    // Must contain the tools map in generateText
    expect(code).toContain('tools: {')
    expect(code).toContain('weather:')
    // Must contain toolChoice: 'auto'
    expect(code).toContain("toolChoice: 'auto'")
    // Must have generateText call
    expect(code).toContain('generateText(')
  })

  // BT-002 snapshot
  it('BT-002: generate-text-with-tool fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-003: generate-object
  it('BT-003: generate-object fixture → Output.object import + z import + correct generateText call', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must import Output from 'ai'
    expect(code).toContain("import { Output")
    expect(code).toContain("from 'ai'")
    // Must import z from 'zod'
    expect(code).toContain("import { z } from 'zod'")
    // Must use Output.object( — NOT generateObject(
    expect(code).toContain('Output.object(')
    expect(code).not.toContain('generateObject(')
    // Must have the zod schema with all three fields
    expect(code).toContain('title: z.string()')
    expect(code).toContain('summary: z.string()')
    expect(code).toContain('tags: z.array(z.string())')
    // Must access .object on result
    expect(code).toContain('.object')
    // Must call generateText
    expect(code).toContain('generateText(')
  })

  // BT-003 snapshot
  it('BT-003: generate-object fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-004: optional ZodField uses .nullable() not .optional()
  it('BT-004: generate-object-optional-field fixture → optional ZodField emits .nullable() not .optional()', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectOptionalFieldFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Optional field (middleName) must use .nullable()
    expect(code).toContain('.nullable()')
    // Must NOT use .optional()
    expect(code).not.toContain('.optional()')
    // Non-optional field (name) must be plain z.string()
    expect(code).toContain('name: z.string()')
  })

  // BT-004 snapshot
  it('BT-004: generate-object-optional-field fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectOptionalFieldFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-007: forbidden-name grep (L3 extended list)
  it('BT-007: forbidden-name grep → no deprecated API names in any emitted code', () => {
    const fixtures = [
      toolOnlyFixture,
      generateTextWithToolFixture,
      generateObjectFixture,
      generateObjectOptionalFieldFixture,
    ]

    const forbiddenNames = [
      // L2 original list
      'parameters:',
      'maxSteps',
      'generateObject(',
      'toDataStreamResponse',
      'CoreMessage',
      'experimental_streamText',
      // L3 additions
      'experimental_output',
    ]

    for (const fixture of fixtures) {
      const ws = new Blockly.Workspace()
      try {
        Blockly.Events.disable()
        Blockly.serialization.workspaces.load(fixture, ws)
        Blockly.Events.enable()

        const code = generate(ws)

        for (const forbidden of forbiddenNames) {
          if (code.includes(forbidden)) {
            throw new Error(
              `Generated code uses deprecated/forbidden AI SDK name "${forbidden}" — ` +
              `fix the codegen template in src/codegen/ or src/blocks/`
            )
          }
        }
      } finally {
        Blockly.Events.disable()
        ws.dispose()
        Blockly.Events.enable()
      }
    }
  })
})
