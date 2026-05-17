/**
 * run-emitted.ts — L-capstone (extended from L5)
 *
 * Server-side executor: loads a workspaceJson into a headless Blockly workspace,
 * generates the emitted async module source, and executes it via AsyncFunction
 * injection — no file writes, no dynamic require, no temp files.
 *
 * ## Architecture Decision: AsyncFunction injection
 *
 * The emitted module is ES module source. On the server (Node.js), we cannot
 * dynamically import a string as an ES module without writing to disk.
 * Instead we:
 *   1. Strip import statements from the emitted source.
 *   2. Inject all required modules as arguments to `new Function()`.
 *   3. Call `run({ model, sink, tools })`.
 *
 * This matches the L4 test strategy (buildRunnable). The difference here is
 * we also wire a sink callback to a ReadableStream and return the HTTP Response.
 *
 * ## Capstone Extension: __tools injection
 *
 * The run() function now accepts a `tools` parameter (`__tools` inside the
 * emitted code). This allows tool body code to call `await __tools.search(q)`
 * and `await __tools.fetch(url)` without the emitted code importing those
 * modules directly. The executor injects the stubbed implementations here.
 *
 * See: lib/tools/search.ts, lib/tools/fetch.ts
 * See: lib/blocks/tool-call.ts (the block that emits __tools.<name>(<arg>))
 *
 * Decision: __tools injection (not inline emit) — cleaner and reusable for
 * any tool stubs, not just search/fetch. Documented in decision-log.md.
 *
 * ## Streaming Transport Decision
 *
 * We use a custom sink-based ReadableStream rather than toUIMessageStreamResponse():
 *
 * Why NOT toUIMessageStreamResponse():
 * - That helper requires calling streamText() at the route handler level and
 *   returning its result directly. Our emitted code is user-authored Blockly
 *   programs that may call generateText OR streamText OR agent loops.
 * - The emitted code calls __sink(label, value) for each output — we wire this
 *   callback to a ReadableStream controller.
 *
 * Why custom ReadableStream:
 * - Works for all three program types (generateText, streamText, Agent).
 * - No dependency on UI Message protocol — simpler for SSE-like consumption.
 * - Content-Type: text/plain; charset=utf-8 (streaming text, not SSE framing).
 *
 * ## Server-side Blockly (headless)
 *
 * `Blockly.Workspace` (non-SVG) works in Node.js. Only WorkspaceSvg (via
 * Blockly.inject) requires a real DOM. We use `new Blockly.Workspace()` directly.
 *
 * The blocks must be registered before calling this function. In the route handler,
 * the block registration imports are done at module load time. In tests, the test
 * files import the blocks.
 *
 * ## Security
 *
 * API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY) are read from process.env ONLY
 * inside this server-only module. They are never returned in responses.
 *
 * The AsyncFunction injection uses a fixed set of allowed modules — the import
 * map is constrained and cannot be expanded by the emitted code.
 */

import * as Blockly from 'blockly/core'
import { generate } from '../codegen/generate'
import {
  generateText,
  streamText,
  tool,
  Output,
  stepCountIs,
  hasToolCall,
} from 'ai'
import { z } from 'zod'
import { searchStub } from '../tools/search'
import { fetchStub } from '../tools/fetch'

/**
 * Default __tools map injected into emitted code.
 * Tool stubs return canned data — no real network calls.
 */
const DEFAULT_TOOLS = {
  search: searchStub,
  fetch: fetchStub,
}

// Provider factories — lazy creation from env keys on the server
// These imports are allowed because this is a server-only module (lib/execute/*)
let _anthropic: typeof import('@ai-sdk/anthropic').anthropic | null = null
let _openai: typeof import('@ai-sdk/openai').openai | null = null

async function getAnthropic() {
  if (!_anthropic) {
    const mod = await import('@ai-sdk/anthropic')
    _anthropic = mod.anthropic
  }
  return _anthropic
}

async function getOpenai() {
  if (!_openai) {
    const mod = await import('@ai-sdk/openai')
    _openai = mod.openai
  }
  return _openai
}

export interface RunEmittedOptions {
  workspaceJson: unknown
  modelOverride?: unknown
  /** Override the __tools map (defaults to search+fetch stubs). For testing. */
  toolsOverride?: Record<string, (...args: unknown[]) => Promise<unknown>>
}

