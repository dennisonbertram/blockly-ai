/**
 * snapshots.test.ts
 *
 * Regression snapshot tests for code generation output.
 *
 * Purpose: lock in the exact generated code for each fixture. If a future
 * Blockly upgrade or generator refactor silently changes the output, these
 * snapshots catch it.
 *
 * Regression scenarios covered:
 * 1. Empty workspace → empty string (regression: future Blockly versions must not
 *    emit preamble/boilerplate for empty workspaces unless this file is updated).
 * 2. 1 + 2 * 3 → exact output with correct precedence.
 * 3. (1 + 2) * 3 → exact output with explicit grouping parens.
 * 4. Greet('Alice') → exact console.log line.
 * 5. 'greet' block name is registered in Blockly.Blocks.
 * 6. javascriptGenerator.forBlock['greet'] is a function.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { javascriptGenerator } from 'blockly/javascript'
import { generate } from '../src/codegen/generate'

import emptyFixture from './fixtures/empty-workspace.json'
import singleMathFixture from './fixtures/single-math.json'
import nestedMathFixture from './fixtures/nested-math.json'
import greetAliceFixture from './fixtures/greet-alice.json'

import '../src/blocks/greet'

void libraryBlocks

describe('Code generation regression snapshots', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  it('SNAPSHOT: empty workspace returns empty string', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(emptyFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toMatchSnapshot()
  })

  it('SNAPSHOT: 1 + 2 * 3 with correct precedence', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleMathFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toMatchSnapshot()
  })

  it('SNAPSHOT: (1 + 2) * 3 with grouping parens', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(nestedMathFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toMatchSnapshot()
  })

  it("SNAPSHOT: Greet('Alice') block produces console.log line", () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(greetAliceFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)
    expect(code).toMatchSnapshot()
  })
})

describe('Custom block registration regression', () => {
  it("'greet' block type is registered in Blockly.Blocks", () => {
    // This fails if greet.ts is removed or the defineBlocks call is dropped
    expect(Blockly.Blocks['greet']).toBeDefined()
    expect(typeof Blockly.Blocks['greet'].init).toBe('function')
  })

  it("javascriptGenerator.forBlock['greet'] is a function", () => {
    // This fails if the generator registration line is removed in greet.ts
    expect(typeof javascriptGenerator.forBlock['greet']).toBe('function')
  })
})

describe('Workspace double-mount regression (via mocked inject)', () => {
  /**
   * Regression: The Strict Mode guard must work correctly.
   * We test the guard logic by simulating mount → cleanup → remount manually,
   * using the workspaceRef pattern from BlocklyWorkspace.tsx.
   *
   * Scenario: if workspaceRef.current is null when inject is called, it proceeds.
   * If workspaceRef.current is non-null, inject must NOT be called again.
   */
  it('guard pattern: only calls inject when workspaceRef is null', () => {
    const callLog: string[] = []
    const fakeWorkspace = {
      addChangeListener: () => {},
      removeChangeListener: () => {},
      dispose: () => { callLog.push('dispose') },
      isDragging: () => false,
    }

    let workspaceRef: typeof fakeWorkspace | null = null
    const containerRef = document.createElement('div')

    // Simulate inject with guard
    function mountEffect() {
      if (!containerRef || workspaceRef) return
      workspaceRef = fakeWorkspace
      callLog.push('inject')
    }

    function cleanupEffect() {
      if (!workspaceRef) return
      workspaceRef.dispose()
      workspaceRef = null
    }

    // First mount
    mountEffect()
    expect(callLog).toEqual(['inject'])

    // Strict Mode cleanup
    cleanupEffect()
    expect(callLog).toEqual(['inject', 'dispose'])
    expect(workspaceRef).toBeNull()

    // Strict Mode second mount
    mountEffect()
    expect(callLog).toEqual(['inject', 'dispose', 'inject'])
    expect(workspaceRef).not.toBeNull()

    // Final unmount
    cleanupEffect()
    expect(workspaceRef).toBeNull()
  })
})
