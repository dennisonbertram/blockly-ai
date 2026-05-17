# Future Work

Concrete next steps, sized small to large, that would extend or harden the degree.

## Small (a day or less)

- **Add the live-LLM smoke test job.** Single test per POC that runs against a real provider when `RUN_LIVE_MODEL_TESTS=1`. Cost: pennies. Catches provider-side regressions the mocks miss.
- **Real Vercel deploy of the capstone.** Manual `vercel login` + push, then a curl against the deployed URL hitting `/api/run` with `demo-program.json`. Capture the URL in `04-logs/deployment-log.md`.
- **Bump `next@15.3.2` to the latest patched 15.x.** L5 flagged CVE-2025-66478 as a known security advisory at the pinned version. Run the full test suite after the bump to confirm no breakage.
- **Patch the `UseTools` mutator.** Replace the fixed-arity-3 inputs with a Blockly mutator so users can add/remove tool inputs dynamically.
- **`ConcatText` / `StringInterpolate` block.** Lets users compose prompts that reference variable outputs (e.g., feed an Agent result into a downstream GenerateObject prompt). Captured as a capstone limitation.

## Medium (a week or less)

- **Workspace persistence.** Add a `SAVE` / `LOAD` flow that serializes the workspace JSON to a backing store. Simplest: localStorage; better: filesystem + API; production: Postgres + auth.
- **`Code (raw JS)` block.** For tool bodies users want richer than statement-block bodies. Render it as a multi-line textarea with a `prism` highlighter; sanitize / lint before execution.
- **Richer streaming UI.** Replace the text-only `OutputPane` with a `StreamPane` that renders tool-call cards, step boundaries, and final results in distinct visual lanes. Consume `fullStream` instead of `textStream`.
- **Telemetry surface.** Enable `experimental_telemetry: { isEnabled: true }` on every `generateText` / `streamText` call when the env var `AI_TELEMETRY=1` is set. Emit OpenTelemetry spans via `@vercel/otel` in the route handler. Log token usage + tool-call timings per program run.
- **Provider parity test.** A single test that loads `demo-program.json`, swaps the Model block from `anthropic` to `openai`, re-emits, runs both, and asserts the structured-output object validates against the same Zod schema. Catches provider-specific drift.

## Large (multiple weeks)

- **Untrusted-user sandbox.** Replace `new Function` with `vm.runInNewContext` (or a worker-process sandbox with `--no-network` and tight CPU/memory caps) so end-users can run other users' programs safely. Requires a security review.
- **Multi-tenant deploy.** Add auth (Vercel/Clerk/NextAuth), a per-user workspace store, per-user API-key isolation (bring-your-own-key or proxy via the AI Gateway with org-level quotas), and rate limiting per session.
- **Block-library expansion.** Reusable categories: `Embed` (vector embeddings), `RAG` (retrieve-then-generate), `HTTPRequest`, `JsonExtract`, `Branch` (visual if/else), `Switch`. Each ships with golden-output tests and a regression entry in the forbidden-name grep.
- **Educational mode.** Step-through execution: highlight the currently-executing block in the workspace as the runtime advances; show intermediate values; pause/resume. Excellent for teaching.
- **Companion degree: agentic-workflows.** Use this degree's foundations to build a second degree focused on long-running agent workflows (durable execution, event-driven re-entry, human-in-the-loop pauses). The Blockly surface and AI SDK runtime already give us most of the primitives.

## Cross-cutting

- **Track the AI SDK ship cadence.** v7 is on the horizon (CHANGELOG references `isStepCount` as the v7-canary name for the v6 `stepCountIs`). When v7 ships:
  1. Run the SDK upgrade checklist (`06-skill-pack/checklists/sdk-upgrade-checklist.md`).
  2. Update forbidden-name regression test to include v6 names that v7 renames.
  3. Patch every codegen template that emits a renamed symbol.
  4. Update `06-skill-pack/reference/v6-api-cheatsheet.md` → `v7-api-cheatsheet.md` (or version it).
- **Open questions remaining** (from `01-research/open-questions.md`):
  - I3: streaming back to the browser — `toUIMessageStreamResponse` baseline vs custom SSE. Validated partially in L4/L5; the custom sink transport was chosen but `toUIMessageStreamResponse` parity is unstudied.
  - A2: AI Gateway latency delta. Worth a single benchmark POC.
  - A5: multi-step on Vercel Edge 25-s limit — confirmed problematic; documented; no further work needed.
  - B4: multiple concurrent `WorkspaceSvg` instances. Useful if we add a "diff" or "compare programs" view.
