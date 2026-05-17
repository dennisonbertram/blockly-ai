# Anti-pattern: `export const runtime = 'edge'` for multi-step agent route handlers

**Category:** anti-pattern — Vercel deployment

## Why it's tempting

Edge runtime advertises ~50ms cold starts, global distribution, and "stream-friendly" infrastructure. Most AI-SDK quick-starts default to Edge for `useChat` examples. The instinct is to keep up: "agents stream too, so they should be Edge."

## Why it fails

Vercel's Edge runtime caps execution at **25 seconds** on Hobby. A multi-step agent loop with `stopWhen: stepCountIs(5)` makes up to 5 LLM round-trips. Real-world per-step latency is 3–10 seconds depending on prompt size, model, and tool latency. At 5 steps × 8 s avg = 40 s — the connection is killed 15 seconds before the agent finishes, the stream truncates mid-tool-result, and the user sees a broken response.

Edge also disallows Node APIs (the `node:` import prefix, `crypto.createHash`, parts of `node:stream`) which the sandbox helper uses.

## What to do instead

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'                  // ← required for multi-step agents
export const maxDuration = 60                    // ← bump from default 10s where needed
```

Node runtime allows up to **60 seconds** on Hobby and longer on Pro. Cold starts are ~200ms slower, which is irrelevant for a 30-second agent run.

Additionally:
- Set `stopWhen: stepCountIs(5)` (default in the Agent block) to bound execution time.
- Add `maxOutputTokens: 2000` to bound per-step cost.
- Optionally add per-step `timeout: 20_000` to fail fast on a hung step before Vercel's platform timeout disconnects.

Edge is still valid for a **separate** "simple chat" route — single-shot `streamText` where the request reliably completes in under 25 s. The agent route, distinctly, is Node.

## Evidence

- `02-planning/risk-register.md` lines 164-177 (R10 "Edge Runtime 25s Execution Limit"): "Likelihood: Medium … Impact: High … Do NOT use `export const runtime = 'edge'` for agent route handlers."
- `04-logs/decision-log.md` lines 155-162 (L5 decision "Node.js runtime for /api/run (NOT Edge)"): "Edge runtime caps execution at 25 seconds (Vercel hobby plan). Multi-step agent loops in L4 can use up to `stepCountIs(5)` steps — each step is an LLM call (~5–10 seconds). 5 steps × 10s = 50s, exceeding the edge cap. Node.js runtime supports up to 60 seconds (hobby) or unlimited on Pro."
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 81-86 ("Constraints" table): "Max execution time | 60s (Vercel hobby), Runtime | Node.js (NOT Edge)."
- `01-research/known-failure-modes.md` (synthesis) implied by the multi-step + streaming entries.

## Related

- [`anti-patterns/unbounded-agent-loop.md`](unbounded-agent-loop.md)
- [`patterns/server-side-execution-via-import-map.md`](../patterns/server-side-execution-via-import-map.md)
- [`playbooks/deploy-to-vercel.md`](../playbooks/deploy-to-vercel.md)
