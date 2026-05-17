# Research Index — Visual Agent Builder

Phase 1 research for combining Google Blockly with the Vercel AI SDK + LLMs.

## Slices

- **`blockly/`** — Google Blockly: workspace, code generation, custom blocks, serialization, testing, React/Next.js integration, failure modes.
- **`vercel-ai-sdk/`** — Vercel AI SDK v6 + LLM provider integration: generateText, streamText, tool calling, structured output, multi-step agents, Next.js routes, observability.

## Synthesis documents (this directory)

- `integration-blueprint.md` — how Blockly + AI SDK fit together at the architecture level
- `known-failure-modes.md` — combined top gotchas from both slices
- `open-questions.md` — combined unresolved questions to validate during POCs

## Version pins (Phase 1 confirmed)

| Package | Version | Source |
|---|---|---|
| `blockly` | `12.5.1` | npm view, 2026-05-16 |
| `ai` | `6.0.184` | npm view, 2026-05-16 |
| `@ai-sdk/anthropic` | `3.0.78` | npm view, 2026-05-16 |
| `@ai-sdk/openai` | `3.0.64` | npm view, 2026-05-16 |
| `zod` | `^3.25.76 || ^4.1.8` | AI SDK peer dep range |
| `next` | `15.x` | confirmed compatible with AI SDK route handlers |
| Node | `≥20` | AI SDK + Blockly minimums |

## Top "must-know-before-writing-code" facts

1. **Blockly is SSR-hostile.** `import * as Blockly from 'blockly'` runs browser-global checks at module-load time. Use `next/dynamic({ ssr: false })` or keep the import inside `useEffect`.
2. **Blockly's React Strict Mode double-mount.** Without proper guards (`workspaceRef.current` checked AND nulled on cleanup) the second Strict Mode mount re-injects into an already-injected div.
3. **Programmatic workspace loads emit events for every block** — wrap `serialization.workspaces.load` in `Blockly.Events.disable()` / `enable()`.
4. **Code generators return strings (statements) or `[code, Order]` tuples (expressions).** Returning a bare string for an expression block breaks precedence.
5. **The Vercel AI SDK changed almost every name from v4 → v5.** LLM training data is stale. Always use the **CURRENT v6 names**:
   - `tool({ inputSchema, ... })` — NOT `parameters`
   - `stopWhen: stepCountIs(N)` — NOT `maxSteps`
   - `generateText({ output: Output.object({ schema }) })` — `generateObject()` is deprecated
   - `result.toUIMessageStreamResponse()` — NOT `toDataStreamResponse()`
   - `convertToModelMessages(uiMessages)` — required; v4 auto-conversion removed
   - Mock with `MockLanguageModelV3` from `ai/test`
   - Use `result.totalUsage` for multi-step token tracking
6. **Codegen targets must be reviewed every time the AI SDK ships.** Tie codegen to a pinned SDK version; surface drift via test failures.
7. **API keys are server-only.** Architecture must put Vercel AI SDK calls server-side (Next.js route handler) — Blockly UI in browser, generated code POSTed to the server.
8. **Blockly v13 beta** ships breaking changes (keyboard nav, SVG icons, box-sizing). Stay on 12.5.1 for POCs.

## Quality gate (research phase)

- [x] Official docs reviewed (ctx7 + WebFetch on canonical sites)
- [x] Setup, config, testing, observability, failure modes documented
- [x] Runtime probes used to verify v6 API names (caught `stepCountIs` vs `isStepCount` discrepancy)
- [x] Expectation gaps captured (esp. SDK stale-knowledge problem)
- [x] Open questions surfaced for POC validation
- [x] Version-pinned

## Next phase

Phase 2 (Planning): degree plan, risk register, success criteria, POC selection, test strategy, observability strategy. See `../02-planning/`.
