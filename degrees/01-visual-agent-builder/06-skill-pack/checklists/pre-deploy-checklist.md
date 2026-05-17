# Pre-Deploy Checklist — Before Pushing to Vercel

Run through this before every production deployment. Each item maps to a documented failure mode.

---

## Tests Must Pass

- [ ] `pnpm test` is fully green (all codegen, execution, snapshot, and regression tests)
- [ ] No forbidden-name grep failures
- [ ] All snapshots reviewed and committed (run `pnpm test -u` only after human review)
- [ ] `pnpm build` (or `next build`) completes without errors or warnings

## Route Handler

- [ ] `export const runtime = 'nodejs'` is present on the agent route (not `'edge'`)
- [ ] `export const maxDuration = 60` (or appropriate value for your plan) is set
- [ ] All block modules imported at module level (not inside the handler function)
- [ ] Tool stubs imported and wired into `runEmitted(workspaceJson, { tools: { ... } })`

## Next.js / Blockly SSR

- [ ] Editor component loaded via `next/dynamic({ ssr: false })`
- [ ] The file calling `next/dynamic` has `'use client'` at the top (Next.js 15 requirement)
- [ ] Blockly does NOT appear in any server-bundle chunk in the build output

## Environment Variables on Vercel

- [ ] `ANTHROPIC_API_KEY` set in Vercel project settings (Environment Variables)
- [ ] `OPENAI_API_KEY` set if OpenAI provider blocks are used
- [ ] No API keys in `next.config.ts` `env:` block (server-only, not `NEXT_PUBLIC_*`)

## Security / Cost

- [ ] Agent block's `stopWhen` is bounded (e.g., `stepCountIs(5)`) — no unbounded loop
- [ ] No `NEXT_PUBLIC_*_API_KEY` variables (would expose keys to the browser)
- [ ] Generated code runs in `new Function` sandbox — cannot access `require`, `process`, `fs`

## Smoke Test

- [ ] Deploy to a Preview environment first
- [ ] Load the editor, drag a GenerateText block, run it — confirm streaming response appears
- [ ] If agent/tools are used: drag an Agent + Tool block, run — confirm tool is called and model responds
- [ ] Check Vercel function logs for any timeout or error messages

---

## Links

- [Lesson 05: Deploy to Vercel](../lessons/05-deploy-to-vercel.md)
- [Recipe: Server-Side Execution Route Handler](../recipes/recipe-server-side-execution-route-handler.md)
- [Troubleshooting: Route Handler Times Out](../troubleshooting/symptom-route-handler-times-out.md)
- [Back to Index](../index.md)
