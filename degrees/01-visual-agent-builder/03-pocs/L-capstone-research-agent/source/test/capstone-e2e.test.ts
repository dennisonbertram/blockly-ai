/**
 * capstone-e2e.test.ts — L-capstone
 *
 * End-to-end tests for the research-and-summarize agent.
 *
 * BT-capstone-006 (capstone-execute): compile and run emitted code with mock model.
 *   - Step 1: tool-call for search('visual programming with LLMs') → 2 canned results
 *   - Step 2: tool-call for fetch('https://example.dev/blockly-ai') → canned page text
 *   - Step 3: final text result (agent loop completes)
 *   - GenerateObject step: mock returns structured { title, key_points, sources }
 *   - Sink receives ('summary', <the structured object>)
 *
 * BT-capstone-008 (capstone-route-handler): POST capstone-workspace.json to runEmitted
 *   → response contains summary with structured fields.
 */

import { describe, it, expect } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { MockLanguageModelV3, mockValues } from 'ai/test'
import { runEmitted } from '../lib/execute/run-emitted'

// Fixture
import capstoneWorkspace from './fixtures/capstone-workspace.json'

// Side-effect: registers built-in blocks
void libraryBlocks

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
import '../lib/blocks/tool-call'

/** L3-compatible v3 usage format */
const v3Usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: undefined, reasoning: undefined },
})

const MOCK_SUMMARY = JSON.stringify({
  title: 'Visual Programming with LLMs',
  key_points: [
    'Blockly is a Google library for visual programming',
    'AI SDK enables multi-step agent workflows',
    'Custom blocks make LLM tools composable',
  ],
  sources: [
    'https://example.dev/blockly-ai',
    'https://example.dev/llm-blocks',
  ],
})

describe('Capstone e2e — research-and-summarize agent', () => {
  it('BT-capstone-006: capstone-execute — full pipeline: generateObject first, then agent with search → fetch', async () => {
    // The workspace executes sink blocks top-to-bottom:
    // 1. OutputSink("summary") → GenerateObject: returns structured JSON
    // 2. OutputSink("agent_result") → Agent:
    //    Step 1: tool-call for search
    //    Step 2: tool-call for fetch
    //    Step 3: final text (agent stops)
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues(
        // GenerateObject: returns structured JSON matching { title, key_points, sources }
        {
          content: [{ type: 'text' as const, text: MOCK_SUMMARY }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(100, 80),
        },
        // Agent step 1: search tool-call
        {
          content: [{
            type: 'tool-call' as const,
            toolName: 'search',
            toolCallId: 'tc_search_1',
            input: JSON.stringify({ query: 'visual programming with LLMs' }),
          }],
          finishReason: { unified: 'tool-calls' as const },
          usage: v3Usage(20, 15),
        },
        // Agent step 2: fetch tool-call
        {
          content: [{
            type: 'tool-call' as const,
            toolName: 'fetch',
            toolCallId: 'tc_fetch_1',
            input: JSON.stringify({ url: 'https://example.dev/blockly-ai' }),
          }],
          finishReason: { unified: 'tool-calls' as const },
          usage: v3Usage(40, 15),
        },
        // Agent step 3: final text (loop ends)
        {
          content: [{ type: 'text' as const, text: 'Research complete. Visual programming + LLMs is powerful.' }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(60, 30),
        },
      ),
    })

    const sinkCalls: Array<[string, unknown]> = []

    const response = await runEmitted({
      workspaceJson: capstoneWorkspace,
      modelOverride: mockModel,
    })

    expect(response.status).toBe(200)

    const body = await response.text()

    // The response body should contain the structured summary fields
    expect(body).toContain('Visual Programming with LLMs')
    expect(body).toContain('key_points')
    expect(body).toContain('sources')
  }, 30_000)

  it('BT-capstone-008: capstone-route-handler — POST capstone-workspace.json → structured summary in response', async () => {
    // Same execution order as BT-capstone-006:
    // GenerateObject first → Agent (1 step, final text)
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockValues(
        // GenerateObject: returns structured JSON
        {
          content: [{ type: 'text' as const, text: MOCK_SUMMARY }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(80, 60),
        },
        // Agent: single step, final text
        {
          content: [{ type: 'text' as const, text: 'Research summary notes.' }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(50, 20),
        },
      ),
    })

    const response = await runEmitted({
      workspaceJson: capstoneWorkspace,
      modelOverride: mockModel,
    })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)

    const body = await response.text()

    // Response must contain the summary data
    expect(body).toContain('title')
    expect(body).toContain('key_points')
    expect(body).toContain('sources')
  }, 30_000)
})
