/**
 * execute.test.ts — L3
 *
 * Integration tests: compile emitted module, execute with MockLanguageModelV3.
 *
 * ## Execution strategy: AsyncFunction with injected modules
 * Same pattern as L2 — strips ES module syntax, injects modules via new Function.
 * Extended to inject: generateText, tool, Output, z, anthropic, openai.
 *
 * BT-005: compile generate-object emitted module with MockLanguageModelV3 →
 *         mock returns JSON text → sink receives the parsed object.
 * BT-006: compile generate-text-with-tool emitted module, mock model returns tool-call →
 *         tool execute() runs → second mock response returns final text → sink receives text.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { MockLanguageModelV3, mockValues } from 'ai/test'
import { generateText, tool, Output, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

import { generate } from '../src/codegen/generate'

import generateObjectFixture from './fixtures/generate-object.json'
import generateTextWithToolFixture from './fixtures/generate-text-with-tool.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2 custom blocks + generators
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'

// Side-effect: registers L3 custom blocks + generators
import '../src/blocks/tool'
import '../src/blocks/zod-object'
import '../src/blocks/zod-field'
import '../src/blocks/use-tools'
import '../src/blocks/generate-object'

/**
 * Strip ES module syntax from emitted source and return a callable async function.
 * Extended from L2 to inject L3 modules: tool, Output, z, stepCountIs.
 */
function buildRunnable(source: string): (
  opts?: { model?: unknown; sink?: (label: string, value: unknown) => void }
) => Promise<void> {
  // Remove import statement lines
  const noImports = source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n')

  // Remove `export default` keyword, keep `async function run`
  const noExport = noImports.replace('export default async function run', 'async function run')

  // Wrap: inject modules + return the run function
  const wrappedBody = `
${noExport}
return run;
`

  // Build factory function with injected module params.
  // Use single-argument form of new Function to avoid happy-dom multi-arg issues.
  const SyncFunction = Function
  const argsAndBody = 'generateText, tool, Output, z, stepCountIs, anthropic, openai'
  const syncFactory = new SyncFunction(argsAndBody, wrappedBody) as (
    gt: typeof generateText,
    t: typeof tool,
    o: typeof Output,
    zodLib: typeof z,
    sci: typeof stepCountIs,
    anth: typeof anthropic,
    oai: typeof openai
  ) => (opts?: { model?: unknown; sink?: (label: string, value: unknown) => void }) => Promise<void>

  return syncFactory(generateText, tool, Output, z, stepCountIs, anthropic, openai)
}

describe('execute emitted L3 modules', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  // BT-005: generate-object with mock model returning JSON
  it('BT-005: generate-object → MockLanguageModelV3 returning JSON text → sink receives parsed object', async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateObjectFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    // Mock model returns valid JSON matching the schema { title, summary, tags }
    const mockModel = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: '{"title":"AI Overview","summary":"AI is transformative","tags":["ml","ai"]}' }],
        finishReason: 'stop' as const,
        usage: { inputTokens: 20, outputTokens: 20, totalTokens: 40 },
      }),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const sink = (label: string, value: unknown) => {
      results.push({ label, value })
    }

    const run = buildRunnable(source)
    await run({ model: mockModel, sink })

    // The sink should receive the parsed object (not the JSON string)
    expect(results).toHaveLength(1)
    expect(results[0].label).toBe('structured')
    const received = results[0].value as { title: string; summary: string; tags: string[] }
    expect(received.title).toBe('AI Overview')
    expect(received.summary).toBe('AI is transformative')
    expect(received.tags).toEqual(['ml', 'ai'])
  })

  // BT-006: generate-text-with-tool → tool execute runs → final text via sink
  it('BT-006: generate-text-with-tool → mock returns tool-call → execute runs → final text to sink', async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextWithToolFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    // Step 1: model calls the 'weather' tool
    // Step 2: model responds with text after seeing tool result
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues([
        {
          content: [{
            type: 'tool-call' as const,
            toolName: 'weather',
            toolCallId: 'tc_1',
            input: { city: 'Paris' },
          }],
          finishReason: 'tool-calls' as const,
          usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
        },
        {
          content: [{ type: 'text' as const, text: 'The weather in Paris is sunny and 70°F.' }],
          finishReason: 'stop' as const,
          usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
        },
      ]),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const sink = (label: string, value: unknown) => {
      results.push({ label, value })
    }

    const run = buildRunnable(source)
    await run({ model: mockModel, sink })

    // The mock model should have been called twice (tool-call + final response)
    expect(mockModel.doGenerateCalls.length).toBeGreaterThanOrEqual(2)

    // Sink should receive the final text
    expect(results).toHaveLength(1)
    expect(results[0].label).toBe('output')
    expect(results[0].value).toBe('The weather in Paris is sunny and 70°F.')
  })
})
