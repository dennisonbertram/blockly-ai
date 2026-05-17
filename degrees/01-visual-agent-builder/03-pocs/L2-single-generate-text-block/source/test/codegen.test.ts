/**
 * codegen.test.ts
 *
 * Golden-output / behavioral tests for the async code generator.
 *
 * BT-001: empty workspace → emitted code contains import header + empty run() shell
 * BT-002: single-generate-text fixture → correct import statements + await generateText call
 * BT-003: generate-text-with-system fixture → system: field present in generateText call
 * BT-004: generate-text-openai fixture → openai import + openai('gpt-4o-mini') in emitted code
 * BT-008: forbidden-name grep → no deprecated v4/v5 API names appear in any emitted code
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

// These imports will fail until implementation files exist — that IS the RED state.
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

describe('generate(workspace) — async codegen', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  // BT-001
  it('empty workspace → emitted code has import header and empty run() shell', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(emptyFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must contain the standard AI SDK imports
    expect(code).toContain("import { generateText } from 'ai'")
    // Must export an async function named run
    expect(code).toContain('export default async function run(')
    // Must contain the destructured parameter
    expect(code).toContain('__model_provider')
    expect(code).toContain('__sink')
  })

  // BT-002
  it('single-generate-text fixture → emitted code uses anthropic + await generateText', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleGenerateTextFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must have correct imports
    expect(code).toContain("import { generateText } from 'ai'")
    expect(code).toContain("import { anthropic } from '@ai-sdk/anthropic'")
    // Must NOT import openai in an anthropic-only workspace
    expect(code).not.toContain("from '@ai-sdk/openai'")
    // Must export async function
    expect(code).toContain('export default async function run(')
    // Must have the model expression
    expect(code).toContain("(__model_provider ?? anthropic('claude-haiku-4-5'))")
    // Must have await generateText call
    expect(code).toContain('await generateText(')
    // Must have the prompt
    expect(code).toContain("prompt: 'Hello'")
    // Must access .text on the result
    expect(code).toContain('.text')
    // Must call __sink (with optional chaining to guard against no-sink case)
    expect(code).toContain("__sink")
    expect(code).toContain("'output'")
  })

  // BT-003
  it('generate-text-with-system fixture → emitted code includes system: field', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithSystemFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must have system: field in the generateText call
    expect(code).toContain('system:')
    expect(code).toContain("'You are a helpful assistant.'")
    expect(code).toContain('await generateText(')
  })

  // BT-004
  it('generate-text-openai fixture → imports openai + uses openai constructor', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextOpenaiFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must import from @ai-sdk/openai
    expect(code).toContain("import { openai } from '@ai-sdk/openai'")
    // Must NOT import anthropic
    expect(code).not.toContain("from '@ai-sdk/anthropic'")
    // Must use openai constructor
    expect(code).toContain("(__model_provider ?? openai('gpt-4o-mini'))")
    expect(code).toContain('await generateText(')
  })

  // BT-008 (also used as regression test)
  it('forbidden-name grep → no deprecated v4/v5 API names appear in emitted code', () => {
    // Test with multiple fixtures to be thorough
    const fixtures = [
      emptyFixture,
      singleGenerateTextFixture,
      generateTextWithSystemFixture,
      generateTextOpenaiFixture,
    ]

    const forbiddenNames = [
      'parameters:',
      'maxSteps',
      'generateObject(',
      'toDataStreamResponse',
      'CoreMessage',
      'experimental_streamText',
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
              `Generated code uses deprecated AI SDK API name "${forbidden}" — ` +
              `fix the codegen template in src/codegen/`
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
