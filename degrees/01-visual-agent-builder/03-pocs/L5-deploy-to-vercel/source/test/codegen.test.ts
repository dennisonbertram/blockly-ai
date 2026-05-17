/**
 * codegen.test.ts — L5
 *
 * Snapshot and behavioral tests for codegen — carried forward from L4.
 * Parity check: L5 codegen must produce the same output as L4.
 *
 * BT-L4-001 through BT-L4-008 carried forward.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { generate } from '../lib/codegen/generate'

// Fixtures
import streamTextBasicFixture from './fixtures/stream-text-basic.json'
import agentMultiStepFixture from './fixtures/agent-multi-step.json'
import agentHasToolCallStopFixture from './fixtures/agent-has-tool-call-stop.json'
import generateTextBasicFixture from './fixtures/generate-text-basic.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2/L3/L4 custom blocks
import '../lib/blocks/model'
import '../lib/blocks/prompt'
import '../lib/blocks/generate-text'
import '../lib/blocks/output-sink'
import '../lib/blocks/tool'
import '../lib/blocks/zod-object'
import '../lib/blocks/zod-field'
import '../lib/blocks/use-tools'
import '../lib/blocks/generate-object'
import '../lib/blocks/stop-condition'
import '../lib/blocks/stream-text'
import '../lib/blocks/stream-sink'
import '../lib/blocks/agent'
import '../lib/blocks/for-each'

describe('generate(workspace) — L5 codegen parity (carried from L4)', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it('BT-L5-codegen-001: generate-text-basic fixture → imports generateText, uses generateText({model,prompt})', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toMatch(/import \{[^}]*generateText[^}]*\} from 'ai'/)
    expect(code).toContain('generateText(')
    expect(code).toContain('model:')
    expect(code).toContain('prompt:')
    expect(code).not.toContain('streamText')
  })

  it('BT-L5-codegen-002: stream-text-basic fixture → imports streamText, for await of textStream', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toMatch(/import \{[^}]*streamText[^}]*\} from 'ai'/)
    expect(code).toContain('streamText(')
    expect(code).toContain('for await (')
    expect(code).toContain('.textStream)')
  })

  it('BT-L5-codegen-003: agent-multi-step fixture → stepCountIs(3), tools map, no maxSteps', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('stepCountIs(3)')
    expect(code).toContain('tools: {')
    expect(code).toContain('stopWhen:')
    expect(code).not.toContain('maxSteps:')
    expect(code).not.toContain('maxSteps')
  })

  it('BT-L5-codegen-004: forbidden-name grep — no deprecated API names in emitted code', () => {
    const fixtures = [
      generateTextBasicFixture,
      streamTextBasicFixture,
      agentMultiStepFixture,
      agentHasToolCallStopFixture,
    ]

    const forbiddenNames = [
      'parameters:',
      'generateObject(',
      'toDataStreamResponse',
      'CoreMessage',
      'experimental_streamText',
      'experimental_output',
      'maxSteps:',
      'maxSteps',
    ]

    for (const fixture of fixtures) {
      const ws = new Blockly.Workspace()
      try {
        Blockly.Events.disable()
        Blockly.serialization.workspaces.load(fixture, ws)
        Blockly.Events.enable()

        const code = generate(ws)

        for (const forbidden of forbiddenNames) {
          expect(code, `Forbidden API name "${forbidden}" found in emitted code`).not.toContain(forbidden)
        }
      } finally {
        Blockly.Events.disable()
        ws.dispose()
        Blockly.Events.enable()
      }
    }
  })

  it('BT-L5-codegen-005: generate-text-basic snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextBasicFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('BT-L5-codegen-006: stream-text-basic snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })
})
