# Degree Plan — Visual Agent Builder: Blockly + Vercel AI SDK

## Goal

Build a complete, LLM-navigable learning track that teaches how to combine Google Blockly (drag-and-drop visual programming) with the Vercel AI SDK v6 to produce a working visual agent builder. The user drags blocks representing AI primitives (`GenerateText`, `Tool`, `Agent`, `StreamText`, `GenerateObject`) onto a canvas; a JavaScript code generator compiles the block graph into valid AI SDK v6 TypeScript; a Next.js route handler executes that code server-side and streams results back to the browser. Every artifact — POC source, test fixtures, distilled gotchas, and skill-pack lessons — is written so a downstream LLM agent can read it, follow the citations, and reproduce or extend the work.

---

## Degree Phases and Current State

| Phase | Directory | Status | Description |
|---|---|---|---|
| 0 | `00-metadata/` | Complete | Degree definition, scope, POC plan |
| 1 | `01-research/` | Complete (scribe running) | Blockly + AI SDK research; integration blueprint |
| 2 | `02-planning/` | **In progress** | This document; risk register, POC selection, test/observability strategies |
| 3 | `03-pocs/` | Not started | L1–L5 + capstone source code |
| 4 | `04-logs/` | Not started | Command, error, decision logs per POC |
| 5 | `05-distillation/` | Not started | Gotchas, patterns, anti-patterns, playbooks |
| 6 | `06-skill-pack/` | Not started | Lessons, labs, recipes, troubleshooting |
| 7 | `07-evidence/` | Not started | Screenshots, recordings, deployed URLs |

### What Phase 1 Established

- Version pins for all dependencies (see table below).
- The async codegen wrapper problem: Blockly emits synchronous JS; wrapping in `(async () => { ... })()` is the chosen approach, validated in L2.
- SSR exclusion is mandatory: `next/dynamic({ ssr: false })` for the `BlocklyEditor` component.
- All generated code must use v6 API names only; golden-output snapshot tests are the primary drift guard.
- Execution sandbox: server-side via Next.js route handler; generated code run with `new Function` receiving pinned imports. Never `eval()` in-browser post-L1.

---

## Architecture Summary

Three layers, cleanly separated:

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  Blockly workspace (custom AI blocks) → code generator      │
│  → emitted TypeScript source string                         │
│  → POST /api/run { source, workspaceHash }                  │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│ Next.js App Router route handler (Node.js runtime)          │
│  Validates source. Compiles + executes via new Function()    │
│  with pinned import map { ai, @ai-sdk/anthropic, zod }.     │
│  Calls: generateText / streamText / tool / Output.*         │
│  Returns: result.toUIMessageStreamResponse()                 │
└───────────────────────────────┬──────────────────────────────┘
                                │ SSE stream
