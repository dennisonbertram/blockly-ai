# Curriculum — Recommended Learning Path

This sequence takes you from first principles to a fully deployed visual AI agent builder. Each step builds on the last. Skip nothing if you are working from scratch; you can jump ahead if you already know a section.

---

## Step 1 — Before You Build (15–30 min)

**File:** `../05-distillation/before-you-build/before-you-build.md`

Read this before writing a single line of code. It contains:
- The five research files that save the most time.
- The exact version pins (no caret on AI SDK packages).
- The three architecture non-negotiables (server-side calls, Node runtime, injected sandbox).
- The test infrastructure to stand up before your first block.
- The top 5 anti-patterns.

**What you'll internalize:** Why the version pins matter; why LLM training data is untrustworthy for AI SDK code; how the architecture is layered.

---

## Step 2 — Quickstart (5–10 min)

**File:** [quickstart.md](quickstart.md)

Run a working `GenerateText` program end-to-end using the L5 or capstone source. Confirms your environment is set up correctly before any teaching.

**What you'll internalize:** The install/run loop; what the output pane produces; which troubleshooting file to open for each first-run error.

---

## Step 3 — Lessons (45–120 min total)

Work through the lessons in order. Each maps to one POC level and retires the risks introduced at that level.

### 3a — L1: Mount Blockly Safely in Next.js (~20 min)

**File:** [lessons/01-mount-blockly-safely.md](lessons/01-mount-blockly-safely.md)

Covers: `next/dynamic({ ssr: false })`, `'use client'` in Next.js 15 App Router, React Strict Mode double-mount guard, event firing during programmatic workspace loads.

**POC level:** L1 (blockly-hello)
**Risks retired:** R3 (SSR), R7 (bundle size), R8 (Vite bundler quirks)

### 3b — L2: Emit a v6-Correct GenerateText Call (~20 min)

**File:** [lessons/02-emit-generate-text-v6.md](lessons/02-emit-generate-text-v6.md)

Covers: `AsyncJavascriptGenerator` post-processor pattern, expression vs. statement generator return shapes, `MockLanguageModelV3` basics, first golden-output snapshot.

**POC level:** L2 (single-generate-text-block)
**Risks retired:** R2 (async codegen), R1 (SDK drift via first snapshot), R6 (stale LLM API names)

### 3c — L3: Tools and Structured Output (~25 min)

**File:** [lessons/03-tools-and-structured-output.md](lessons/03-tools-and-structured-output.md)

Covers: `tool({ inputSchema })` (not `parameters`), `Output.object({ schema })` (not `generateObject`), Zod schema blocks, `.nullable()` vs `.optional()` for OpenAI strict mode, `result.output` (not `result.object`).

**POC level:** L3 (tool-and-object-blocks)
**Risks retired:** R6 (inputSchema rename), R9 (.nullable for OpenAI strict)

### 3d — L4: Multi-Step Agents and Streaming (~25 min)

**File:** [lessons/04-multi-step-and-streaming.md](lessons/04-multi-step-and-streaming.md)

Covers: `stopWhen: stepCountIs(5)` (never `maxSteps`), `streamText` is NOT awaited, `for await (const chunk of result.textStream)`, `result.totalUsage` vs `result.usage`, `hasToolCall` stop semantics.

**POC level:** L4 (multi-step-agent-and-stream)
**Risks retired:** R5 (cost runaway), streaming shape gotchas

### 3e — L5: Deploy to Vercel (~15 min)

**File:** [lessons/05-deploy-to-vercel.md](lessons/05-deploy-to-vercel.md)

Covers: `runtime = 'nodejs'` (not `'edge'`), `maxDuration = 60`, env var configuration, `next build` success criteria, the `run-emitted.ts` sandbox shape.

**POC level:** L5 (deploy-to-vercel)
**Risks retired:** R3 (Next.js 15 App Router SSR), R10 (Edge 25s cap), R4 (sandbox security)

### 3f — Capstone: The Research Agent (~20 min)

**File:** [lessons/06-the-capstone-research-agent.md](lessons/06-the-capstone-research-agent.md)

Covers: Composing all block categories together; `__tools` injection pattern; `ResearchSummary` schema; the full run signature with `tools: __tools`; demo script walkthrough.

