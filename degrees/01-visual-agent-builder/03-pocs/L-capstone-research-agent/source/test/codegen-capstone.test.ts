/**
 * codegen-capstone.test.ts — L-capstone
 *
 * Snapshot and behavioral tests for capstone workspace codegen.
 *
 * BT-capstone-005 (capstone-emit): load capstone-workspace.json → generate emitted source.
 *   Assert it contains correct imports, two tool() definitions for search and fetch,
 *   stopWhen: stepCountIs(5), output: Output.object({...}) with title/key_points/sources.
 *
 * BT-capstone-007 (tools-injection): assert emitted code references __tools.search( and __tools.fetch(
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { generate } from '../lib/codegen/generate'

// Fixture
import capstoneWorkspace from './fixtures/capstone-workspace.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers all blocks
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
import '../lib/blocks/tool-call'

describe('Capstone workspace codegen', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it('BT-capstone-005: capstone-emit — emitted source contains correct AI SDK imports', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must import from 'ai' (generateText, tool, Output, stepCountIs)
    expect(code).toMatch(/import \{[^}]*generateText[^}]*\} from 'ai'/)
    expect(code).toMatch(/import \{[^}]*tool[^}]*\} from 'ai'/)
    expect(code).toMatch(/import \{[^}]*Output[^}]*\} from 'ai'/)
    expect(code).toMatch(/import \{[^}]*stepCountIs[^}]*\} from 'ai'/)
  })

  it('BT-capstone-005b: capstone-emit — emitted source contains two tool() definitions', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Two tool({...}) definitions
    const toolMatches = code.match(/tool\(\{/g)
    expect(toolMatches, 'Expected at least two tool({...}) definitions').not.toBeNull()
    expect(toolMatches!.length).toBeGreaterThanOrEqual(2)
  })

  it('BT-capstone-005c: capstone-emit — emitted source contains stopWhen: stepCountIs(5)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('stopWhen: stepCountIs(5)')
    expect(code).not.toContain('maxSteps')
  })

  it('BT-capstone-005d: capstone-emit — emitted source contains Output.object with title, key_points, sources', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('output: Output.object(')
    expect(code).toContain('title:')
    expect(code).toContain('key_points:')
    expect(code).toContain('sources:')
  })

  it('BT-capstone-007: tools-injection — emitted code references __tools.search( and __tools.fetch(', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('__tools.search(')
    expect(code).toContain('__tools.fetch(')
  })

  it('BT-capstone-005-snapshot: capstone workspace codegen snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    expect(generate(workspace)).toMatchSnapshot()
  })
})
