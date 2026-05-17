# Before You Build — Visual Agent Builder (Blockly + Vercel AI SDK + LLMs)

The pre-flight checklist for anyone starting a project that combines a Blockly authoring surface with the Vercel AI SDK runtime. Skip these and you will rediscover the same mistakes the degree's 5 POCs + 1 capstone already documented.

---

## 1. Read first

These five research notes are the highest-density reads. Reading them takes ~30 minutes and saves days:

- `01-research/vercel-ai-sdk/version-and-current-api.md` — the v6.0.184 export list, Old→New rename table, and the verified probe results. **Re-read every time you bump the AI SDK pin.**
  - **Evidence:** every entry in `04-logs/expectation-gap-log.md` traces back to a section of this file that wasn't read.
- `01-research/blockly/known-failure-modes.md` — the 11 Blockly gotchas. Items #1 (SSR), #2 (Strict Mode), #3 (events during load), #4 (validator `null`), #6 (bundle size), #10 (Vite/optimizeDeps) all bite on day one.
  - **Evidence:** `03-pocs/L1-blockly-hello/implementation-notes.md` lines 5-50 references items #2, #3, #10 by number.
- `01-research/vercel-ai-sdk/known-failure-modes.md` — the 12 SDK gotchas, with v6 fixes.
- `01-research/known-failure-modes.md` — the 20-item synthesis combining the two above with cross-cutting items.
- `02-planning/risk-register.md` — the 13 risks with mitigation plans. R1, R3, R5, R6 are the high-likelihood/high-impact set you must plan for.

---

## 2. Pin first — exact versions, no caret

```jsonc
{
  "dependencies": {
    "ai":               "6.0.184",     // exact
    "@ai-sdk/anthropic": "3.0.78",     // exact
    "@ai-sdk/openai":    "3.0.64",     // exact — NOTE: 3.0.75 does not exist on npm
    "blockly":           "12.5.1",     // exact
    "zod":               "^3.25.76",   // ^ allowed only because the SDK peer range mandates it
    "next":              "15.3.2"
  }
}
```

Add a regression test that re-reads `package.json` and asserts the exact pins (the canonical `RT-002` pattern from L3). Without the test, `npm install` can quietly let in a release with breaking renames.

**Evidence:** `02-planning/risk-register.md` R1 lines 9-23; `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 97-115 (RT-002); `04-logs/expectation-gap-log.md` lines 38-46 (`@ai-sdk/openai@3.0.75` doesn't exist).

---

## 3. Architect first — three non-negotiables

### a. All LLM calls run server-side

Browser ↔ Blockly workspace JSON ↔ `POST /api/run` (Node runtime) ↔ AI SDK ↔ provider. API keys live only in `.env.local` and the server. **No `NEXT_PUBLIC_*_API_KEY` ever.**

**Evidence:** `01-research/integration-blueprint.md` lines 11-37 (the layered architecture diagram), line 71 ("API keys live in `.env`, only on the server. Never bundle."); `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 4-44 (the data-flow diagram).

### b. The agent route is `runtime = 'nodejs'`, **not** `'edge'`

A multi-step agent with 5 steps × ~8 s/step = 40 s, which exceeds Vercel Edge's 25 s cap. Use Node runtime (60 s on Hobby, more on Pro).

**Evidence:** `02-planning/risk-register.md` R10 lines 164-177; `04-logs/decision-log.md` lines 155-162.

### c. Generated code runs in an *injected-import* sandbox

`new Function('argNames', body)` with the SDK modules + `sink` callback + `tools` map injected positionally. No `require`/`process`/`fs` reachable from the generated code. Same path in tests and production.

**Evidence:** `02-planning/risk-register.md` R4 lines 60-74; `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 26-39.

---

## 4. Test infrastructure first

Before writing your first block, stand up:

- **Vitest** with `environment: 'happy-dom'` and `deps.optimizer.web.include: ['blockly']` (the modern replacement for the deprecated `deps.inline: ['blockly']`).
  - **Evidence:** `02-planning/test-strategy.md` lines 1-22 (framework choice); `04-logs/expectation-gap-log.md` lines 57-63 (deps.inline → deps.optimizer.web.include deprecation).
- **`vi.hoisted` + `vi.mock`** for any test that mounts `<BlocklyWorkspace>` — happy-dom and jsdom both crash inside `Blockly.inject` → `FocusManager` (Symbol(listeners) issue).
  - **Evidence:** `03-pocs/L1-blockly-hello/implementation-notes.md` lines 5-37.
- **`MockLanguageModelV3`** for every AI SDK call. Use the correct shapes: `finishReason: { unified: 'stop' }`, nested `usage`, `delta:` on text chunks with matching `id:`, JSON-string `input` on tool-calls, `mockValues(spread)` not array. **Probe the installed package; do not trust the research doc** — see [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md).
  - **Evidence:** `03-pocs/L3-tool-and-object-blocks/surprises.md` lines 19-55; `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 3-49.
