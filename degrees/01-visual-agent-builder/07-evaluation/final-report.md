# Final Report — Visual Agent Builder (Blockly + Vercel AI SDK + LLMs)

**Degree slug**: `01-visual-agent-builder`
**Ecosystem**: `blockly-ai`
**Repo**: https://github.com/dennisonbertram/blockly-ai
**Audit verdict**: READY-FOR-CLOSE (all 4 quality gates: PASS)
**Date completed**: 2026-05-17

## What was built

An AI School degree that teaches LLM agents how to combine Google Blockly with the Vercel AI SDK v6 to build a **visual no-code agent builder**. Users drag blocks; Blockly's JavaScript code generator emits a runnable TypeScript module that calls Vercel AI SDK functions (`generateText`, `streamText`, `tool`, `Output.object`, multi-step agents with `stopWhen`); the emitted code runs server-side in a Next.js route handler; the response streams back to the browser.

## What's in the box

| Section | Count | Status |
|---|---|---|
| Phase 1 research artifacts | 33 files | PASS |
| Phase 2-5 planning artifacts | 6 files | PASS |
| POCs (L1–L5 + capstone) | 6 POCs, 200+ tests, full TDD audit trail | PASS |
| Phase 9 distillation | 47 files, 168 evidence pointers | PASS |
| Phase 10 skill pack | 51 navigable files | PASS |
| Phase 11 evaluation | This document set | — |

## Quality gates (Phase 11 audit verdict)

| Gate | Verdict | Notes |
|---|---|---|
| Research-quality | PASS | ctx7-driven, runtime-probed, 16 open questions surfaced, 16 expectation gaps captured |
| POC-quality | PASS | Red→Green→Regression commits verified for all 6 POCs |
| Distillation-quality | PASS | 0 unverified claims; 168 evidence pointers; cross-references resolve |
| Skill-pack-quality | PASS | 0 orphans, 0 broken links; v6 names correct throughout |

## Headline lessons (top 5 from Phase 9 distillation)

1. **Pair golden-output snapshot tests with a forbidden-name grep regression** for the AI SDK. Together they catch nearly every SDK-drift bug before runtime.
2. **Trust runtime probes (`node -e`) over docs/training data**. The published AI SDK v6 surface differs from research docs, GitHub `main`, and LLM training data in non-obvious ways (`stepCountIs` vs `isStepCount`, `.output` vs `.object`, `@ai-sdk/openai@3.0.64` vs an imagined `3.0.75`).
3. **Exact-pin every AI SDK package**. No `^`. Add a regression test that re-reads `package.json` and asserts the exact strings. The caret default is the single largest open door for silent SDK drift.
4. **Multi-step agents MUST be `runtime = 'nodejs'`** (Edge's 25-s cap is too short for 5 × ~8s LLM steps). Generated code runs in a `new Function(argList, body)` sandbox with positional import injection — no `require`/`process`/`fs` access from emitted code.
5. **`MockLanguageModelV3` has four non-obvious shape requirements** (`finishReason: { unified: ... }`, nested `usage`, `delta:` on text-deltas with matching `id:`, JSON-string `input` on tool-calls). Research docs got at least three of these wrong; probes were essential.

## What this degree proves

- Blockly 12.5.1 + Vite + React 18 + TypeScript 5 + happy-dom + Vitest is a workable test stack (with `vi.mock` for `Blockly.inject` — happy-dom + FocusManager are incompatible).
- Blockly 12.5.1 + Next.js 15 (App Router) + `next/dynamic({ ssr: false })` works for production hosting.
- The Vercel AI SDK v6 (`ai@6.0.184`) is the current stable as of 2026-05; v3/v4/v5 patterns from training data are WRONG and the forbidden-name regression test is the primary defense.
- A visual block-programming surface that compiles to AI SDK code is feasible end-to-end, including multi-step agents with tool calls and structured output.

## Deployment

Local development verified: `pnpm dev` from any POC's `source/` directory boots cleanly.

Vercel deploy: **simulated**. The `vercel` CLI was present but unauthenticated in the build environment. Deployment plan documented in `03-pocs/L5-deploy-to-vercel/deployment-notes.md` and `03-pocs/L-capstone-research-agent/deployment-notes.md`. Manual steps: `vercel login` → set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` as Vercel project env vars → `cd source/ && vercel --prod --yes`.

## How to use this degree (for LLM agents)

Read these three files first:
1. `06-skill-pack/before-you-build.md` (you may need to read it via `05-distillation/before-you-build/before-you-build.md` — same content)
2. `06-skill-pack/reference/v6-api-cheatsheet.md`
3. `06-skill-pack/agent-instructions.md`

Then follow the curriculum at `06-skill-pack/curriculum.md`.

## Cross-cutting decisions

- **Vitest** over Jest (ESM-friendly with `ai/test` subpath).
- **Server-side execution** of generated code via `new Function(argList, body)` with injected import map (`model`, `sink`, `tools`).
- **Node runtime** for `/api/run` (Edge's 25-s cap).
- **Exact version pins** for all AI SDK + Blockly packages (no carets).
- **Golden-output snapshots + forbidden-name grep** as the SDK-drift safety net.
- **Mock-only CI**, real-model tests gated by `RUN_LIVE_MODEL_TESTS=1`.
