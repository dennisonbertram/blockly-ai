# Known Limitations

What this degree did NOT fully solve, and where the boundaries are.

## Limitations baked into the design

1. **In-memory state only.** No persistence layer for workspaces. Refreshing the browser loses the program. Solution direction: serialize workspace JSON to a backing store (KV / Postgres / filesystem); add a "save / load / share" flow.

2. **Tool body authoring is constrained.** The `Tool` block's body uses a `ToolReturn` statement block + statement-level expressions. Multi-line bodies are clunky; pure-function tools are easy, side-effectful tools (HTTP, DB) require pre-defined stubs. Solution direction: a `Code (raw JS)` block for advanced users; or a richer block library (`HttpRequest`, `DbQuery`, etc.).

3. **`UseTools` block is fixed-arity 3.** Users cannot wire more than 3 tools to a single Agent without a Blockly mutator (deferred from L3/L4 due to time). Solution direction: implement a `UseTools` mutator.

4. **`ai_prompt` block emits string literals only.** Dynamic prompt composition (e.g., embedding a previous Agent's output into a downstream prompt) needs a `ConcatText` / `StringInterpolate` block. Captured in capstone risks_or_blockers.

5. **Streaming UI shows text deltas only.** `fullStream` (tool calls, step boundaries, errors) is not surfaced. Solution direction: a richer `StreamPane` component that renders tool-call cards and step boundaries.

6. **`new Function` sandbox is permissive.** Generated code runs with full Node.js permissions. For trusted developer use this is fine; for multi-tenant or untrusted-user scenarios, a `vm.runInNewContext` or worker-process sandbox is needed. Captured as future-work.

7. **No real-LLM smoke tests in CI.** `RUN_LIVE_MODEL_TESTS=1` gate exists but was not exercised in the build environment due to absent API keys. Solution direction: a single live smoke test per POC that runs in a separate CI job with project secrets.

8. **Vercel deploy not executed.** CLI present but unauthenticated; deployment was simulated and documented. Manual steps are reproducible. Solution direction: a deploy job with `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` env vars.

## Limitations of the research scope

- **OpenAI live pricing snapshot**: the OpenAI pricing page 403'd during research; the pricing-and-quotas card uses model-card-listed prices, which can lag the live billing page. Treat as approximate.
- **`experimental_repairToolCall`** stability: not verified at runtime. Documented as open question.
- **AI Gateway latency** vs direct provider calls: not measured. Documented as open question.

## Limitations of the architecture choices

- **Vite for L1-L4, Next.js for L5**: introduces two stacks in the degree. A single-stack alternative (Next.js from L1) would be cleaner pedagogically but adds SSR complexity to early POCs.
- **Sink-callback streaming transport** chosen over `toUIMessageStreamResponse()` because the executor must transparently support `generateText`, `streamText`, and Agent programs uniformly. This is a custom transport — clients consuming the response must use the matching reader. Solution direction (if you want SDK UI hooks): branch the executor to emit `toUIMessageStreamResponse()` when the program is a single `streamText` call.

## Limitations of the skill pack

- **No video walkthroughs.** Text + code samples only. (Out of scope for the doctrine.)
- **Assessments are short-answer**, not autograded. (Doctrine does not require autograding.)
- **Labs assume a working pnpm + Node 20 install.** Setup troubleshooting outside that is referenced by symptom (`symptom-pnpm-install-fails-esbuild-blocked.md`) but not exhaustively covered.

## Audit notes from Phase 11

The Phase 11 evidence audit flagged 4 OPTIONAL remediations, of which 2 were addressed in the consolidation pass:
- ✅ Inner git repo consolidated into outer (capstone TDD trail preserved as decision-log entry).
- ✅ `@ai-sdk/openai@3.0.75` → `3.0.64` patched in 3 research files with a correction footnote.
- DEFERRED: Symmetric file-set in L3/L4/L5 (currently embeds test-plan + observability content in README + implementation-notes; structurally complete).
- DEFERRED: Verbatim test-runner output for L4 GREEN/REGRESSION commits captured in implementation-notes (the live test output exists in commit messages; static citation is the only thing missing).
