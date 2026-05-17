/**
 * regression.test.ts — L4
 *
 * Regression tests that would fail if the GREEN commit (d97ad17) is reverted.
 *
 * RT-L4-001: Snapshot lock — all L4 fixture snapshots locked.
 *
 * RT-L4-002: Version-pin assertion — package.json must pin ai@6.0.184
 *             (carried forward from L3).
 *
 * RT-L4-003: stepCountIs( appears in EVERY emitted Agent program (default stop).
 *             Catches "forgot to default a stop" regression.
 *
 * RT-L4-004: for await (const __chunk of <expr>.textStream) pattern in every
 *             StreamSink emitted code. Catches regression to .fullStream or
 *             non-await iteration.
 *
 * RT-L4-005: streamText( and generateText( are imported only when used.
 *             No spurious imports — protects bundle size.
 *
 * RT-L4-006: Forbidden-name grep — L4 extended list including maxSteps.
 *             Permanent regression anchor for forbidden API surface.
 *
 * RT-L4-007: hasToolCall imported when Agent uses hasToolCall stop condition.
 *             Catches accidental drop of hasToolCall from ai import.
 *
 * RT-L4-008: streamText( emits WITHOUT await (synchronous call).
 *             Catches regression to 'await streamText(' which changes semantics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { generate } from '../src/codegen/generate'

// Fixtures
import streamTextBasicFixture from './fixtures/stream-text-basic.json'
import agentMultiStepFixture from './fixtures/agent-multi-step.json'
import agentHasToolCallStopFixture from './fixtures/agent-has-tool-call-stop.json'
import generateTextWithToolFixture from './fixtures/generate-text-with-tool.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers all blocks (L2/L3 carried forward + L4 new)
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'
import '../src/blocks/tool'
import '../src/blocks/zod-object'
import '../src/blocks/zod-field'
import '../src/blocks/use-tools'
import '../src/blocks/generate-object'
import '../src/blocks/stop-condition'
import '../src/blocks/stream-text'
import '../src/blocks/stream-sink'
import '../src/blocks/agent'
import '../src/blocks/for-each'

// ─── RT-L4-001: Snapshot lock ─────────────────────────────────────────────────

describe('RT-L4-001: snapshot lock — all L4 fixtures', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('stream-text-basic fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('agent-multi-step fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('agent-has-tool-call-stop fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('generate-text-with-tool fixture snapshot locked (L3 forward)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })
})

// ─── RT-L4-002: Version-pin assertion ─────────────────────────────────────────

describe('RT-L4-002: version-pin assertion', () => {
  it('package.json pins ai@6.0.184', () => {
    const pkgPath = join(import.meta.dirname ?? __dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['ai']).toBe('6.0.184')
  })

  it('package.json pins blockly@12.5.1', () => {
    const pkgPath = join(import.meta.dirname ?? __dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['blockly']).toBe('12.5.1')
  })
})

// ─── RT-L4-003: stepCountIs in every Agent program ────────────────────────────

describe('RT-L4-003: stepCountIs in every emitted Agent program', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('agent-multi-step fixture emits stepCountIs(', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(
      code,
      'Expected "stepCountIs(" in agent code — Agent block must always emit a stop condition'
    ).toContain('stepCountIs(')
  })

  it('agent-has-tool-call-stop fixture uses hasToolCall (not stepCountIs)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // When hasToolCall is explicitly configured, use that (not stepCountIs)
    expect(code).toContain("hasToolCall('weather')")
    expect(code).toContain('stopWhen:')
    // Should NOT have stepCountIs when hasToolCall is explicitly set
    expect(code).not.toContain('stepCountIs(')
  })
})

// ─── RT-L4-004: for await ... of .textStream in StreamSink ────────────────────

describe('RT-L4-004: for await ... of .textStream in StreamSink code', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('stream-text-basic fixture emits for await (... of ....textStream)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must use async iteration (for await)
    expect(
      code,
      'Expected "for await (" — StreamSink must use async iteration'
    ).toContain('for await (')

    // Must iterate over .textStream (not .fullStream)
    expect(
      code,
      'Expected ".textStream)" — StreamSink must use textStream, not fullStream'
    ).toContain('.textStream)')

    // Must NOT use .fullStream
    expect(
      code,
      'Found ".fullStream" — StreamSink must use .textStream (text chunks only)'
    ).not.toContain('.fullStream')
  })
})

// ─── RT-L4-005: No spurious imports (streamText and generateText used only when needed)

describe('RT-L4-005: streamText and generateText imported only when used', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('stream-text-basic: imports streamText, does NOT import generateText', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // streamText IS used → must be imported
    expect(
      code,
      'Expected "streamText" in imports for stream-text-basic fixture'
    ).toMatch(/import \{[^}]*streamText[^}]*\} from 'ai'/)

    // generateText NOT used in this fixture → must NOT be imported
    expect(
      code,
      'Found spurious "generateText" import in stream-only fixture — bundle size regression'
    ).not.toMatch(/import \{[^}]*generateText[^}]*\} from 'ai'/)
  })

  it('agent-multi-step: imports generateText, does NOT import streamText', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // generateText IS used → must be imported
    expect(
      code,
      'Expected "generateText" in imports for agent fixture'
    ).toMatch(/import \{[^}]*generateText[^}]*\} from 'ai'/)

    // streamText NOT used in this fixture → must NOT be imported
    expect(
      code,
      'Found spurious "streamText" import in agent-only fixture — bundle size regression'
    ).not.toMatch(/import \{[^}]*streamText[^}]*\} from 'ai'/)
  })
})

// ─── RT-L4-006: Forbidden-name grep (L4 extended) ────────────────────────────

describe('RT-L4-006: forbidden-name grep — L4 extended API surface guard', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  const forbiddenNames = [
    'parameters:',
    'generateObject(',
    'toDataStreamResponse',
    'CoreMessage',
    'experimental_streamText',
    'experimental_output',
    // L4 critical: these were the v4/v5 names
    'maxSteps:',
    'maxSteps',
  ]

  const fixtureEntries: Array<[string, typeof streamTextBasicFixture]> = [
    ['stream-text-basic', streamTextBasicFixture],
    ['agent-multi-step', agentMultiStepFixture],
    ['agent-has-tool-call-stop', agentHasToolCallStopFixture],
    ['generate-text-with-tool (L3 forward)', generateTextWithToolFixture],
  ]

  for (const [fixtureName, fixture] of fixtureEntries) {
    it(`fixture "${fixtureName}" emits no forbidden/deprecated API names`, () => {
      Blockly.Events.disable()
      Blockly.serialization.workspaces.load(fixture, workspace)
      Blockly.Events.enable()

      const code = generate(workspace)

      for (const forbidden of forbiddenNames) {
        expect(
          code,
          `Generated code from "${fixtureName}" uses deprecated/forbidden API name "${forbidden}" — fix src/blocks/ codegen`
        ).not.toContain(forbidden)
      }

      workspace.clear()
    })
  }
})

// ─── RT-L4-007: hasToolCall imported when stop condition uses hasToolCall ─────

describe('RT-L4-007: hasToolCall imported when used in stop condition', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('agent-has-tool-call-stop fixture imports hasToolCall from ai', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(
      code,
      'Expected "hasToolCall" in ai import — dropped from import statement would cause runtime error'
    ).toMatch(/import \{[^}]*hasToolCall[^}]*\} from 'ai'/)
  })
})

// ─── RT-L4-008: streamText emits WITHOUT await ────────────────────────────────

describe('RT-L4-008: streamText is NOT awaited (synchronous call)', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('stream-text-basic: streamText call is NOT preceded by await', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must NOT contain 'await streamText(' — streamText returns synchronously
    expect(
      code,
      'Found "await streamText(" — streamText must NOT be awaited (returns synchronously with async iterables)'
    ).not.toContain('await streamText(')

    // Must contain streamText( (without await)
    expect(code).toContain('streamText(')
  })
})