- **Forbidden-name grep** regression on every fixture. Initial list: `parameters:`, `generateObject(`, `toDataStreamResponse`, `CoreMessage`, `experimental_streamText`, `experimental_output`, `maxSteps:`, `maxSteps`.
  - **Evidence:** `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 240-250.
- **Version-pin assertion** regression — re-reads `package.json` and asserts exact strings.
  - **Evidence:** `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 97-115.
- **Golden-output snapshots** for every fixture. Commit them. Diff them in review.
  - **Evidence:** `02-planning/test-strategy.md` lines 70-106 (Golden-Output Tests section).

---

## 5. Risks to plan for upfront

| Risk | Why it matters here | Buy down by |
|---|---|---|
| **R1 — SDK API drift** | v6 has renamed nearly every option; v7 canary will rename again. | Exact pins + version-pin test + snapshot tests + forbidden-name grep. |
| **R2 — Async codegen pattern** | Blockly's JS generator is sync. AI SDK needs `await`. No official Blockly pattern. | Use the post-processor approach: `generateAsyncModule(workspace)`. See [`patterns/async-codegen-via-post-processor.md`](../patterns/async-codegen-via-post-processor.md). |
| **R3 — SSR / Strict Mode** | Blockly references `window` at module load. React Strict Mode double-mounts. Next.js 15 requires `'use client'`. | `next/dynamic({ ssr: false })` + ref guard with null cleanup + `'use client'` on the page file. |
| **R5 — Cost runaway** | A tool-using agent without `stopWhen` can loop indefinitely; input tokens compound. | Default to `stopWhen: stepCountIs(5)` in every Agent block. Log `result.totalUsage` (not `result.usage`). |
| **R6 — Stale LLM knowledge** | Training data is mostly v3/v4. Every implementation pass will introduce stale names. | Forbidden-name grep + golden snapshots + the `01-research/vercel-ai-sdk/version-and-current-api.md` rename table. |
| **R9 — OpenAI strict + `.optional()`** | Schemas with `.optional()` fail OpenAI structured output. | Default Zod-field-optional toggles to emit `.nullable()`, not `.optional()`. |
| **R10 — Edge 25 s cap** | Multi-step agents bust it. | `runtime = 'nodejs'` on the agent route. |

**Evidence:** `02-planning/risk-register.md` lines 9-225 (R1 through R13).

---

## 6. What NOT to do — top anti-patterns

1. **Do not** trust LLM-from-memory for AI SDK code. Training data is v3/v4; current is v6. → [`anti-patterns/trusting-llm-from-memory-for-ai-sdk.md`](../anti-patterns/trusting-llm-from-memory-for-ai-sdk.md)
2. **Do not** use `maxSteps` as your loop bound. It was removed in v5. → [`anti-patterns/maxsteps-as-loop-bound.md`](../anti-patterns/maxsteps-as-loop-bound.md)
3. **Do not** call `generateText`/`streamText` from the browser with raw API keys. → [`anti-patterns/browser-side-llm-calls.md`](../anti-patterns/browser-side-llm-calls.md)
4. **Do not** ship the agent route as `runtime = 'edge'`. 25 s cap kills multi-step. → [`anti-patterns/edge-runtime-for-multi-step-agents.md`](../anti-patterns/edge-runtime-for-multi-step-agents.md)
5. **Do not** use `^` ranges on AI SDK packages. Pin exact. → [`anti-patterns/implicit-caret-on-ai-sdk.md`](../anti-patterns/implicit-caret-on-ai-sdk.md)

---

## 7. Day-one checklist (copy into your project's `CONTRIBUTING.md`)

- [ ] Read the five research notes listed in section 1.
- [ ] Pin every AI SDK package and Blockly exactly. No carets.
- [ ] Add a `RT-002`-style version-pin regression test.
- [ ] Set up Vitest with `happy-dom` and `deps.optimizer.web.include: ['blockly']`.
- [ ] Add `pnpm-workspace.yaml` with `onlyBuiltDependencies: [esbuild]` if using pnpm 10.
- [ ] Decide your sandbox shape (likely: `new Function(argList, body)` with positional import injection).
- [ ] Plan the route handler as `runtime = 'nodejs'`, `maxDuration = 60`.
- [ ] Wrap the editor component in `next/dynamic({ ssr: false })` from a `'use client'` page.
- [ ] Add forbidden-name grep and golden-output snapshot tests for every fixture.
- [ ] Default Agent emission to `stopWhen: stepCountIs(5)`.
- [ ] Default Zod-optional toggles to `.nullable()` (not `.optional()`).
- [ ] Log `result.totalUsage` after every agent run.

---

## Evidence sources (whole-document)

All claims in this checklist are backed by entries cited in the relevant section. The primary documents:

- `01-research/vercel-ai-sdk/version-and-current-api.md`
- `01-research/known-failure-modes.md` (and its `blockly/` + `vercel-ai-sdk/` per-area variants)
- `01-research/integration-blueprint.md`
- `02-planning/risk-register.md`
- `02-planning/test-strategy.md`
- `03-pocs/L1..L5..L-capstone/implementation-notes.md` and `surprises.md`
- `04-logs/decision-log.md`, `expectation-gap-log.md`, `error-log.md`, `debug-log.md`, `command-log.md`, `deployment-log.md`
