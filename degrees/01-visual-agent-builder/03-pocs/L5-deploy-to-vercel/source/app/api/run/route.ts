/**
 * route.ts — L5 POST /api/run
 *
 * Route handler: accepts { workspaceJson, modelOverride? }, executes via runEmitted,
 * streams the response back.
 *
 * Security model:
 * - API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY) are accessed ONLY in
 *   lib/execute/run-emitted.ts (server-only module). They never reach the client.
 * - modelOverride is NOT accepted from the HTTP request body — it is only
 *   used internally by lib/execute/run-emitted.ts during testing.
 *
 * Runtime: Node.js (NOT Edge) — required for multi-step agent loops (R10).
 * Edge runtime caps at 25s; Node.js runtime supports up to 60s (Vercel hobby).
 *
 * Note: The `toUIMessageStreamResponse()` method would be appropriate if we were
 * calling streamText() directly at this layer and returning its result.
 * Our architecture pipes emitted code through the server executor which
 * handles both generateText and streamText programs via a unified sink callback.
 * We return a custom ReadableStream response (not toUIMessageStreamResponse).
 * See lib/execute/run-emitted.ts for the decision rationale.
 */

import { NextRequest } from 'next/server'
import { runEmitted } from '@/lib/execute/run-emitted'

// Registers all blocks at module load time (server-side, headless Blockly)
import '@/lib/blocks/model'
import '@/lib/blocks/prompt'
import '@/lib/blocks/generate-text'
import '@/lib/blocks/output-sink'
import '@/lib/blocks/tool'
import '@/lib/blocks/zod-object'
import '@/lib/blocks/zod-field'
import '@/lib/blocks/use-tools'
import '@/lib/blocks/generate-object'
import '@/lib/blocks/stop-condition'
import '@/lib/blocks/stream-text'
import '@/lib/blocks/stream-sink'
import '@/lib/blocks/agent'
import '@/lib/blocks/for-each'

// Node.js runtime — NOT Edge (multi-step agents exceed Edge 25s cap, R10)
export const runtime = 'nodejs'

// 60 seconds max duration (Vercel hobby plan limit)
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { workspaceJson?: unknown; modelOverride?: never } | null = null

  try {
    body = (await req.json()) as { workspaceJson?: unknown }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  if (!body || typeof body !== 'object' || !('workspaceJson' in body)) {
    return new Response(
      JSON.stringify({ error: 'Request body must contain workspaceJson' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // NOTE: modelOverride is NOT accepted from the HTTP body for security reasons.
  // It is only injected in tests via direct function calls to runEmitted().
  return runEmitted({ workspaceJson: body.workspaceJson })
}
