# Anti-pattern: Calling `generateText` / `streamText` from the browser with raw API keys

**Category:** anti-pattern — security

## Why it's tempting

The AI SDK's `useChat` hook makes it look like the API call happens in the browser. The provider factories accept an `apiKey` option. There's no compile-time error if you pass `process.env.NEXT_PUBLIC_OPENAI_API_KEY` to `openai({ apiKey: ... })`.

## Why it fails

Anything prefixed with `NEXT_PUBLIC_` (or any client-side env var) is **inlined into the JavaScript bundle**. The bundle is downloaded by every visitor. The key is now public, indexed by anyone scraping JS, and good for spending until you rotate it.

`useChat` works precisely because it does *not* call the model directly — it POSTs to a server route handler. The route handler runs `streamText` server-side, where the key stays.

## What to do instead

1. Keep `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in `.env.local` **without** `NEXT_PUBLIC_` prefix.
2. Use a route handler (Next.js App Router: `app/api/run/route.ts` with `export const runtime = 'nodejs'`).
3. From the client, `fetch('/api/run', { method: 'POST', body: ... })` and read the streaming response.
4. The provider factories read the env var with no `apiKey` arg: `openai('gpt-4o-mini')` — by default the SDK reads `OPENAI_API_KEY` from `process.env`.

The L5 architecture diagram (`03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 4-22) is exactly this shape: browser ↔ workspace JSON ↔ `/api/run` (Node runtime) ↔ AI SDK ↔ provider. Browser never sees a key.

## Evidence

- `02-planning/risk-register.md` lines 60-74 (R4 "Sandbox Security: Generated Code Escape Risks"): mitigation #1 — "The executor passes a restricted import map … as the sole argument to `new Function`."
- `01-research/integration-blueprint.md` line 71: "API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) live in `.env`, only on the server. Never bundle."
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 81-86 ("Constraints" table): "API keys: Server-only (`lib/execute/*`, `app/api/*`)."
- `01-research/known-failure-modes.md` line 33: synthesis entry "Client-side `generateText` exposing keys. Symptom: API key leaked in bundle. Fix: always execute generated programs server-side via a Next.js route handler."

## Related

- [`patterns/server-side-execution-via-import-map.md`](../patterns/server-side-execution-via-import-map.md)
- [`playbooks/deploy-to-vercel.md`](../playbooks/deploy-to-vercel.md)
