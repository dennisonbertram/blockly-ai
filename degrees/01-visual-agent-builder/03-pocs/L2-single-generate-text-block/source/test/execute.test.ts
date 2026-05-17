/**
 * execute.test.ts
 *
 * Integration tests: compile emitted module, execute with MockLanguageModelV3.
 *
 * ## Execution strategy: AsyncFunction with injected modules
 *
 * The emitted source uses ES module syntax (import/export), which cannot be
 * executed inside `new Function(...)`. The temp-file + dynamic import approach
 * fails in Vitest because Vite's module graph does not resolve files outside
 * the project root.
 *
 * Instead, we use an "injected mode" execution helper:
 * 1. Strip the import statements from the emitted source.
 * 2. Strip the `export default` declaration, keeping the body as a plain
 *    async function.
 * 3. Execute via `new AsyncFunction` with the AI SDK modules injected as
 *    parameters (generateText, anthropic, openai).
 *
 * This is equivalent in behavior to the module-mode output — the same code
 * runs, just without ES module syntax. Documented in implementation-notes.md.
 *
 * BT-005: Execute emitted module with MockLanguageModelV3 → sink receives { label, value }
 * BT-006: Execute with system prompt → mock model's doGenerate called with both system+prompt
 * BT-007: MockLanguageModelV3 import resolves from 'ai/test'
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

// BT-007: Smoke test — MockLanguageModelV3 import resolves
import { MockLanguageModelV3 } from 'ai/test'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'

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
 * Strip ES module syntax from emitted source and return a callable async function.
 *
 * The emitted source looks like:
 *   import { generateText } from 'ai';
 *   import { anthropic } from '@ai-sdk/anthropic';
 *
 *   export default async function run({ model: __model_provider, sink: __sink } = {}) {
 *     <body>
 *   }
 *
 * We:
 * 1. Remove import lines.
 * 2. Remove `export default async function run(params) {` → replace with `async function run(params) {`
 * 3. Wrap in an AsyncFunction that receives injected modules and returns run.
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

  // Build AsyncFunction with injected module params
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...args: unknown[]) => Promise<unknown>

  const factory = new AsyncFunction('generateText', 'anthropic', 'openai', wrappedBody)

  // Execute factory to get the run function (factory itself is async because we use AsyncFunction)
  // But factory.call returns the result synchronously (the factory body does not await)
  // Actually new AsyncFunction creates a function that runs asynchronously.
  // We need a sync way to create the runner.
  // Use regular Function instead since the body itself is not awaited at definition time:
  const SyncFunction = Function
  const syncFactory = new SyncFunction('generateText', 'anthropic', 'openai', wrappedBody) as (
    gt: typeof generateText,
    anth: typeof anthropic,
    oai: typeof openai
  ) => (opts?: { model?: unknown; sink?: (label: string, value: unknown) => void }) => Promise<void>

  return syncFactory(generateText, anthropic, openai)
}

describe('execute emitted module', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
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

    const run = buildRunnable(source)
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
    const run = buildRunnable(source)
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
