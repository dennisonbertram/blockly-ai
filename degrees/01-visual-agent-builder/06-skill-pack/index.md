# Visual Agent Builder — Skill Pack Index

**Stack:** Google Blockly 12.5.1 + Vercel AI SDK 6.0.184 + Next.js 15.3.2

This is the entry point to the skill pack. Start here and follow the links to find what you need.

---

## Orientation — What This Skill Pack Teaches

You will learn to build a visual programming environment where users drag-and-drop Blockly blocks to compose AI programs — `generateText`, `streamText`, tool-calling agents, structured output — that execute server-side via the Vercel AI SDK. The key challenges are:

1. **Blockly in Next.js:** SSR crashes (`window not defined`), React Strict Mode double-mounts, and `'use client'` placement in Next.js 15.
2. **Async codegen:** Blockly's generator is synchronous; AI SDK requires `await`. The solution is a post-processor function, not a subclass.
3. **AI SDK v6 API surface:** Every major version renamed load-bearing identifiers. The forbidden-name grep + golden snapshot safety net prevents regressions.
4. **Sandboxed execution:** Generated code runs in `new Function(argList, body)` with only the SDK modules + `sink` callback + tool stubs injected — no `require`/`process`/`fs`.

---

## Where to Start

| If you are... | Go to... |
|---|---|
| An AI agent | [Agent Instructions](agent-instructions.md) |
| A new human learner | [Quickstart](quickstart.md) |
| Starting a fresh project | [Checklist: Pre-Flight](checklists/pre-flight-checklist.md) |
| Looking for a specific API | [Reference: v6 API Cheatsheet](reference/v6-api-cheatsheet.md) |
| Debugging a failure | [Troubleshooting](#troubleshooting) |
| About to deploy | [Checklist: Pre-Deploy](checklists/pre-deploy-checklist.md) |

---

## Entry Points

- [README.md](README.md) — top-level orientation with version pins banner
- [Quickstart](quickstart.md) — 6 steps from clone to running AI program in browser
- [Curriculum](curriculum.md) — learning path overview with dependency map
- [Agent Instructions](agent-instructions.md) — pre-work order, forbidden names, architecture non-negotiables for AI agents

---

## Lessons

Progress through these in order. Each lesson builds on the previous.

1. [00 — TDD Discipline: Red/Green/Regression Audit Trail](lessons/00-tdd-discipline.md) — the two-layer safety net (snapshots + forbidden-name grep)
2. [01 — Mount Blockly Safely in Next.js 15](lessons/01-mount-blockly-safely.md) — SSR crash fix, Strict Mode double-mount guard
3. [02 — Emit GenerateText v6](lessons/02-emit-generate-text-v6.md) — AsyncJavascriptGenerator post-processor, first golden snapshot
4. [03 — Tools and Structured Output](lessons/03-tools-and-structured-output.md) — `tool({ inputSchema })`, `Output.object`, `.nullable()` vs `.optional()`
5. [04 — Multi-Step and Streaming](lessons/04-multi-step-and-streaming.md) — `stopWhen: stepCountIs(N)`, `streamText` (not awaited), `result.totalUsage`
6. [05 — Deploy to Vercel](lessons/05-deploy-to-vercel.md) — route handler, `runtime = 'nodejs'`, `new Function` sandbox
7. [06 — The Capstone Research Agent](lessons/06-the-capstone-research-agent.md) — all blocks together, `__tools` injection, `ResearchSummary` schema

---

## Labs

Hands-on exercises with verifiable outcomes.

- [Lab 01 — Write a Custom Greet Block from Scratch](labs/lab-01-write-a-greet-block.md)
- [Lab 02 — Add a New Tool: currentTime](labs/lab-02-add-a-new-tool.md)
- [Lab 03 — Extend the Capstone Schema: Add a `tags` Field](labs/lab-03-extend-the-schema.md)
- [Lab 04 — Swap Providers: Anthropic to OpenAI and Back](labs/lab-04-swap-providers.md)
- [Lab 05 — Upgrade the AI SDK Pin End-to-End](labs/lab-05-upgrade-the-ai-sdk-pin.md)

---

## Recipes

Copy-paste solutions to common tasks.

- [Async Generator Post-Processor](recipes/recipe-async-generator-postprocessor.md) — `generateAsyncModule(workspace)` pattern
- [Tools Injection via `__tools` Import Map](recipes/recipe-tools-injection-import-map.md) — tool stubs injected by executor
- [MockLanguageModelV3 — Correct Shapes](recipes/recipe-mock-language-model-v3.md) — all four rules
- [Forbidden-Name Grep Test](recipes/recipe-forbidden-name-grep-test.md) — permanent SDK-rename tripwire
- [Server-Side Execution Route Handler](recipes/recipe-server-side-execution-route-handler.md) — Next.js App Router shape
- [React Strict Mode Blockly Guard](recipes/recipe-strict-mode-blockly-guard.md) — double-mount fix
- [Async Function Body Injection](recipes/recipe-async-function-body-injection.md) — `new Function` pattern
- [Pinning AI SDK Exactly](recipes/recipe-pinning-ai-sdk-exactly.md) — no caret + regression test

---

## Checklists

Pre-flight lists for risky operations.

- [Pre-Flight Checklist](checklists/pre-flight-checklist.md) — before starting a new project
- [Pre-Deploy Checklist](checklists/pre-deploy-checklist.md) — before pushing to Vercel
- [Pre-Merge Checklist](checklists/pre-merge-checklist.md) — TDD audit trail review before merging
- [SDK Upgrade Checklist](checklists/sdk-upgrade-checklist.md) — when bumping `ai` or provider packages

---

## Troubleshooting

Symptom → cause → fix.

- [SSR: `window is not defined`](troubleshooting/symptom-ssr-window-not-defined.md)
- [Double Blockly Workspace / Already Injected](troubleshooting/symptom-double-blockly-workspace.md)
- [Tool Not Being Called](troubleshooting/symptom-tool-not-being-called.md)
- [Generated Code Throws TypeError](troubleshooting/symptom-generated-code-throws-typeerror.md)
- [streamText Not Iterable / Stream Empty](troubleshooting/symptom-streamtext-not-iterable.md)
- [MockLanguageModel Shape Error](troubleshooting/symptom-mocklanguagemodel-shape-error.md)
- [pnpm Install Fails — esbuild Blocked](troubleshooting/symptom-pnpm-install-fails-esbuild-blocked.md)
- [Route Handler Times Out on Vercel](troubleshooting/symptom-route-handler-times-out.md)

---

## Reference

Authoritative cheatsheets and catalogs.

- [v6 API Cheatsheet](reference/v6-api-cheatsheet.md) — every v6 import + Old→New rename table
- [Blockly Codegen Cheatsheet](reference/blockly-codegen-cheatsheet.md) — statement vs expression, field access, fixture format
- [Package Pins](reference/package-pins.md) — exact pins with rationale and verification commands
- [Block Catalog](reference/block-catalog.md) — all 15 custom blocks with emitted code shapes
- [Run Signature](reference/run-signature.md) — canonical emitted module shape across all POC levels

---

## Examples

Complete working programs for reference.

- [Example 01 — Hello Blockly](examples/example-01-hello-blockly.md) — minimal mount, no AI calls
- [Example 02 — Single GenerateText Call](examples/example-02-single-generate-text.md) — basic AI call
- [Example 03 — Tool Call + Structured Output](examples/example-03-tool-and-object.md) — `inputSchema`, `Output.object`, `result.output`
- [Example 04 — Multi-Step Agent](examples/example-04-multi-step-agent.md) — two-turn mock, `stepCountIs`
- [Example 05 — Streaming Output](examples/example-05-streaming-output.md) — `streamText` not awaited, `doStream` mock
- [Example 06 — Capstone Research Agent](examples/example-06-capstone-research-agent.md) — all blocks, `__tools`, `ResearchSummary` schema

---

## Assessments

Self-check quizzes with answers.

- [Quiz 01 — Blockly Fundamentals](assessments/quiz-01-blockly-fundamentals.md)
- [Quiz 02 — AI SDK v6 Naming](assessments/quiz-02-ai-sdk-v6-naming.md)
- [Quiz 03 — Architecture Decisions](assessments/quiz-03-architecture-decisions.md)
- [Quiz 04 — Debugging](assessments/quiz-04-debugging.md)

---

## Source Distillations

All content in this pack traces to these source documents:

- `../05-distillation/before-you-build/before-you-build.md` — primary pre-flight
- `../05-distillation/gotchas/` — 17 documented failure modes
- `../05-distillation/patterns/` — 10 proven patterns
- `../05-distillation/anti-patterns/` — 10 anti-patterns to avoid
- `../05-distillation/playbooks/` — 7 step-by-step playbooks
- `../01-research/vercel-ai-sdk/version-and-current-api.md` — runtime-verified v6 API surface
