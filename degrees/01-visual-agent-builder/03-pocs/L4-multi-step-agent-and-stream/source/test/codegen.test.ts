/**
 * codegen.test.ts — L4
 *
 * Behavioral tests for the L4 block code generators.
 *
 * BT-L4-001: stream-text-basic fixture → emitted code imports streamText,
 *             has streamText({ model, prompt }), and for await ... of result.textStream.
 *             Snapshot.
 *
 * BT-L4-002: agent-multi-step fixture → emitted code includes stepCountIs(3),
 *             tools: { weather: ... }, stopWhen: stepCountIs(3).
 *             Forbidden: maxSteps:. Snapshot.
 *
 * BT-L4-003: agent-has-tool-call-stop fixture → imports hasToolCall,
 *             emits stopWhen: hasToolCall('weather'). Snapshot.
 *
 * BT-L4-008: forbidden-name grep extended → no maxSteps:, generateObject(,
 *             experimental_output, parameters:, etc. in any L4 fixture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

// This import will fail until implementation files exist — that IS the RED state.
import { generate } from '../src/codegen/generate'

// Fixtures
import streamTextBasicFixture from './fixtures/stream-text-basic.json'
import agentMultiStepFixture from './fixtures/agent-multi-step.json'
import agentHasToolCallStopFixture from './fixtures/agent-has-tool-call-stop.json'
import generateTextWithToolFixture from './fixtures/generate-text-with-tool.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2/L3 custom blocks (carried forward by copy)
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'
import '../src/blocks/tool'
import '../src/blocks/zod-object'
import '../src/blocks/zod-field'
import '../src/blocks/use-tools'
import '../src/blocks/generate-object'

// Side-effect: registers L4 custom blocks
import '../src/blocks/stop-condition'
import '../src/blocks/stream-text'
import '../src/blocks/stream-sink'
import '../src/blocks/agent'
import '../src/blocks/for-each'

describe('generate(workspace) — L4 block codegen', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  // BT-L4-001: stream-text-basic
  it('BT-L4-001: stream-text-basic fixture → imports streamText, uses streamText({model,prompt}), for await of textStream', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must import streamText from 'ai'
    expect(code).toMatch(/import \{[^}]*streamText[^}]*\} from 'ai'/)
    // Must call streamText (not await it — it returns synchronously)
    expect(code).toContain('streamText(')
    expect(code).toContain('streamText({')
    // Must have model and prompt
    expect(code).toContain('model:')
    expect(code).toContain('prompt:')
    // Must use for await over .textStream
    expect(code).toContain('for await (')
    expect(code).toContain('.textStream)')
    // Must call __sink
    expect(code).toContain('__sink')
  })

  // BT-L4-001 snapshot
  it('BT-L4-001: stream-text-basic fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-L4-002: agent-multi-step
  it('BT-L4-002: agent-multi-step fixture → stepCountIs(3), tools map, stopWhen: stepCountIs(3), no maxSteps', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must import stepCountIs from 'ai'
    expect(code).toMatch(/import \{[^}]*stepCountIs[^}]*\} from 'ai'/)
    // Must emit stepCountIs(3)
    expect(code).toContain('stepCountIs(3)')
    // Must have tools map
    expect(code).toContain('tools: {')
    expect(code).toContain('weather:')
    // Must emit stopWhen with the stop condition
    expect(code).toContain('stopWhen:')
    // Must NOT use the old maxSteps API
    expect(code).not.toContain('maxSteps:')
    expect(code).not.toContain('maxSteps')
  })

  // BT-L4-002 snapshot
  it('BT-L4-002: agent-multi-step fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-L4-003: agent-has-tool-call-stop
  it("BT-L4-003: agent-has-tool-call-stop fixture → imports hasToolCall, emits stopWhen: hasToolCall('weather')", () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must import hasToolCall from 'ai'
    expect(code).toMatch(/import \{[^}]*hasToolCall[^}]*\} from 'ai'/)
    // Must emit hasToolCall('weather')
    expect(code).toContain("hasToolCall('weather')")
    // Must emit stopWhen:
    expect(code).toContain('stopWhen:')
    // Must NOT contain stepCountIs in this fixture
    expect(code).not.toContain('stepCountIs(')
  })

  // BT-L4-003 snapshot
  it('BT-L4-003: agent-has-tool-call-stop fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  // BT-L4-008: forbidden-name grep extended
  it('BT-L4-008: forbidden-name grep extended → no deprecated API names in any L4 emitted code', () => {
    const fixtures = [
      streamTextBasicFixture,
      agentMultiStepFixture,
      agentHasToolCallStopFixture,
      generateTextWithToolFixture,
    ]

    const forbiddenNames = [
      // L2/L3 list carried forward
      'parameters:',
      'generateObject(',
      'toDataStreamResponse',
      'CoreMessage',
      'experimental_streamText',
      'experimental_output',
      // L4 addition: maxSteps is the CRITICAL one — must never appear
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
