# Risk Register — Visual Agent Builder

Each risk: ID, name, description, likelihood (low/med/high), impact (low/med/high), mitigation, owner-phase.

Likelihood and impact are assessed at the start of Phase 2 (2026-05-16). They should be re-evaluated after each POC.

---

## R1 — SDK API Drift Breaking Generated Code

**Description:** The Vercel AI SDK releases frequently (changelog shows >100 commits between v6.0.0-beta and v6.0.184). Function names, option keys, and response shapes changed repeatedly (e.g., `parameters` → `inputSchema`, `maxSteps` → `stopWhen: stepCountIs(N)`, `toDataStreamResponse` → `toUIMessageStreamResponse`). If a dependency update ships a breaking rename, generated code will compile but fail at runtime with confusing errors. Per `01-research/vercel-ai-sdk/version-and-current-api.md`, v7 canary already has `stepCountIs` → `isStepCount` pending.

**Likelihood:** High (SDK is actively evolving; v7 canary is shipping).
**Impact:** High (breaks all generated programs silently).

**Mitigation:**
1. Pin all AI SDK packages to exact versions in `package.json` (not `^`). Unpin only with explicit decision.
2. Maintain golden-output snapshot tests for every block generator. Each snapshot captures the exact emitted API names. A snapshot mismatch on `npm update` is an early warning before any runtime breakage.
3. Maintain the `02-planning/degree-plan.md` pinned versions table; update it as a manual step whenever versions are bumped.
4. Add a CI step that runs `npm outdated` and fails if any AI SDK package drifts from pins.

**Owner-phase:** L2 (first golden snapshot established) and ongoing through capstone.

---

## R2 — Async Codegen Pattern in Blockly Proves Fragile

**Description:** Blockly's JavaScript code generator is synchronous and produces ES5. The AI SDK requires `await`. There is no official Blockly pattern for async code. The chosen approach — subclassing `JavascriptGenerator` and overriding `finish()` to wrap all output in `(async () => { ... })()` — may interact with Blockly's `finish()` logic that prepends variable declarations and `provideFunction_` helpers. If the wrapper is placed incorrectly, `var` declarations may appear inside the IIFE (valid) or outside it (causing undeclared reference errors in strict mode). Per `01-research/blockly/code-generation.md` and `01-research/blockly/open-questions.md` (question 1).

