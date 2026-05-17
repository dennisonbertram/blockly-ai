# Playbook: Deploy the visual agent builder to Vercel

**Category:** playbook

## When to use

You have a Next.js 15 App Router app (the L5/capstone shape) that you want live behind a `*.vercel.app` URL with the streaming agent route working.

## Pre-flight checklist

- [ ] `next/dynamic({ ssr: false })` is used for `BlocklyWorkspace` import, and the importing page file has `'use client'` at the top. See [`gotchas/nextjs-15-ssr-false-use-client.md`](../gotchas/nextjs-15-ssr-false-use-client.md).
- [ ] `app/api/run/route.ts` has `export const runtime = 'nodejs'` — **NOT** `'edge'`. See [`anti-patterns/edge-runtime-for-multi-step-agents.md`](../anti-patterns/edge-runtime-for-multi-step-agents.md).
- [ ] `package.json` has exact pins on `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `blockly`. See [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md).
- [ ] `npm run build` succeeds locally — including `tsc --noEmit` checks for unused locals. (See `03-pocs/L5-deploy-to-vercel/surprises.md` S2.)
- [ ] All tests pass: codegen, execute, snapshot, regression, forbidden-name grep, version-pin assertions.

## Steps

### 1. Set environment variables

Required at the project level on Vercel (Project Settings → Environment Variables):

- `ANTHROPIC_API_KEY` — Production, Preview, Development.
- `OPENAI_API_KEY` — Production, Preview, Development.

**Never** prefix these with `NEXT_PUBLIC_`. See [`anti-patterns/browser-side-llm-calls.md`](../anti-patterns/browser-side-llm-calls.md).

### 2. Set `maxDuration` on the agent route

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60        // Hobby: max 60. Pro: up to 300.
```

A multi-step agent with `stopWhen: stepCountIs(5)` and per-step 5-10s LLM latency can take 30-50 s. Leave headroom.

### 3. Verify the local build excludes Blockly from the server bundle

```bash
npm run build
# Look for the route table in the output:
#   /                    1.36 kB
#   /_not-found            977 B
#   /api/run               140 B      ← server
```

Blockly should appear only in the client chunk (the page bundle), not in the server output. The L5 final build confirmed this — see `04-logs/command-log.md` lines 161-163.

### 4. Deploy

```bash
npx vercel login                # one-time, device-code flow
npx vercel link                 # link the local project to a Vercel project
npx vercel deploy --prod --yes
```

The first deploy creates the project; subsequent deploys promote a fresh build to `*.vercel.app`.

### 5. Gated live smoke

After deploy, run a single live smoke against the deployed route. Use the cheapest model available — `claude-haiku-4-5` or `gpt-4o-mini`:

```bash
curl -X POST https://<your-project>.vercel.app/api/run \
  -H 'content-type: application/json' \
  --no-buffer \
  -d '{"workspaceJson": {"blocks": {"languageVersion":0,"blocks":[...]}}}'
```

Expect a streaming response of UTF-8 text chunks (one per `__sink` call). If you get HTML, the route handler errored before streaming — check the Vercel logs.

### 6. Watch the first three real runs

Tail the Vercel logs (`vercel logs --follow`). For each run, verify:
- `result.totalUsage` is logged (see [`gotchas/total-usage-vs-usage.md`](../gotchas/total-usage-vs-usage.md)).
- Step count is bounded — should be ≤ `stepCountIs(N)`.
- No `process.env`, `require`, `eval`, or `Function` constructor references in the emitted source. (The L5 sandbox already disallows these from generated code; the log confirms.)

## What can still bite you

- **TypeScript strict-mode-only errors at build time.** `tsc --noEmit` is stricter than esbuild — unused locals fail the build. See `03-pocs/L5-deploy-to-vercel/surprises.md` S2.
- **`as const` on the toolbox.** TypeScript turns it into `readonly`, which `Blockly.inject` rejects. Drop the `as const`. See `03-pocs/L5-deploy-to-vercel/surprises.md` S3.
- **Cold start latency.** Node runtime cold-starts ~200-500ms slower than Edge. Acceptable for an agent invocation.

## Evidence

- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 1-94 — full deployment architecture.
- `04-logs/command-log.md` lines 117-164 — full L5 install + build + deploy command transcript.
- `04-logs/deployment-log.md` lines 19-43 — both L5 and capstone deployment entries.
- `04-logs/decision-log.md` lines 155-162 (L5 Node runtime decision).
- `03-pocs/L5-deploy-to-vercel/surprises.md` lines 19-56 (S1-S4) — the build-time gotchas this playbook pre-empts.

## Related

- [`anti-patterns/edge-runtime-for-multi-step-agents.md`](../anti-patterns/edge-runtime-for-multi-step-agents.md)
- [`anti-patterns/browser-side-llm-calls.md`](../anti-patterns/browser-side-llm-calls.md)
- [`gotchas/nextjs-15-ssr-false-use-client.md`](../gotchas/nextjs-15-ssr-false-use-client.md)
- [`patterns/server-side-execution-via-import-map.md`](../patterns/server-side-execution-via-import-map.md)
