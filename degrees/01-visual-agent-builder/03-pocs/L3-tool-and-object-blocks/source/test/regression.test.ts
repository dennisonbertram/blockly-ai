/**
 * regression.test.ts — L3
 *
 * Regression tests that would fail if the GREEN commit (bac68d9) is reverted.
 *
 * RT-001: Snapshot lock — generated code for all fixtures matches stored snapshots.
 *         Locked at the GREEN state. Snapshot changes require deliberate human review.
 *
 * RT-002: Version-pin assertion — package.json must have exact AI SDK + Blockly pins.
 *
 * RT-003: Output.object( appears in generate-object emitted code.
 *         Catches accidental regression to deprecated generateObject().
 *
 * RT-004: inputSchema: appears in emitted tool definitions.
 *         Catches accidental regression to v4 'parameters:' API name.
 *
 * RT-005: tools: { appears in emitted code when a tool is wired to GenerateText.
 *         Catches accidental drop of the tools map.
 *
 * RT-006: Forbidden-name grep (L3 extended list).
 *         Permanent regression anchor for the forbidden API surface.
 *
 * RT-007: .nullable() appears (not .optional()) for optional ZodField.
 *         Catches regression to .optional() which breaks OpenAI strict mode.
 *
 * RT-008: toolChoice: 'auto' emitted when tools are present.
 *         Catches accidental drop of toolChoice.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { generate } from '../src/codegen/generate'

// Fixtures
import toolOnlyFixture from './fixtures/tool-only.json'
import generateTextWithToolFixture from './fixtures/generate-text-with-tool.json'
import generateObjectFixture from './fixtures/generate-object.json'
import generateObjectOptionalFieldFixture from './fixtures/generate-object-optional-field.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers custom blocks + generators
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'
import '../src/blocks/tool'
import '../src/blocks/zod-object'
import '../src/blocks/zod-field'
import '../src/blocks/use-tools'
import '../src/blocks/generate-object'

// ─── RT-001: Snapshot lock ────────────────────────────────────────────────────

describe('RT-001: snapshot lock — generated code for all L3 fixtures', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('tool-only fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(toolOnlyFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('generate-text-with-tool fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('generate-object fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('generate-object-optional-field fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectOptionalFieldFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })
})

// ─── RT-002: Version-pin assertion ───────────────────────────────────────────

describe('RT-002: version-pin assertion', () => {
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

  it('package.json pins zod@^3.25.76', () => {
    const pkgPath = join(import.meta.dirname ?? __dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['zod']).toBe('^3.25.76')
  })
})

// ─── RT-003: Output.object( in generate-object emitted code ─────────────────

describe('RT-003: Output.object( in generate-object emitted code', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('generate-object fixture emits Output.object( at least once', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // The v6 API is Output.object({ schema }) — NOT generateObject()
    expect(
      code,
      'Expected "Output.object(" in generated code — regression to deprecated generateObject() detected'
    ).toContain('Output.object(')

    // Also must NOT contain the deprecated function call
    expect(
      code,
      'Deprecated "generateObject(" found in generated code — must use Output.object() instead'
    ).not.toContain('generateObject(')
  })
})

// ─── RT-004: inputSchema: in emitted tool definitions ────────────────────────

describe('RT-004: inputSchema: in emitted tool definitions', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('tool-only fixture emits inputSchema: (not parameters:)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(toolOnlyFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // v6 tool API uses inputSchema: — NOT parameters: (which was v3/v4)
    expect(
      code,
      'Expected "inputSchema:" in tool definition — regression to v4 "parameters:" detected'
    ).toContain('inputSchema:')

    expect(
      code,
      'Deprecated "parameters:" found in tool definition — must use "inputSchema:" (v6 API)'
    ).not.toContain('parameters:')
  })

  it('generate-text-with-tool fixture emits inputSchema: (not parameters:)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toContain('inputSchema:')
    expect(code).not.toContain('parameters:')
  })
})

// ─── RT-005: tools: { in emitted code when tool is wired ─────────────────────

describe('RT-005: tools map emitted when tool wired to GenerateText', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('generate-text-with-tool fixture emits "tools: {" in generateText call', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // The tools map must be present when a UseTools block is wired
    expect(
      code,
      'Expected "tools: {" in generated code — tools map dropped from generateText call'
    ).toContain('tools: {')
  })
})

// ─── RT-006: Forbidden-name grep (L3 extended) ───────────────────────────────

describe('RT-006: forbidden-name grep — L3 extended API surface guard', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

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

  const fixtureEntries: Array<[string, typeof toolOnlyFixture]> = [
    ['tool-only', toolOnlyFixture],
    ['generate-text-with-tool', generateTextWithToolFixture],
    ['generate-object', generateObjectFixture],
    ['generate-object-optional-field', generateObjectOptionalFieldFixture],
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

// ─── RT-007: .nullable() for optional ZodField ───────────────────────────────

describe('RT-007: optional ZodField emits .nullable() not .optional()', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('generate-object-optional-field fixture emits .nullable() for OPTIONAL=true field', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectOptionalFieldFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // OpenAI strict mode requires .nullable() not .optional()
    expect(
      code,
      'Expected ".nullable()" for optional field — regression to .optional() detected (breaks OpenAI strict mode)'
    ).toContain('.nullable()')

    expect(
      code,
      'Found ".optional()" — must use ".nullable()" for OpenAI strict mode compatibility'
    ).not.toContain('.optional()')
  })
})

// ─── RT-008: toolChoice: 'auto' when tools present ────────────────────────────

describe('RT-008: toolChoice: auto emitted when tools wired to GenerateText', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it("generate-text-with-tool fixture emits toolChoice: 'auto'", () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(
      code,
      "Expected \"toolChoice: 'auto'\" when tools are present — toolChoice dropped from generateText call"
    ).toContain("toolChoice: 'auto'")
  })
})
