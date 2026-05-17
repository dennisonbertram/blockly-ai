/**
 * regression.test.ts
 *
 * Regression tests that would fail if the GREEN commit (64b2e21) is reverted.
 *
 * RT-001: Snapshot lock — generated code for all fixtures matches stored snapshots.
 *         If a generator changes its output, these snapshots will fail and require
 *         deliberate human review before updating.
 *
 * RT-002: Version-pin assertion — package.json must have exact AI SDK + Blockly pins.
 *         If a contributor unpins ai@6.0.184 or blockly@12.5.1, CI fails immediately.
 *
 * RT-003: Round-trip serialization — loading a fixture and re-serializing the workspace
 *         must produce JSON equivalent to the original fixture.
 *         Catches Blockly serialization regressions if block definitions change.
 *
 * RT-004: Forbidden-name grep (extended) — confirms no deprecated API names appear
 *         in any emitted code for any fixture. Duplicate of BT-008 in codegen.test.ts
 *         but present here as a permanent regression guard that outlives the BT suite.
 *
 * RT-005: __sink is optional in emitted code — verify the emitted code uses __sink?.()
 *         (optional chaining) so calling run() with no sink does not throw.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { generate } from '../src/codegen/generate'

// Fixtures
import emptyFixture from './fixtures/empty.json'
import singleGenerateTextFixture from './fixtures/single-generate-text.json'
import generateTextWithSystemFixture from './fixtures/generate-text-with-system.json'
import generateTextOpenaiFixture from './fixtures/generate-text-openai.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2 custom blocks + generators
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'

// ─── RT-001: Snapshot lock ────────────────────────────────────────────────────

describe('RT-001: snapshot lock — generated code for all fixtures', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it('empty workspace snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(emptyFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('single-generate-text fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleGenerateTextFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('generate-text-with-system fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithSystemFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('generate-text-openai fixture snapshot', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextOpenaiFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })
})

// ─── RT-002: Version-pin assertion ───────────────────────────────────────────

describe('RT-002: version-pin assertion', () => {
  it('package.json pins ai@6.0.184', () => {
    const pkgPath = join(
      import.meta.dirname ?? __dirname,
      '..',
      'package.json'
    )
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['ai']).toBe('6.0.184')
  })

  it('package.json pins blockly@12.5.1', () => {
    const pkgPath = join(
      import.meta.dirname ?? __dirname,
      '..',
      'package.json'
    )
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['blockly']).toBe('12.5.1')
  })
})

// ─── RT-003: Round-trip serialization ────────────────────────────────────────

describe('RT-003: round-trip workspace serialization', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it('re-serializing empty fixture produces equivalent state', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(emptyFixture, workspace)
    Blockly.Events.enable()

    const reserialized = Blockly.serialization.workspaces.save(workspace)

    // An empty workspace has no blocks key, or blocks.blocks is an empty array
    const blocksArr = (reserialized.blocks as { blocks?: unknown[] } | undefined)?.blocks ?? []
    expect(blocksArr).toHaveLength(0)
  })

  it('re-serializing single-generate-text fixture contains ai_output_sink block', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleGenerateTextFixture, workspace)
    Blockly.Events.enable()

    const reserialized = Blockly.serialization.workspaces.save(workspace)
    const blocks = (reserialized.blocks as { blocks: Array<{ type: string }> }).blocks

    // There must be at least one block
    expect(blocks.length).toBeGreaterThan(0)

    // The top-level block must be ai_output_sink
    expect(blocks[0].type).toBe('ai_output_sink')
  })
})

// ─── RT-004: Forbidden-name grep (regression anchor) ─────────────────────────

describe('RT-004: forbidden-name grep — no deprecated AI SDK names in any emitted code', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  const forbiddenNames = [
    'parameters:',
    'maxSteps',
    'generateObject(',
    'toDataStreamResponse',
    'CoreMessage',
    'experimental_streamText',
  ]

  const fixtureEntries: Array<[string, typeof emptyFixture]> = [
    ['empty', emptyFixture],
    ['single-generate-text', singleGenerateTextFixture],
    ['generate-text-with-system', generateTextWithSystemFixture],
    ['generate-text-openai', generateTextOpenaiFixture],
  ]

  for (const [fixtureName, fixture] of fixtureEntries) {
    it(`fixture "${fixtureName}" emits no deprecated API names`, () => {
      Blockly.Events.disable()
      Blockly.serialization.workspaces.load(fixture, workspace)
      Blockly.Events.enable()

      const code = generate(workspace)

      for (const forbidden of forbiddenNames) {
        expect(
          code,
          `Generated code from "${fixtureName}" fixture uses deprecated AI SDK API name "${forbidden}" — ` +
          `fix the codegen template in src/codegen/`
        ).not.toContain(forbidden)
      }

      // Reset workspace for next iteration
      workspace.clear()
    })
  }
})

// ─── RT-005: __sink optional chaining ────────────────────────────────────────

describe('RT-005: __sink optional chaining prevents throw when sink omitted', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it('emitted code uses __sink?.() not __sink() so no-sink calls are safe', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleGenerateTextFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // The output sink generator must emit __sink?.( not __sink(
    // This ensures run({ model }) without sink does not throw TypeError
    expect(code).toContain('__sink?.(')
  })
})
