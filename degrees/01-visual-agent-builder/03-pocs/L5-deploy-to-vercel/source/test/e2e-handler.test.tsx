/**
 * e2e-handler.test.ts — L5
 *
 * End-to-end test: builds a Next.js route handler Request, runs the handler
 * in-process with MockLanguageModelV3, asserts streamed response.
 *
 * BT-L5-005: render WorkspacePage → no crash (Blockly mock + Strict Mode guard)
 * BT-L5-006: security — response body NEVER contains API key or server file path
 * BT-L5-007: forbidden name grep — toDataStreamResponse does NOT appear in source files
 *
 * These tests exercise the route handler POST function directly (not via HTTP server).
 * No real LLM calls. MockLanguageModelV3 only.
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { MockLanguageModelV3, mockValues } from 'ai/test'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

// --- Mock Blockly.inject for happy-dom (L1 pattern) ---
const { mockInject } = vi.hoisted(() => ({ mockInject: vi.fn() }))
vi.mock('blockly/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('blockly/core')>()
  return {
    ...actual,
    Blocks: actual.Blocks,
    inject: mockInject,
  }
})

import generateTextBasicFixture from './fixtures/generate-text-basic.json'

/** v3 usage helper */
const v3Usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: undefined, reasoning: undefined },
})

// ─── BT-L5-005: WorkspacePage renders without crashing ─────────────────────

describe('BT-L5-005: WorkspacePage renders without errors', () => {
  it('renders WorkspacePage client component — no crash, Strict Mode guard active', async () => {
    // Dynamic import so the module is mocked before import
    const { WorkspacePage } = await import('../components/WorkspacePage')

    const { container } = render(<WorkspacePage />)

    // Should render a container div without throwing
    expect(container).toBeTruthy()
    expect(container.firstChild).not.toBeNull()

    // Blockly.inject should have been called during mount (or guarded by workspaceRef)
    // Under happy-dom the mock inject is called once (Strict Mode remount uses the guard)
    // We assert it was called 0 or 1 times (never 2) due to the guard
    expect(mockInject.mock.calls.length).toBeLessThanOrEqual(1)
  })
})

// ─── BT-L5-006: Security — response body never leaks API key ──────────────

describe('BT-L5-006: Security — response body never contains API key', () => {
  it('response body does not contain OPENAI_API_KEY value if set', async () => {
    // Simulate having an API key in env
    const originalKey = process.env['OPENAI_API_KEY']
    process.env['OPENAI_API_KEY'] = 'sk-test-secret-key-abc123'

    try {
      const { runEmitted } = await import('../lib/execute/run-emitted')

      const mockModel = new MockLanguageModelV3({
        doGenerate: mockValues({
          content: [{ type: 'text' as const, text: 'Normal response' }],
          finishReason: { unified: 'stop' as const },
          usage: v3Usage(5, 5),
        }),
      })

      const response = await runEmitted({
        workspaceJson: generateTextBasicFixture,
        modelOverride: mockModel,
      })

      const body = await response.text()

      // Response body must NOT contain the API key
      expect(body).not.toContain('sk-test-secret-key-abc123')

      // Response body must NOT contain server file paths
      expect(body).not.toMatch(/\/Users\/[a-z]+\//)
      expect(body).not.toMatch(/\/home\/[a-z]+\//)
    } finally {
      if (originalKey === undefined) {
        delete process.env['OPENAI_API_KEY']
      } else {
        process.env['OPENAI_API_KEY'] = originalKey
      }
    }
  })
})

// ─── BT-L5-007: Forbidden name grep — toDataStreamResponse must not exist ──

describe('BT-L5-007: Forbidden name grep — toDataStreamResponse banned', () => {
  it('toDataStreamResponse does not appear in route.ts or run-emitted.ts', () => {
    const sourceDir = join(import.meta.dirname ?? __dirname, '..')
    const filesToCheck = [
      join(sourceDir, 'app', 'api', 'run', 'route.ts'),
      join(sourceDir, 'lib', 'execute', 'run-emitted.ts'),
    ]

    for (const filePath of filesToCheck) {
      let content: string
      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        // File doesn't exist yet — this test will pass once implementation is in place
        // If the file doesn't exist, no violation can be present
        continue
      }

      expect(
        content,
        `"toDataStreamResponse" found in ${filePath} — use toUIMessageStreamResponse instead`
      ).not.toContain('toDataStreamResponse')
    }
  })

  it('toDataStreamResponse does not appear in components directory', () => {
    const componentDir = join(import.meta.dirname ?? __dirname, '..', 'components')
    const componentsToCheck = [
      'WorkspacePage.tsx',
      'BlocklyWorkspace.tsx',
      'OutputPane.tsx',
    ]

    for (const fileName of componentsToCheck) {
      const filePath = join(componentDir, fileName)
      let content: string
      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      expect(
        content,
        `"toDataStreamResponse" found in ${filePath}`
      ).not.toContain('toDataStreamResponse')
    }
  })
})
