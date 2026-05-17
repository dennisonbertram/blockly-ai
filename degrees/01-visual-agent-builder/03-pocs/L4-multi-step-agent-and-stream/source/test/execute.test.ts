/**
 * execute.test.ts — L4
 *
 * Integration tests: compile emitted module, execute with MockLanguageModelV3.
 *
 * ## Execution strategy: AsyncFunction with injected modules
 * Same pattern as L3 — strips ES module syntax, injects modules via new Function.
 * Extended to inject: generateText, streamText, tool, Output, z, stepCountIs,
 *   hasToolCall, simulateReadableStream, anthropic, openai.
 *
 * ## Key findings from probing (documented in surprises.md):
 * - text-delta chunk field is 'delta' not 'text' or 'textDelta'
 * - text-delta/text-start/text-end chunks need an 'id' field
 * - tool-call content.input must be a JSON string, not an object
 * - hasToolCall semantics: stops loop after first tool-call step; tool.execute() DOES run
 *   (result.toolResults has output), but model is NOT called again
 *
 * BT-L4-004: EXECUTE streamText with MockLanguageModelV3 streaming 3 chunks →
 *             StreamSink iterates and sink called 3 times.
 * BT-L4-005: EXECUTE multi-step Agent mock → tool-call first, then text →
 *             stopWhen stepCountIs(3) allows second step → final text to sink.
 * BT-L4-006: EXECUTE hasToolCall stop → after first tool-call step, loop halts →
 *             result.text is '' but toolResults contains weather data.
 * BT-L4-007: EXECUTE for-each → array ['a','b','c'] → body emits each → sink called 3 times.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { MockLanguageModelV3, mockValues, simulateReadableStream } from 'ai/test'
import { generateText, streamText, tool, Output, stepCountIs, hasToolCall } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

import { generate } from '../src/codegen/generate'

import streamTextBasicFixture from './fixtures/stream-text-basic.json'
import agentMultiStepFixture from './fixtures/agent-multi-step.json'
import agentHasToolCallStopFixture from './fixtures/agent-has-tool-call-stop.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers L2/L3 blocks (carried forward)
import '../src/blocks/model'
import '../src/blocks/prompt'
import '../src/blocks/generate-text'
import '../src/blocks/output-sink'
import '../src/blocks/tool'
import '../src/blocks/zod-object'
import '../src/blocks/zod-field'
import '../src/blocks/use-tools'
import '../src/blocks/generate-object'

// Side-effect: registers L4 blocks
import '../src/blocks/stop-condition'
import '../src/blocks/stream-text'
import '../src/blocks/stream-sink'
import '../src/blocks/agent'
import '../src/blocks/for-each'

/**
 * Strip ES module syntax from emitted source and return a callable async function.
 * Extended from L3 to inject L4 modules: streamText, hasToolCall, simulateReadableStream.
 */
function buildRunnable(source: string): (
  opts?: { model?: unknown; sink?: (label: string, value: unknown) => void; [key: string]: unknown }
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
  const argsAndBody = 'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai'
  const syncFactory = new SyncFunction(argsAndBody, wrappedBody) as (
    gt: typeof generateText,
    st: typeof streamText,
    t: typeof tool,
    o: typeof Output,
    zodLib: typeof z,
    sci: typeof stepCountIs,
    htc: typeof hasToolCall,
    anth: typeof anthropic,
    oai: typeof openai
  ) => (opts?: { model?: unknown; sink?: (label: string, value: unknown) => void; [key: string]: unknown }) => Promise<void>

  return syncFactory(generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai)
}

/** L3-compatible v3 usage format */
const v3Usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: undefined, reasoning: undefined },
})

