/**
 * codegen.test.ts
 *
 * Golden-output / behavioral tests for generate.ts.
 * Tests run against headless Blockly.Workspace (no DOM required for codegen).
 *
 * BT-001: empty workspace → empty string (or empty shell — stable representation)
 * BT-002: 1 + 2 * 3 → correct precedence, no unnecessary parens around 2*3
 * BT-003: (1 + 2) * 3 → parens ARE emitted around 1+2 because multiply binds tighter
 * BT-004: greet('Alice') block → console.log line with 'Alice'
 * BT-006: malformed fixture → no throw, returns empty string or placeholder with warning
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { generate } from '../src/codegen/generate'

// Fixtures
import emptyFixture from './fixtures/empty-workspace.json'
import singleMathFixture from './fixtures/single-math.json'
import nestedMathFixture from './fixtures/nested-math.json'
import greetAliceFixture from './fixtures/greet-alice.json'

// Silence unused import warning — libraryBlocks registers itself on import
void libraryBlocks

// Registration of custom blocks + generators happens inside the implementation files.
// We import them here so registration side-effects run.
// These imports will fail until the implementation files exist — that's the RED state.
import '../src/blocks/greet'

describe('generate(workspace)', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  // BT-001
  it('returns empty string when workspace is empty', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(emptyFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toBe('')
  })

  // BT-002
  it('generates 1 + 2 * 3 with correct precedence — no parens around 2*3', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleMathFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    // Must produce: 1 + 2 * 3
    // Must NOT produce: 1 + (2 * 3)  — no unnecessary parens
    expect(code).toContain('1 + 2 * 3')
    expect(code).not.toContain('1 + (2 * 3)')
  })

  // BT-003
  it('generates (1 + 2) * 3 with explicit grouping parens when addition is left operand of multiply', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(nestedMathFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    // Must produce: (1 + 2) * 3
    expect(code).toContain('(1 + 2) * 3')
  })

  // BT-004
  it("generates console.log line with 'Alice' for Greet('Alice') block", () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(greetAliceFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toContain("console.log('Hello, ' + 'Alice')")
  })

  // BT-006
  it('does NOT throw on malformed workspace fixture — returns empty string or placeholder', () => {
    const malformedState = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'nonexistent_block_type_xyz',
            id: 'bad-1',
            x: 0,
            y: 0,
          },
        ],
      },
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Blockly.serialization.workspaces.load throws for unknown block types.
    // The defensive contract is: generate() itself never throws.
    // We load the malformed state in a try/catch, then call generate().
    let code: string | undefined
    Blockly.Events.disable()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Blockly.serialization.workspaces.load(malformedState as any, workspace)
    } catch {
      // Expected: Blockly throws for unknown block types.
      // The workspace is left empty — generate() will return ''.
    } finally {
      Blockly.Events.enable()
    }

    // generate() must NOT throw, even on a partially-loaded or empty workspace
    expect(() => {
      code = generate(workspace)
    }).not.toThrow()

    expect(typeof code).toBe('string')

    warnSpy.mockRestore()
  })
})
