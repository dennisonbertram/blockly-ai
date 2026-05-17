/**
 * route-handler.test.ts — L5
 *
 * Tests for POST /api/run route handler.
 *
 * BT-L5-001: POST with generate-text-basic.json → response body contains mocked text
 * BT-L5-002: POST with stream-text-basic.json → response body contains all 3 stream chunks
 * BT-L5-003: POST with agent-multi-step.json → response body contains final text after tool step
 * BT-L5-004: POST with malformed body → HTTP 400 or 500 with structured error (no stack trace leak)
 *
 * Strategy: import runEmitted directly and call it with fixture workspaceJson +
 * a MockLanguageModelV3 injected via the modelOverride escape hatch.
 * The handler itself is a thin wrapper; these tests exercise runEmitted + Response.
 *
 * No real LLM calls. MockLanguageModelV3 only.
 */

import { describe, it, expect } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { MockLanguageModelV3, mockValues, simulateReadableStream } from 'ai/test'

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

// Side-effect: registers built-in blocks
void libraryBlocks

// Import the executor under test (will fail until lib/execute/run-emitted.ts exists)
import { runEmitted } from '../lib/execute/run-emitted'

import generateTextBasicFixture from './fixtures/generate-text-basic.json'
import streamTextBasicFixture from './fixtures/stream-text-basic.json'
import agentMultiStepFixture from './fixtures/agent-multi-step.json'

/** L3-compatible v3 usage format */
const v3Usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: undefined, reasoning: undefined },
})

/**
 * Read entire response body as text.
 */
async function readBody(response: Response): Promise<string> {
  return response.text()
}

describe('route-handler — POST /api/run', () => {
  // ─── BT-L5-001: generateText basic ────────────────────────────────────────

  it('BT-L5-001: POST generate-text-basic → response body contains mocked text', async () => {
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues({
        content: [{ type: 'text' as const, text: 'Hello from mock!' }],
        finishReason: { unified: 'stop' as const },
        usage: v3Usage(5, 5),
      }),
    })

    const response = await runEmitted({
      workspaceJson: generateTextBasicFixture,
      modelOverride: mockModel,
    })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)

    const body = await readBody(response)
    expect(body).toContain('Hello from mock!')
  })

  // ─── BT-L5-002: streamText basic — 3 chunks ───────────────────────────────

  it('BT-L5-002: POST stream-text-basic → response body contains all 3 stream chunks', async () => {
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

    const response = await runEmitted({
      workspaceJson: streamTextBasicFixture,
      modelOverride: mockModel,
    })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)

    const body = await readBody(response)

    // All 3 chunks must be present in the body
    expect(body).toContain('chunk1')
    expect(body).toContain('chunk2')
    expect(body).toContain('chunk3')

    // Chunks must appear in order
    const idx1 = body.indexOf('chunk1')
    const idx2 = body.indexOf('chunk2')
    const idx3 = body.indexOf('chunk3')
    expect(idx1).toBeLessThan(idx2)
    expect(idx2).toBeLessThan(idx3)
  })

  // ─── BT-L5-003: multi-step agent → final text ─────────────────────────────

  it('BT-L5-003: POST agent-multi-step → response body contains final text after tool step', async () => {
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
          content: [{ type: 'text' as const, text: 'The weather in Tokyo is sunny.' }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(50, 20),
        },
      ),
    })

    const response = await runEmitted({
      workspaceJson: agentMultiStepFixture,
      modelOverride: mockModel,
    })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)

    const body = await readBody(response)
    expect(body).toContain('The weather in Tokyo is sunny.')
  })

  // ─── BT-L5-004: error path — malformed/unregistered block ─────────────────

  it('BT-L5-004: POST with null workspaceJson → response is 400 or 500 with structured error, no stack trace', async () => {
    const response = await runEmitted({
      workspaceJson: null,
      modelOverride: undefined,
    })

    // Must be a non-2xx error response
    expect(response.status).toBeGreaterThanOrEqual(400)

    const body = await readBody(response)

    // Body must be parseable JSON (structured error)
    let parsed: unknown
    expect(() => {
      parsed = JSON.parse(body)
    }).not.toThrow()

    // Must have an error field
    expect(parsed).toHaveProperty('error')

    // Must NOT contain a Node.js stack trace line (no "at Object." or ".ts:")
    expect(body).not.toMatch(/at Object\.\w+/)
    expect(body).not.toMatch(/\.ts:\d+:\d+/)
    expect(body).not.toMatch(/node_modules/)
  })
})