┌───────────────────────────────▼──────────────────────────────┐
│ Browser output pane                                          │
│  useChat / manual fetch → renders streamed deltas            │
└──────────────────────────────────────────────────────────────┘
```

**Codegen contract:** Generated module exports `async function run(io)`. The executor injects pinned imports as the `imports` argument via `new Function`. No `fs`, no `net`, no arbitrary `process.env` access from generated code. API keys live in `.env.local` on the server; the executor resolves them before passing the provider instance to generated code.

**Blockly side:** `BlocklyEditor` is a Client Component wrapped with `next/dynamic({ ssr: false })`. The workspace is injected once per mount with a ref guard against React 18 Strict Mode double-mount. Change listeners call `workspaceToCode` only when not dragging and not loading. Async wrapper is applied in the `finish()` override of a custom `AsyncJavascriptGenerator` subclass.

---

## POC Sequence and Rationale

### L1 — blockly-hello

Rationale: Before adding any AI surface, establish that Blockly can mount, render, and generate code in the chosen build environment (Vite for L1; Next.js from L5 onward). This POC exists entirely to flush out bundler configuration issues (R8), the React 18 Strict Mode double-mount pattern (R3), and the ResizeObserver cleanup pattern. No AI SDK code. Low risk, high confidence builder for the team.

### L2 — single-generate-text-block

Rationale: Introduces the first custom block and the first AI SDK surface (`generateText`). The critical unknown from research — how to wrap async `await` expressions in generated synchronous code — is validated here. The pattern chosen in L2 (custom `AsyncJavascriptGenerator` subclass overriding `finish()` to add the IIFE wrapper) becomes the codegen contract for all subsequent POCs.

### L3 — tool-and-object-blocks

Rationale: Validates the Zod schema codegen sub-system. `Tool` and `GenerateObject` blocks require generating Zod schema literals from nested block inputs — this is the most complex codegen in the degree. Getting the Zod AST-to-string mapping right here (with golden-output tests locking the shapes) prevents drift in later POCs. Also validates `Output.object({...})` as the v6 replacement for deprecated `generateObject`.

### L4 — multi-step-agent-and-stream

Rationale: Exercises `streamText`, `stopWhen: stepCountIs(N)`, and the `fullStream` async iterator. This is the highest-risk POC for cost runaway (R5) and streaming error handling (silent dropped errors). The mock model pattern must be proven adequate here. Streaming back to the browser also introduces the `toUIMessageStreamResponse()` surface and the `useChat` wiring.

### L5 — deploy-to-vercel

Rationale: Wraps L4's blocks in a Next.js App Router shell and deploys. Validates the SSR exclusion, server-side execution sandbox, and Vercel streaming behavior. No new blocks. The risk here is operational (deploy configuration, env vars), not algorithmic.

### L-capstone — research-agent

Rationale: End-to-end validation that a real user (or agent) can compose a non-trivial program visually and deploy it. Uses `ToolLoopAgent` (or `generateText` with `stopWhen`), `Output.object`, and a real provider. Validates provider parity (R9). The deployed URL is the degree's evidence artifact.

---

## POC Dependency Graph

```
L1 (blockly-hello)
  └─► L2 (single-generate-text-block)
        └─► L3 (tool-and-object-blocks)
              └─► L4 (multi-step-agent-and-stream)
                    └─► L5 (deploy-to-vercel)
                          └─► L-capstone (research-agent)
```

Each POC is strictly sequential. A later POC inherits and extends the block library and generators from the previous one.

---

## Time / Effort Estimates

| POC | Estimated complexity | Rationale |
|---|---|---|
| L1 — blockly-hello | Small | Known patterns; no AI surface. Main risk: bundler config. |
| L2 — single-generate-text-block | Medium | First custom block + async codegen wrapper. One open question (async pattern) to validate. |
| L3 — tool-and-object-blocks | Large | Zod schema codegen from nested blocks is the hardest codegen problem. Multiple block types. |
| L4 — multi-step-agent-and-stream | Large | Streaming + multi-step loop + branch/loop blocks + mock model assertions. |
| L5 — deploy-to-vercel | Medium | Mostly operational; new surface is server sandbox. |
| L-capstone | Medium | Integration of known parts; complexity is in demo polish. |

---

## Pinned Versions Table

| Package | Version | Notes |
|---|---|---|
| `blockly` | `12.5.1` | npm `latest` as of 2026-05-16. v13 beta has breaking keyboard/focus changes. |
| `ai` | `6.0.184` | npm `latest` as of 2026-05-16. v7 canary exists; do not use. |
| `@ai-sdk/anthropic` | `3.0.78` | Paired with `ai@6`. |
| `@ai-sdk/openai` | `3.0.75` | Paired with `ai@6`. |
| `zod` | `^3.25.76` | AI SDK peer dep accepts v3 or v4; use v3 unless project already has v4. |
| `next` | `15.x` (latest) | App Router required. |
| `react` | `18.x` | 19 not yet tested with Blockly. |
| `typescript` | `^5.5` | Strict mode. |
| `vitest` | `^2.x` | Test runner for all unit/golden/integration tests. |
| `@vitejs/plugin-react` | `^4.x` | For Vite-hosted L1–L4 POCs. |
| Node.js | `>=18` | Blockly hard requirement. |

**Evidence sources:** `01-research/vercel-ai-sdk/version-and-current-api.md` (AI SDK versions, verified by runtime probe 2026-05-16), `01-research/blockly/version-compatibility.md` (Blockly version, npm dist-tags verified 2026-05-16).