/**
 * Strip ES module import statements and export default keyword from emitted source.
 * Returns the modified source with `async function run` visible.
 */
function stripModuleSyntax(source: string): string {
  return source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n')
    .replace('export default async function run', 'async function run')
}

/**
 * Run emitted Blockly workspace code and return a streaming Response.
 *
 * @param opts.workspaceJson - Blockly workspace serialization JSON
 * @param opts.modelOverride - Optional mock model (for testing). If omitted,
 *   the model block's provider/name is used with real API keys from env.
 */
export async function runEmitted(opts: RunEmittedOptions): Promise<Response> {
  const { workspaceJson, modelOverride, toolsOverride } = opts
  const tools = toolsOverride ?? DEFAULT_TOOLS

  // ─── Validate input ───────────────────────────────────────────────────────
  if (!workspaceJson || typeof workspaceJson !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Invalid request: workspaceJson must be a non-null object' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // ─── Load workspace ───────────────────────────────────────────────────────
  let workspace: Blockly.Workspace | null = null
  let source: string

  try {
    workspace = new Blockly.Workspace()
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(workspaceJson as Record<string, unknown>, workspace)
    Blockly.Events.enable()
    source = generate(workspace)
  } catch (err) {
    if (workspace) {
      try { workspace.dispose() } catch { /* ignore */ }
    }
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: `Workspace generation failed: ${message}` }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } finally {
    if (workspace) {
      try { workspace.dispose() } catch { /* ignore */ }
    }
  }

  // ─── Build runnable function ──────────────────────────────────────────────
  let runFn: (opts: {
    model?: unknown
    sink?: (label: string, value: unknown) => void
    tools?: Record<string, (...args: unknown[]) => Promise<unknown>>
  }) => Promise<void>

  try {
    const noImports = stripModuleSyntax(source)
    const wrappedBody = `${noImports}\nreturn run;`
    const argNames = 'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai'

    // eslint-disable-next-line no-new-func
    const SyncFunction = Function
    const factory = new SyncFunction(argNames, wrappedBody) as (
      gt: typeof generateText,
      st: typeof streamText,
      t: typeof tool,
      o: typeof Output,
      zodLib: typeof z,
      sci: typeof stepCountIs,
      htc: typeof hasToolCall,
      anth: unknown,
      oai: unknown,
    ) => (opts: {
      model?: unknown
      sink?: (label: string, value: unknown) => void
      tools?: Record<string, (...args: unknown[]) => Promise<unknown>>
    }) => Promise<void>

    const anthropicFactory = await getAnthropic()
    const openaiFactory = await getOpenai()

    runFn = factory(
      generateText, streamText, tool, Output, z, stepCountIs, hasToolCall,
      anthropicFactory, openaiFactory,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: `Code compilation failed: ${message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // ─── Wire sink → ReadableStream ───────────────────────────────────────────
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl
    },
  })

  const sink = (_label: string, value: unknown) => {
    if (!controller) return
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    controller.enqueue(encoder.encode(text))
  }

  // Run the emitted code asynchronously, closing the stream when done
  const executionPromise = runFn({ model: modelOverride, sink, tools })
    .then(() => {
      controller?.close()
    })
    .catch((err) => {
      // Do NOT leak stack traces — encode a structured error message
      const message = err instanceof Error ? err.message : String(err)
      const safe = message.replace(/\n[\s\S]*/g, '') // strip stack trace from message
      try {
        controller?.enqueue(encoder.encode(JSON.stringify({ error: safe })))
        controller?.close()
      } catch {
        // Controller may already be closed
      }
    })

  // We need to wait for execution to complete before streaming begins
  // (for generateText which is not streaming). For streaming programs,
  // the sink callbacks fire as chunks arrive.
  //
  // Decision: We use a "pull-through" pattern — the ReadableStream is created
  // before execution starts, and execution populates it via the sink callback.
  // The HTTP response is returned immediately with the ReadableStream as body.
  // Vercel/Node.js will stream the response as chunks are enqueued.
  //
  // For non-streaming programs (generateText), the entire output is enqueued
  // synchronously when run() resolves, which is fine.

  void executionPromise

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  })
}