**POC level:** L-capstone (research-and-summarize)
**Risks retired:** All remaining risks; proves the system works end-to-end with real providers

### 3g — TDD Discipline (read any time after L2)

**File:** [lessons/00-tdd-discipline.md](lessons/00-tdd-discipline.md)

Covers: Red/green/regression commit discipline; snapshot as SDK-drift safety net; forbidden-name grep as second line of defense; when to update vs. reject a snapshot diff.

---

## Step 4 — Capstone Lesson Exercises

After reading the capstone lesson, work through the labs to confirm you can apply the patterns:

- [labs/lab-01-write-a-greet-block.md](labs/lab-01-write-a-greet-block.md) — implement a custom block from scratch
- [labs/lab-02-add-a-new-tool.md](labs/lab-02-add-a-new-tool.md) — wire a new `currentTime` tool
- [labs/lab-03-extend-the-schema.md](labs/lab-03-extend-the-schema.md) — add a field to the capstone schema
- [labs/lab-04-swap-providers.md](labs/lab-04-swap-providers.md) — swap Anthropic to OpenAI and back
- [labs/lab-05-upgrade-the-ai-sdk-pin.md](labs/lab-05-upgrade-the-ai-sdk-pin.md) — walk the upgrade playbook end-to-end

---

## Step 5 — Recipes (reference as needed)

Use recipes when you need a specific pattern fast. Each is copy-pasteable.

| Recipe | When to reach for it |
|---|---|
| [recipe-async-generator-postprocessor.md](recipes/recipe-async-generator-postprocessor.md) | Building the `generateAsyncModule` wrapper |
| [recipe-tools-injection-import-map.md](recipes/recipe-tools-injection-import-map.md) | Wiring `__tools` into the executor |
| [recipe-mock-language-model-v3.md](recipes/recipe-mock-language-model-v3.md) | Constructing correct `MockLanguageModelV3` shapes |
| [recipe-forbidden-name-grep-test.md](recipes/recipe-forbidden-name-grep-test.md) | Adding the forbidden-name regression test |
| [recipe-server-side-execution-route-handler.md](recipes/recipe-server-side-execution-route-handler.md) | The Next.js route handler shape |
| [recipe-strict-mode-blockly-guard.md](recipes/recipe-strict-mode-blockly-guard.md) | The useEffect guard for React Strict Mode |
| [recipe-async-function-body-injection.md](recipes/recipe-async-function-body-injection.md) | The `new Function(argList, body)` injection adapter |
| [recipe-pinning-ai-sdk-exactly.md](recipes/recipe-pinning-ai-sdk-exactly.md) | The package.json pins + version-pin test |

---

## Step 6 — Reference Cards (keep open while coding)

- [reference/v6-api-cheatsheet.md](reference/v6-api-cheatsheet.md) — Every import + old-vs-new rename table
- [reference/blockly-codegen-cheatsheet.md](reference/blockly-codegen-cheatsheet.md) — Statement vs expression generators, Order constants
- [reference/block-catalog.md](reference/block-catalog.md) — Every built block: purpose, fields, emitted code shape
- [reference/package-pins.md](reference/package-pins.md) — Exact version pins with sources
- [reference/run-signature.md](reference/run-signature.md) — The canonical emitted module shape

---

## Curriculum Map to POC Ladder

| Curriculum Step | POC Level | Primary Lesson File |
|---|---|---|
| Quickstart | L5 source | quickstart.md |
| Mount Blockly Safely | L1 | lessons/01-mount-blockly-safely.md |
| GenerateText v6 | L2 | lessons/02-emit-generate-text-v6.md |
| Tools + Structured Output | L3 | lessons/03-tools-and-structured-output.md |
| Multi-Step + Streaming | L4 | lessons/04-multi-step-and-streaming.md |
| Deploy to Vercel | L5 | lessons/05-deploy-to-vercel.md |
| Full Capstone | L-capstone | lessons/06-the-capstone-research-agent.md |
| TDD Discipline | All | lessons/00-tdd-discipline.md |

---

## Links

- [index.md](index.md) — full file listing
- [README.md](README.md) — entry point with version pins
- [agent-instructions.md](agent-instructions.md) — if you are an LLM agent
