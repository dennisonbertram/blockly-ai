# Deployment Notes — L5 deploy-to-vercel

## Status: deployment-simulated

The `vercel` CLI was available via `npx vercel@54.1.0` but was not authenticated
(`vercel whoami` returned "No existing credentials found. Starting login flow...").
The deployment was NOT executed. Instead, this document records the simulated
deployment plan and what a successful deployment would look like.

## What was verified

1. `pnpm install` (or `npm install --legacy-peer-deps`) — completed successfully.
2. `npx vitest run` — 26 tests pass (4 test files).
3. `npm run build` (Next.js 15 production build) — successful after fixing:
   - `app/page.tsx` needed `'use client'` for `next/dynamic({ ssr: false })` in App Router.
   - TypeScript strict mode caught unused locals in `lib/blocks/tool.ts` and
     `lib/execute/run-emitted.ts` — fixed.
   - Toolbox `as const` was incompatible with Blockly's mutable type — removed.
4. `vercel whoami` — NOT authenticated.

## Simulated Deployment Plan

### Prerequisites (one-time setup)

```bash
# 1. Login to Vercel
npx vercel login

# 2. Link the project (first time)
cd degrees/01-visual-agent-builder/03-pocs/L5-deploy-to-vercel/source
npx vercel link

# 3. Set environment variables in Vercel project settings
# Via dashboard: vercel.com/dashboard → project → Settings → Environment Variables
# Or via CLI:
npx vercel env add OPENAI_API_KEY production
npx vercel env add ANTHROPIC_API_KEY production
```

### Deploy

```bash
cd degrees/01-visual-agent-builder/03-pocs/L5-deploy-to-vercel/source
npx vercel deploy --prod --yes
```

### Expected output

```
Vercel CLI 54.1.0
? Set up and deploy "~/develop/agent-university/blockly-ai/.../L5-deploy-to-vercel/source"? yes
? Which scope do you want to deploy to? [your-team]
? Link to existing project? No
? What's your project's name? blockly-ai-l5
? In which directory is your code located? ./
Auto-detected Project Settings (Next.js):
- Build Command: next build
- Development Command: next dev
- Install Command: npm install
? Want to modify these settings? No
🔍  Inspect: https://vercel.com/[team]/blockly-ai-l5/[deployment-id]
✅  Preview: https://blockly-ai-l5-[hash]-[team].vercel.app
🔗  Linked to [team]/blockly-ai-l5 (created .vercel)
🔍  Inspect: https://vercel.com/[team]/blockly-ai-l5/[deployment-id]
✅  Production: https://blockly-ai-l5.vercel.app [3s]
```

### Verification commands (after successful deployment)

```bash
# Verify root page responds
curl -s -o /dev/null -w "%{http_code}" https://blockly-ai-l5.vercel.app
# Expected: 200

# Verify API route exists
curl -s -X POST https://blockly-ai-l5.vercel.app/api/run \
  -H "Content-Type: application/json" \
  -d '{"workspaceJson": {}}' 
# Expected: HTTP 400 { "error": "Invalid request: workspaceJson must be a non-null object" }
# Note: empty object triggers our validation

# Live model test (requires API keys in Vercel env vars)
# Only run if RUN_LIVE_MODEL_TESTS=1 is set as Vercel env var
curl -s -X POST https://blockly-ai-l5.vercel.app/api/run \
  -H "Content-Type: application/json" \
  -d @degrees/01-visual-agent-builder/03-pocs/L5-deploy-to-vercel/source/test/fixtures/generate-text-basic.json
```

## Vercel Configuration Notes

### Framework preset
Next.js — auto-detected by Vercel from the presence of `next.config.ts` and
`app/` directory.

### Runtime
The `/api/run` route uses `export const runtime = 'nodejs'` — this is compatible
with Vercel's Node.js serverless functions. Edge Runtime is explicitly NOT used
because multi-step agent loops can exceed the 25-second edge cap.

### Environment Variables
- `OPENAI_API_KEY` — server-only (not `NEXT_PUBLIC_`). Set in Vercel dashboard.
- `ANTHROPIC_API_KEY` — server-only. Set in Vercel dashboard.
- Never use `NEXT_PUBLIC_` prefix for AI API keys.

### Build output (verified locally)
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    1.36 kB         103 kB
├ ○ /_not-found                            977 B         102 kB
└ ƒ /api/run                               140 B         101 kB
```

The Blockly library is NOT included in the server bundle:
- The workspace page is `○ (Static)` — Blockly is excluded via `next/dynamic({ ssr: false })`.
- `/api/run` is `ƒ (Dynamic)` — server function with Node.js runtime.

## Security confirmation

The production build does NOT include any API key references in the browser bundle:
- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are accessed only in `lib/execute/run-emitted.ts`
  which is only bundled for the server runtime.
- The regression test `RT-L5-004` enforces this invariant permanently.
