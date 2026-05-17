/**
 * execute.test.ts
 *
 * Integration tests: compile emitted module, execute with MockLanguageModelV3.
 * Uses temp-file + dynamic import strategy (see implementation-notes.md).
 *
 * BT-005: Execute emitted module with MockLanguageModelV3 → sink receives { label, value }
 * BT-006: Execute with system prompt → mock model's doGenerate called with both system+prompt
 * BT-007: MockLanguageModelV3 import resolves from 'ai/test'
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { tmpdir } from 'node:os'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// BT-007: Smoke test — MockLanguageModelV3 import resolves
import { MockLanguageModelV3 } from 'ai/test'

import { generate } from '../src/codegen/generate'

// Fixtures
import singleGenerateTextFixture from './fixtures/single-generate-text.json'
import generateTextWithSystemFixture from './fixtures/generate-text-with-system.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2 custom blocks + generators
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'

// BT-007
it('MockLanguageModelV3 import resolves from ai/test', () => {
  expect(typeof MockLanguageModelV3).toBe('function')
})

/**
 * Helper: write emitted source to a temp .mjs file and dynamically import it.
 * Returns the default export (the run() function).
 * Cleans up the temp file after the test.
 */
async function loadEmittedModule(source: string): Promise<{
  run: (opts?: { model?: unknown; sink?: (label: string, value: unknown) => void }) => Promise<void>
  tempPath: string
}> {
  const tempPath = join(tmpdir(), `blockly-l2-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
  writeFileSync(tempPath, source, 'utf-8')
  const mod = await import(`file://${tempPath}`)
  return { run: mod.default, tempPath }
}

describe('execute emitted module', () => {
  let workspace: Blockly.Workspace
  const tempFiles: string[] = []

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
    // Clean up temp files
    for (const f of tempFiles) {
      if (existsSync(f)) {
        try { unlinkSync(f) } catch { /* ignore */ }
      }
    }
    tempFiles.length = 0
  })

  // BT-005
  it('execute: MockLanguageModelV3 returning mocked-response → sink receives { label: "output", value: "mocked-response" }', async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(singleGenerateTextFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    const mockModel = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: 'mocked-response' }],
        finishReason: 'stop' as const,
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      }),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const sink = (label: string, value: unknown) => {
      results.push({ label, value })
    }

    const { run, tempPath } = await loadEmittedModule(source)
    tempFiles.push(tempPath)

    await run({ model: mockModel, sink })

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ label: 'output', value: 'mocked-response' })
  })

  // BT-006
  it('execute with system prompt → doGenerate called with both system and prompt in messages', async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithSystemFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    const mockModel = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: 'system-test-response' }],
        finishReason: 'stop' as const,
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      }),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const { run, tempPath } = await loadEmittedModule(source)
    tempFiles.push(tempPath)

    await run({ model: mockModel, sink: (label, value) => results.push({ label, value }) })

    // The mock model should have been called
    expect(mockModel.doGenerateCalls).toHaveLength(1)

    // Inspect what was sent to the model — should contain a system message
    const call = mockModel.doGenerateCalls[0]
    // The prompt array should contain a system message role
    const hasSystem = call.prompt.some(
      (msg: { role: string }) => msg.role === 'system'
    )
    expect(hasSystem).toBe(true)

    // And the output should flow through the sink
    expect(results).toHaveLength(1)
    expect(results[0].value).toBe('system-test-response')
  })
})