**Likelihood:** Medium (the pattern is reasonable but untested against Blockly's full `finish()` path).
**Impact:** High (blocks L2 and all subsequent POCs if unresolved).

**Mitigation:**
1. L2 must validate this pattern before any further POC work. Treat it as a go/no-go gate.
2. Test `provideFunction_` helpers — confirm they appear inside the IIFE or are correctly hoisted.
3. If the IIFE wrapper breaks `provideFunction_`, fall back to generating `.then()` chains (no `await`) as an alternative approach documented in `01-research/blockly/code-generation.md`.
4. The acceptance test for L2 explicitly runs the generated code and asserts it returns a result — this catches any syntactically valid but semantically broken wrapping.

**Owner-phase:** L2 (must resolve).

---

## R3 — SSR / Strict Mode Interaction with Blockly in Next.js

**Description:** Blockly's `WorkspaceSvg` uses `window`, `document`, and SVG APIs at module load time — not just at function call time. This causes `ReferenceError: window is not defined` during server-side rendering. Additionally, React 18 Strict Mode double-mounts components in development, causing a second `Blockly.inject` call on the same DOM element, which corrupts the workspace. Per `01-research/blockly/known-failure-modes.md` items 1 and 2.

**Likelihood:** High (will occur on first Next.js integration attempt without the mitigation in place).
**Impact:** High (the entire UI fails to load).

**Mitigation:**
1. Mandatory: wrap `BlocklyEditor` in `next/dynamic({ ssr: false })`. This is an architectural hard constraint documented in `01-research/integration-blueprint.md`.
2. Mandatory: guard injection with `if (!containerRef.current || workspaceRef.current) return;` pattern plus cleanup that sets `workspaceRef.current = null`. Both conditions are required (not just one).
3. These patterns are codified in the `BlocklyEditor` component template that all POCs inherit.
4. L1 tests must include a Playwright test that verifies the component mounts exactly once even in development mode.

**Owner-phase:** L1 (establish patterns); L5 (validates in Next.js specifically).

---

## R4 — Sandbox Security: Generated Code Escape Risks

**Description:** The execution model allows user-constructed Blockly programs to compile to JavaScript that runs on the server. If the sandbox uses `new Function(source)()` with access to Node.js globals, a malicious program could access `process.env`, `require()`, or `fs`. In the learning/POC context this is lower risk (controlled users), but the capstone is publicly deployed. Per `01-research/blockly/code-generation.md` (safe execution options) and `01-research/vercel-ai-sdk/security-model.md`.

**Likelihood:** Low (POC users are the degree implementors; capstone has no public user input).
**Impact:** High (a successful escape could exfiltrate API keys or perform destructive server actions).

**Mitigation:**
1. The executor passes a restricted import map — only `{ ai, @ai-sdk/anthropic, @ai-sdk/openai, zod }` — as the sole argument to `new Function`. Generated code cannot access `require`, `process`, `fs`, or any other Node global.
2. The emitted code is wrapped: `new Function('imports', 'const { generateText, streamText, tool, Output, stepCountIs } = imports.ai; ...')`. The function has no access to the outer scope's `require` or `process`.
3. In L5+, add a static analysis step (simple regex whitelist on emitted code) that rejects any source containing `process`, `require`, `eval`, or `Function` constructor calls.
4. Generated code runs with a request timeout (25s Vercel Hobby; 60s Pro). Long-running loops are bounded by `stopWhen: stepCountIs(N)`.
5. Explicit out-of-scope for POC degree: full VM sandboxing (e.g., `vm2`, `isolated-vm`). Document this as a production hardening step in the skill pack.

**Owner-phase:** L2 (first execution); L5 (first public deployment).

---

## R5 — Cost Runaway from Unbounded Multi-Step Agents

**Description:** `generateText`/`streamText` with `stopWhen: isLoopFinished()` (or without `stopWhen`) will loop until natural termination. If the model keeps calling tools (due to unclear stop conditions, tool design bugs, or hallucination), the loop runs indefinitely, accumulating tokens and cost. Token accumulation is quadratic — each step re-sends the full conversation history. Per `01-research/vercel-ai-sdk/known-failure-modes.md` items 6 and 7, and `01-research/vercel-ai-sdk/multi-step-agents.md`.

**Likelihood:** Medium (easy to trigger accidentally in POC work by forgetting `stopWhen`).
**Impact:** High (unexpected API bill; potential rate-limit ban).

**Mitigation:**
1. All generated code from `Agent` blocks must emit `stopWhen: stepCountIs(N)` where N is a configurable field on the `Agent` block with a default of 5. The code generator must never emit an agent loop without `stopWhen`.
2. Add a `maxOutputTokens: 2000` default to all `generateText`/`streamText` calls in generated code. Configurable via a block field.
3. CI tests use `MockLanguageModelV3` exclusively — zero real API calls in automated tests.
4. Developers use cheap models during POC work: `claude-haiku-4-5` (Anthropic) or `gpt-4o-mini` (OpenAI). Block the use of `claude-opus` or `gpt-4o` in POC defaults.
5. Log `result.totalUsage` after every run. Add a session budget cap (e.g., abort if `totalUsage.inputTokens > 50_000` in a single session).
6. Add a `timeout: 20000` (20s) default to all generated calls to prevent hanging.

**Owner-phase:** L4 (first multi-step POC); L-capstone (real provider).

---

## R6 — Stale LLM Knowledge Bias Polluting POC Implementation

**Description:** LLMs implementing POCs have training data with strong representation of AI SDK v3/v4 patterns (`parameters:`, `maxSteps:`, `generateObject()`, `CoreMessage`, `toDataStreamResponse()`). Without explicit instruction, an implementing agent will reach for old API names. These compile without TypeScript errors in some cases (due to `any` types) but fail at runtime. Per `01-research/vercel-ai-sdk/version-and-current-api.md` (Old → New API mapping table).

**Likelihood:** High (confirmed pattern: training data skews toward older API versions).
**Impact:** High (generated programs silently break; the degree teaches the wrong patterns).

**Mitigation:**
1. Every worker task contract must include the "Do This / Not That" table from `01-research/vercel-ai-sdk/version-and-current-api.md` as a forbidden-pattern list.
2. Golden-output snapshot tests catch stale API names in generated code — a test failure is the early signal.
3. All skill-pack lessons use a "Old pattern vs New pattern" comparison format to actively counter muscle memory.
4. `02-planning/poc-selection.md` lists the specific v6 API names exercised per POC. Workers must verify their output against these names before marking a task done.

**Owner-phase:** All phases; highest risk in L2 and L3 (first AI SDK usage).

---

## R7 — Bundle Size from Blockly's Bundled jsdom Dep

**Description:** `blockly@12.5.1` uses pre-compiled UMD bundles (`blockly_compressed.js`, `blocks_compressed.js`) that cannot be tree-shaken. Importing `'blockly/blocks'` includes all ~80 built-in block definitions. The `core-node.js` entry point bootstraps jsdom for Node.js use. Combined, the gzipped browser bundle is estimated at 250–350KB. Per `01-research/blockly/known-failure-modes.md` item 6 and GitHub issue #7449 (open as of 2026-05-16).

**Likelihood:** High (guaranteed — Blockly's bundle shape is known and fixed).
**Impact:** Low (acceptable for a developer tool; not a consumer-facing product).

**Mitigation:**
1. Load the Blockly editor chunk lazily via `next/dynamic({ ssr: false })`. The Blockly bundle is only downloaded when the editor page is visited.
2. For the visual agent builder POCs, import only `blockly/core` + the specific block files needed. Skip `blockly/blocks` if built-in math/logic blocks are not needed after L1.
3. Measure actual gzipped bundle sizes in L1 and document in `04-logs/`. Accept the size if under 400KB gzipped.
4. Explicitly document the bundle size limitation in the skill pack's "before-you-build" checklist.

**Owner-phase:** L1 (measure); L5 (validate in Next.js build).

---

## R8 — Vite / Next.js Bundler Compatibility Quirks

**Description:** Blockly's `.mjs` entry points wrap pre-compiled UMD bundles. With Vite (without `optimizeDeps.include`), this causes `SyntaxError: The requested module does not provide an export named 'default'`. The fix (`optimizeDeps.include: ['blockly', 'blockly/core', 'blockly/blocks', 'blockly/javascript']`) is community-documented but not in official Blockly docs. Next.js uses SWC/Webpack 5 — different bundler, different potential issues. Per `01-research/blockly/known-failure-modes.md` item 10.

**Likelihood:** High (will occur in Vite without the config fix).
**Impact:** Medium (blocks L1 until resolved; fix is known and simple once identified).

**Mitigation:**
1. L1 uses Vite. Include the `optimizeDeps` fix in the L1 setup as a day-zero configuration. Document the exact `vite.config.ts` in L1's `README`.
2. L5 switches to Next.js/Webpack. Test the import chain at L5 setup and document any Webpack-specific config.
3. If Turbopack is enabled in Next.js 15, test explicitly — Turbopack has different ESM handling than Webpack.

**Owner-phase:** L1 (Vite fix); L5 (Next.js/Webpack validation).

---

## R9 — Provider Parity: Anthropic vs OpenAI Structured Output Differences

**Description:** OpenAI's structured output "strict mode" does not support `.optional()` Zod fields — only `.nullable()`. Anthropic does not have this restriction. If the `GenerateObject` block generates code with `.optional()` fields, it will work with Anthropic but throw `NoObjectGeneratedError` on OpenAI. This means the visual program behaves differently depending on which `Model` block the user chooses. Per `01-research/vercel-ai-sdk/known-failure-modes.md` item 10 and `01-research/vercel-ai-sdk/generate-object.md`.

**Likelihood:** Medium (only affects structured output + OpenAI combination).
**Impact:** Medium (confusing user-facing error; may require schema redesign).

**Mitigation:**
1. The `ZodObject` schema blocks default to `.nullable()` (not `.optional()`) for optional fields. Add a note in the block's tooltip: "Use nullable fields for OpenAI strict mode compatibility."
2. Add a behavioral test in L3 that runs the same schema against both `MockLanguageModelV3` (neutral) and documents the expected divergence.
3. In the skill pack, include a "Provider parity" lesson that explicitly calls out this difference with a working code example.
4. For the capstone, use `.nullable()` throughout the schema blocks.

**Owner-phase:** L3 (first structured output); L-capstone.

---

## R10 — Edge Runtime 25s Execution Limit for Multi-Step Agents

**Description:** If the Next.js route handler is deployed with `export const runtime = 'edge'`, Vercel enforces a 25-second execution limit. Multi-step agents with slow tool calls (e.g., real search APIs) may exceed this. Edge also disallows Node.js APIs. Per `01-research/vercel-ai-sdk/nextjs-integration.md` (Edge Runtime Caveats) and `01-research/vercel-ai-sdk/open-questions.md` (question 9).

**Likelihood:** Medium (depends on agent configuration and tool latency).
**Impact:** High (streaming response is cut off; user sees a broken UI).

**Mitigation:**
1. Do NOT use `export const runtime = 'edge'` for agent route handlers. Use the default Node.js runtime, which allows 60s on Vercel Pro or 10s on Hobby.
2. Document in the skill pack: "Edge runtime is for simple streaming chat only. Multi-step agents must use Node.js runtime."
3. Set `timeout: 20_000` on all generated `generateText`/`streamText` calls to fail fast with a clean error before Vercel's platform timeout cuts the connection.
4. For the capstone, set `stopWhen: stepCountIs(5)` and `maxOutputTokens: 1000` to bound execution time.

**Owner-phase:** L5 (deployment); L-capstone.

---

## R11 — Blockly Ownership Transfer Release Cadence Uncertainty

**Description:** On 2025-11-10, Blockly maintenance transferred from Google to the Raspberry Pi Foundation. The npm package name and documentation domain remain the same, but the release cadence and governance process may change. If the Foundation accelerates breaking changes (v13 beta is already shipping keyboard/focus rewrites), pinned versions may fall behind security patches. Per `01-research/blockly/version-compatibility.md`.

**Likelihood:** Low (Foundation has incentive to maintain backward compatibility for educational use).
**Impact:** Medium (could require POC updates if a critical security patch ships with breaking API changes).

**Mitigation:**
1. Pin `blockly@12.5.1` exactly. Check `npm audit` on each POC setup.
2. Monitor the Raspberry Pi Foundation's `blockly` GitHub releases for v12 patch releases (security only). Upgrade patches without API changes.
3. Do not upgrade to v13 during this degree; document v13 as a future migration topic in the skill pack.

**Owner-phase:** Ongoing; review at L5.

---

## R12 — `finish()` Override Interaction with `provideFunction_` Declarations

**Description:** Blockly's `finish()` method prepends helper function definitions (registered via `provideFunction_`) to the generated code before returning the final string. When overriding `finish()` in a custom `AsyncJavascriptGenerator` subclass to wrap output in `(async () => { ... })()`, the placement of the IIFE wrapper relative to the prepended helpers matters. If helpers are prepended OUTSIDE the IIFE, they are fine (hoisted or declared in outer scope). If they are prepended INSIDE the IIFE, the wrapper must appear AFTER helpers. The correct call chain is: `const withHelpers = super.finish(code); return '(async () => {\n' + withHelpers + '\n})();'`. Per `01-research/blockly/code-generation.md` (`provideFunction_` section).

**Likelihood:** Medium (the interaction is subtle; incorrect ordering produces valid-looking but broken code).
**Impact:** High (all async blocks silently fail if helpers are inaccessible).

**Mitigation:**
1. L2 acceptance test must call `workspaceToCode` on a workspace containing at least one `provideFunction_`-using block and verify the output executes correctly end-to-end.
2. The `AsyncJavascriptGenerator` implementation is a deliverable of L2, covered by unit tests asserting the exact wrapper position relative to helper functions.
3. Document the correct `finish()` override pattern in `05-distillation/patterns.md` once validated.

**Owner-phase:** L2 (must resolve as part of async codegen validation).

---

## R13 — Workspace State Hash Collisions in Provenance Tracking

**Description:** The observability strategy tags each executed program with a hash of the workspace state (JSON). If two different workspace configurations hash to the same value (SHA-256 collision is impossible in practice; but content-equal workspaces with different metadata could produce identical hashes), provenance logs may conflate different programs. Additionally, if the workspace JSON serialization is non-deterministic (key ordering varies), the same logical program may produce different hashes across runs.

**Likelihood:** Low (SHA-256 collisions are negligible; JSON key ordering in modern JS is deterministic for object literals).
**Impact:** Low (affects observability only; does not break functionality).

**Mitigation:**
1. Serialize the workspace state with `JSON.stringify(state, null, 0)` (no pretty-printing) and ensure Blockly's `save()` output is passed through a stable key-sorter before hashing.
2. Use SHA-256 (available via `crypto.subtle.digest` in the browser) for the hash.
3. Store the full workspace JSON alongside the hash in `04-logs/decision-log.md` for debugging.

**Owner-phase:** L4 (first hash usage in observability).

---

## Risk Summary Table

| ID | Name | Likelihood | Impact | Owner-Phase |
|---|---|---|---|---|
| R1 | SDK API drift breaking generated code | High | High | L2 onward |
| R2 | Async codegen pattern fragile | Medium | High | L2 |
| R3 | SSR / Strict Mode interaction | High | High | L1, L5 |
| R4 | Sandbox security: code escape | Low | High | L2, L5 |
| R5 | Cost runaway from unbounded agents | Medium | High | L4, capstone |
| R6 | Stale LLM knowledge bias | High | High | All |
| R7 | Bundle size from jsdom dep | High | Low | L1, L5 |
| R8 | Vite / Next.js bundler quirks | High | Medium | L1, L5 |
| R9 | Provider parity (OpenAI strict mode) | Medium | Medium | L3, capstone |
| R10 | Edge runtime 25s limit | Medium | High | L5, capstone |
| R11 | Raspberry Pi Foundation ownership | Low | Medium | Ongoing |
| R12 | `finish()` / `provideFunction_` interaction | Medium | High | L2 |
| R13 | Workspace state hash non-determinism | Low | Low | L4 |
