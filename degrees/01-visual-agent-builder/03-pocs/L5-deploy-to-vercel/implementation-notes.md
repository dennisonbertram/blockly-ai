# Implementation Notes — L5 deploy-to-vercel

## Architecture

L5 wraps the L1–L4 work into a Next.js 15 App Router application.

### Data flow

```
Browser                         Server (Next.js / Vercel)
──────                         ────────────────────────────────
BlocklyWorkspace (client)       /api/run (Node.js runtime)
  ↓ workspace state JSON          ↓
WorkspacePage.tsx               runEmitted(workspaceJson)
  ↓ POST /api/run                 ↓ new Blockly.Workspace()
fetch + ReadableStream reader     ↓ generate(workspace) → source
  ↑ text chunks (streaming)       ↓ stripModuleSyntax(source)
OutputPane.tsx                    ↓ new Function(injected_modules, body)
                                  ↓ run({ model, sink })
                                  ↓ sink → ReadableStream
                                  ↓ Response(stream)
```

### Key components

#### `lib/execute/run-emitted.ts`

The central piece. Responsibilities:
1. Validate `workspaceJson` input.
2. Create a headless `Blockly.Workspace`, load JSON, generate emitted source.
3. Strip `import`/`export` syntax from emitted source.
4. Build `new Function(argNames, body)` with all required modules injected.
5. Wire the `sink` callback to a `ReadableStream` controller.
6. Return `new Response(stream)`.

Error handling: Any exception in steps 1–4 returns a structured JSON error
(400 or 500). Exceptions during execution (step 6) are caught and encoded as
JSON into the stream — stack traces are NEVER leaked to the client.

#### `app/api/run/route.ts`

Thin wrapper. Imports all block modules at module load time (one-time cost).
Validates request body. Calls `runEmitted`. Returns the streaming Response.

`export const runtime = 'nodejs'` — required for multi-step agents (R10).

#### `app/page.tsx`

`'use client'` is required in Next.js 15 App Router when using
`next/dynamic({ ssr: false })`. This was an expectation gap from research
(the Pages Router allows it in Server Components).

#### `components/BlocklyWorkspace.tsx`

Inherits L1–L4 patterns:
- `workspaceRef.current` guard prevents double injection under React 18 Strict Mode.
- Dynamic `import('blockly/core')` inside `useEffect` — Blockly never imported at module level.
- Cleanup: `ws.dispose()` + `workspaceRef.current = null`.

## Server-side Blockly

Blockly's `Workspace` class (not `WorkspaceSvg`) works in Node.js without any DOM.
All L4 tests already used `new Blockly.Workspace()` — this is proven technology.

The blocks must be registered before workspace loading. The route handler imports
all block modules at the top level (module load time, not per-request).

## Streaming transport decision

See `04-logs/decision-log.md` entry `2026-05-17T01:25:10Z`.

TL;DR: Custom `ReadableStream` with sink callback. NOT `toUIMessageStreamResponse()`
because the emitted program may call any of: `generateText`, `streamText`, or `Agent`.
The unified sink approach works for all three without the route handler needing to
know which AI function is called.

## Constraints

| Constraint | Value |
|-----------|-------|
| Max execution time | 60s (Vercel hobby) |
| Runtime | Node.js (NOT Edge) |
| API keys | Server-only (`lib/execute/*`, `app/api/*`) |
| Blockly in server bundle | No (`next/dynamic ssr:false`) |
| `toDataStreamResponse` usage | None (banned by regression test) |

## Test strategy

The tests import `runEmitted` directly (no HTTP server). This is the same
pattern as L4's `buildRunnable` — no spawning, no `fetch`, just direct function calls.
`MockLanguageModelV3` is injected via `modelOverride`.

For the `WorkspacePage` render test (BT-L5-005), `Blockly.inject` and `setLocale`
are mocked using `vi.hoisted` + `vi.mock` (L1 pattern) to prevent happy-dom crashes.