describe('execute emitted L4 modules', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
  })

  // BT-L4-004: streamText with MockLanguageModelV3 streaming 3 chunks
  it('BT-L4-004: streamText 3-chunk mock → StreamSink iterates, sink called 3 times', async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    // Streaming mock: 3 text-delta chunks
    // Key: use 'delta' field (not 'text' or 'textDelta') — discovered via runtime probe
    // Each chunk needs an 'id' field for the text-start/delta/end triplet
    const mockModel = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 'text-1' },
            { type: 'text-delta', id: 'text-1', delta: 'chunk1' },
            { type: 'text-delta', id: 'text-1', delta: 'chunk2' },
            { type: 'text-delta', id: 'text-1', delta: 'chunk3' },
            { type: 'text-end', id: 'text-1' },
            {
              type: 'finish',
              finishReason: { unified: 'stop' as const },
              usage: v3Usage(5, 5),
            },
          ],
          initialDelayInMs: 0,
          chunkDelayInMs: 0,
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
        request: {},
      }),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const sink = (label: string, value: unknown) => {
      results.push({ label, value })
    }

    const run = buildRunnable(source)
    await run({ model: mockModel, sink })

    // Sink should be called once per text-delta chunk (3 times)
    expect(results).toHaveLength(3)
    expect(results[0].label).toBe('out')
    expect(results[0].value).toBe('chunk1')
    expect(results[1].value).toBe('chunk2')
    expect(results[2].value).toBe('chunk3')
  })

  // BT-L4-005: multi-step Agent — tool-call + text response
  it('BT-L4-005: multi-step Agent → mock tool-call then text → stepCountIs(3) allows 2nd step → final text to sink', async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues(
        {
          content: [{
            type: 'tool-call' as const,
            toolName: 'weather',
            toolCallId: 'tc_1',
            input: JSON.stringify({ city: 'Tokyo' }),
          }],
          finishReason: { unified: 'tool-calls' as const },
          usage: v3Usage(20, 10),
        },
        {
          content: [{ type: 'text' as const, text: 'The weather in Tokyo is 70°F.' }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(50, 20),
        },
      ),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const sink = (label: string, value: unknown) => {
      results.push({ label, value })
    }

    const run = buildRunnable(source)
    await run({ model: mockModel, sink })

    // Model should be called twice (tool-call step + text step)
    expect(mockModel.doGenerateCalls.length).toBeGreaterThanOrEqual(2)

    // Sink receives final text
    expect(results).toHaveLength(1)
    expect(results[0].label).toBe('output')
    expect(results[0].value).toBe('The weather in Tokyo is 70°F.')
  })

  // BT-L4-006: hasToolCall stop condition
  it("BT-L4-006: hasToolCall('weather') → loop halts after 1 step, tool executes, result.text is empty", async () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()

    const source = generate(workspace)

    // hasToolCall semantics (verified via runtime probe):
    // - Loop stops AFTER the tool-call step (model called only once)
    // - The tool.execute() IS invoked (toolResults has output)
    // - Model is NOT called again to process the result
    // - result.text is '' (no text response was generated)
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues(
        {
          content: [{
            type: 'tool-call' as const,
            toolName: 'weather',
            toolCallId: 'tc_1',
            input: JSON.stringify({ city: 'Tokyo' }),
          }],
          finishReason: { unified: 'tool-calls' as const },
          usage: v3Usage(20, 10),
        },
      ),
    })

    const results: Array<{ label: string; value: unknown }> = []
    const sink = (label: string, value: unknown) => {
      results.push({ label, value })
    }

    const run = buildRunnable(source)
    await run({ model: mockModel, sink })

    // Model called exactly once — loop halted by hasToolCall
    expect(mockModel.doGenerateCalls).toHaveLength(1)

    // The sink receives '' (empty text from agent block)
    // Agent block emits (await generateText({...})).text
    // Since the loop stopped after the tool-call step, .text is ''
    expect(results).toHaveLength(1)
    expect(results[0].label).toBe('output')
    expect(results[0].value).toBe('')
  })

  // BT-L4-007: ForEach over array
  it("BT-L4-007: ForEach over ['a','b','c'] → sink called 3 times with each element", async () => {
    // Build a workspace manually with ForEach block.
    // We use VAR = '__item' and ITERABLE = '__testArr' (a variable name).
    // The ai_prompt block wraps its text in single quotes, so to inject an array
    // we provide '__testArr' as the prompt text — this generates the string
    // "'__testArr'" but we then replace that literal with the real array expression
    // in the source before executing. This tests that for-each correctly iterates
    // an array while keeping the test fully self-contained (pure JS, no model).
    const ws2 = new Blockly.Workspace()
    try {
      // Build the fixture JSON inline for ForEach
      const forEachFixture = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'ai_for_each',
              id: 'fe-1',
              x: 50,
              y: 50,
              fields: {
                VAR: '__item',
              },
              inputs: {
                ITERABLE: {
                  block: {
                    type: 'ai_prompt',
                    id: 'arr-1',
                    fields: {
                      // This will be replaced in source with the actual array
                      TEXT: '__L4_TEST_ARRAY__',
                    },
                  },
                },
                BODY: {
                  block: {
                    type: 'ai_output_sink',
                    id: 'sink-body-1',
                    fields: {
                      LABEL: 'item',
                    },
                    inputs: {
                      VALUE: {
                        block: {
                          type: 'ai_prompt',
                          id: 'val-1',
                          fields: {
                            // This references the loop variable directly;
                            // the ai_prompt wraps it but buildRunnable strips quotes
                            // when treating it as an identifier is unnecessary here —
                            // we use __item directly via __sink
                            TEXT: '',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      }

      Blockly.Events.disable()
      Blockly.serialization.workspaces.load(forEachFixture, ws2)
      Blockly.Events.enable()

      let source = generate(ws2)

      // Must emit a for...of loop
      expect(source).toContain('for (const __item of')

      // Replace the placeholder string with an actual array literal expression.
      // This is necessary because ai_prompt wraps text in single quotes, making
      // it a string, not an array. The test verifies for-each semantics, not
      // prompt block semantics.
      source = source.replace("'__L4_TEST_ARRAY__'", "['a','b','c']")

      // Also fix the empty sink value to use the loop variable directly
      source = source.replace("__sink?.('item', '')", "__sink?.('item', __item)")

      // Execute it
      const results: Array<{ label: string; value: unknown }> = []
      const sink = (label: string, value: unknown) => {
        results.push({ label, value })
      }

      const run = buildRunnable(source)
      await run({ sink })

      expect(results).toHaveLength(3)
      expect(results[0].label).toBe('item')
      expect(results[0].value).toBe('a')
      expect(results[1].value).toBe('b')
      expect(results[2].value).toBe('c')
    } finally {
      Blockly.Events.disable()
      ws2.dispose()
      Blockly.Events.enable()
    }
  })
})
