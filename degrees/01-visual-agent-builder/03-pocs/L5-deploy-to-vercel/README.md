# L5 — deploy-to-vercel

**Status**: Complete (tests passing, build green, deployment simulated)

## What this POC proves

1. **Blockly survives Next.js SSR** (R3): WorkspacePage loaded via `next/dynamic({ ssr: false })` — Blockly never reaches the server bundle.
2. **Server-side execution sandbox** (R4): Emitted code runs via `AsyncFunction` injection in `lib/execute/run-emitted.ts` with a constrained import map.
3. **API keys never reach the browser**: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` accessed only in `lib/execute/*` and `app/api/*`. Regression test enforces this permanently.
4. **Streaming response works end-to-end**: Custom `ReadableStream` sink → `Response` → browser `fetch` + `reader`. All 3 programs (generateText, streamText, Agent) pipe through the same sink.
5. **Vercel deployment path documented**: Build succeeds locally. Deploy steps in `deployment-notes.md`.

## Key files

| File | Purpose |
|------|---------|
| `source/lib/execute/run-emitted.ts` | Server-side executor: Blockly workspace → emitted code → AsyncFunction injection → ReadableStream |
| `source/app/api/run/route.ts` | POST /api/run — Node.js runtime, 60s max duration |
| `source/app/page.tsx` | Next.js page with `'use client'` + `next/dynamic({ ssr: false })` |
| `source/components/WorkspacePage.tsx` | Client: Blockly workspace + Run button + output pane |
| `source/components/BlocklyWorkspace.tsx` | Blockly injection with Strict Mode guard |

## Test results

```
Test Files: 4 passed (4)
Tests: 26 passed (26)
```

- `test/route-handler.test.ts` — BT-L5-001 through BT-L5-004
- `test/e2e-handler.test.tsx` — BT-L5-005 through BT-L5-007
- `test/codegen.test.ts` — codegen parity with L4
- `test/regression.test.ts` — RT-L5-001 through RT-L5-007

## Build

```
npm run build → ✓ Compiled successfully
Route (app)               Size    First Load JS
○ /                       1.36 kB  103 kB
ƒ /api/run                140 B    101 kB
```

Blockly is excluded from all server bundles.

## Deployment

Vercel CLI was unavailable/unauthenticated. See `deployment-notes.md` for
full simulated deployment plan and verification commands.
