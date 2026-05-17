# Pattern: POC ladder (L1 → L2 → L3 → L4 → L5 → Capstone) as progressive risk mitigation

**Category:** pattern — degree-level process

## Problem it solves

Building "a visual Blockly UI that emits v6 AI-SDK code and runs server-side under Next.js on Vercel" has many independent risks: SSR/Strict-Mode interaction, async codegen, SDK API drift, tool-call wiring, structured output, streaming, deploy, real tool stubs. Tackling all of them in one push guarantees discoveries land in the worst possible place — a Vercel build that fails for one of seven reasons.

## The pattern

Each POC level is sized to **retire one or two risks** from the planning risk register, with a behavioral test that proves the retirement. A level cannot be "done" while the test for its risk hasn't been written and passed.

| Level | Risks primarily retired | Behavioral proof |
|---|---|---|
| **L1** blockly-hello | R3 (SSR / Strict Mode), R7 (bundle), R8 (Vite bundler quirks) | Mounts cleanly under React 18 Strict Mode + Vite. |
| **L2** single-generate-text-block | R2 (async codegen), R1 (SDK drift first snapshot), R6 (stale LLM API names) | Emits `await generateText({...})`; first golden snapshot; first forbidden-name grep. |
| **L3** tool-and-object-blocks | R6 again (`inputSchema:` not `parameters:`), R9 (`.nullable()` not `.optional()` for OpenAI strict) | Multi-step mock with tool-call → text; `Output.object({ schema })` emitted. |
| **L4** multi-step-agent-and-stream | R5 (cost runaway → default `stopWhen: stepCountIs(5)`), R12 (`finish()`/`provideFunction_`), streaming `delta:` chunk shape | Agent runs, stops at step limit; stream emits via `for await (... of ....textStream)`. |
| **L5** deploy-to-vercel | R3 again (validated in Next.js 15), R10 (Edge 25s cap), R4 (sandboxed `new Function` execution) | `next build` succeeds; route handler is `runtime = 'nodejs'`; Blockly not in server bundle. |
| **Capstone** research-and-summarize | R6 + R9 + R5 + tool-stub realism | All categories present (Model, Prompt, Tool×3, Zod, Agent, StopCondition, GenerateObject, OutputSink); 43 tests green. |

Every commit in a level follows red → green → regression (TDD); the regression commit anchors the level by snapshotting *and* forbidden-name grepping the emitted output.

## Why it works

When a thing breaks, the level number tells you where to look. The day-1 SSR crash in L5 ("Use 'use client'") was caught in 5 minutes because every earlier level had already retired the underlying R3 risk — the failure was specifically the *Next.js 15 App Router* variant, not the generic SSR bug.

## Evidence

- `02-planning/risk-register.md` Owner-Phase column on every risk (lines 24, 39, 56, 74, 93, 110, 127, 143, 160, 177, 193, 209, 225, 246).
- `02-planning/risk-register.md` lines 33-39 (R2): "L2 must validate this pattern before any further POC work. **Treat it as a go/no-go gate.**"
- Each POC's README sections "Risk validated", e.g., `03-pocs/L3-tool-and-object-blocks/README.md` lines 42-46: "**Risk validated**: v6 tool-calling surface … v6 structured output surface."
- L1 → L5 commit transcripts in `04-logs/command-log.md`: red → green → regression at each level (lines 27-46, 84-103, 105-115, 125-138, 173-195).
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 74-88 ("Block Categories Used"): explicit completeness check — every L2–L4 category appears in the capstone demo program.

## Risks predicted but did NOT materialize — kept for accuracy

- **R11 (Raspberry Pi Foundation release cadence)** — predicted Likelihood:Low / Impact:Medium. No security patch shipped during the degree window; `blockly@12.5.1` carried unchanged from L1 to capstone.
- **R13 (Workspace hash collisions)** — predicted Likelihood:Low / Impact:Low. Hashing was never wired into observability beyond the planning doc; collision was not observed because the path wasn't built.
- **R12 (`finish()`/`provideFunction_` interaction)** — predicted Likelihood:Medium / Impact:High. Did not materialize *because the post-processor pattern sidesteps `finish()` entirely* — see [Pattern: AsyncJavascriptGenerator via post-processor](async-codegen-via-post-processor.md).

## Related

- [`playbooks/adding-a-new-custom-block.md`](../playbooks/adding-a-new-custom-block.md)
- [`before-you-build/before-you-build.md`](../before-you-build/before-you-build.md)
