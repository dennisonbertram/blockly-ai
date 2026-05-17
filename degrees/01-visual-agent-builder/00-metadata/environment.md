# Environment

Confirmed at Phase 1 research (2026-05-16).

## Runtime

| Component | Version | Notes |
|---|---|---|
| Node | ≥ 20 | AI SDK v6 + Next.js 15 minimums |
| pnpm | latest stable | preferred package manager |
| TypeScript | 5.x | strict mode |
| Next.js | 15.x | App Router; route handlers used for server execution |

## Libraries (pinned)

| Package | Version | Source |
|---|---|---|
| `blockly` | `12.5.1` | Phase 1 research, npm view 2026-05-16 |
| `ai` | `6.0.184` | Phase 1 research, npm view 2026-05-16 |
| `@ai-sdk/anthropic` | `3.0.78` | Phase 1 research |
| `@ai-sdk/openai` | `3.0.75` | Phase 1 research |
| `zod` | `^3.25.76 || ^4.1.8` | AI SDK peer dep range |

## API keys (server-only)

- `ANTHROPIC_API_KEY` — Anthropic provider
- `OPENAI_API_KEY` — OpenAI provider

Stored in `.env.local` (gitignored). For production: Vercel project env vars.

## Deployment

- Local dev: `pnpm dev` (Next.js)
- Production: Vercel (`vercel deploy`)
- Runtime: Node (default). Edge runtime tested but bounded by 25 s execution limit.

## Test environment

- Jest or Vitest (decided in Phase 2)
- jsdom or happy-dom for Blockly workspace tests
- `MockLanguageModelV3` from `ai/test` for AI SDK tests

## Confirmed (since Phase 0 stub)

- Node ≥ 20 (was: ≥ 20) — kept.
- Blockly latest (was: latest) — pinned to **12.5.1** (v13 in beta with breaking changes, deferred).
- `ai` SDK v5.x (was: v5.x) — **corrected to v6.0.184** (latest stable; v5 was a major rename release; v6 continues that direction).
- Provider packages were major-version bumped to match `ai` v6 (`@ai-sdk/anthropic@3.x`, `@ai-sdk/openai@3.x`).
- Zod 3.x (was: 3.x) — **AI SDK accepts both 3.x AND 4.x as peer dep**; we will use 3.x for stability unless a Zod 4 feature is needed.
