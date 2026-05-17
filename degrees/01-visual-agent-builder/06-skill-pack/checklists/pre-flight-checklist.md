# Pre-Flight Checklist — Before Starting a New Project

Copy this into your project's `CONTRIBUTING.md`. Every item here maps to at least one documented POC failure that would have been prevented by doing it first.

---

## Environment

- [ ] Node.js version pinned (use `.nvmrc` or `engines` field in `package.json`)
- [ ] `pnpm-workspace.yaml` created with `onlyBuiltDependencies: [esbuild]` (pnpm 10 blocks esbuild's build script by default)
- [ ] `.env.local` created with `ANTHROPIC_API_KEY` (and `OPENAI_API_KEY` if using OpenAI blocks)

## Package Pins

- [ ] `ai` pinned exactly: `6.0.184` (no caret)
- [ ] `@ai-sdk/anthropic` pinned exactly: `3.0.78` (no caret)
- [ ] `@ai-sdk/openai` pinned exactly: `3.0.64` (no caret — and note: `3.0.75` does not exist on npm)
- [ ] `blockly` pinned exactly: `12.5.1` (no caret)
- [ ] `zod` uses `^3.25.76` (^ is intentional due to SDK peer range)

## Test Infrastructure

- [ ] Vitest configured with `environment: 'happy-dom'`
- [ ] `deps.optimizer.web.include: ['blockly']` in Vitest config (not the deprecated `deps.inline`)
- [ ] `vi.hoisted` + `vi.mock` set up for any test that mounts Blockly in a DOM (FocusManager crash guard)
- [ ] Forbidden-name grep test written with the initial list: `parameters:`, `generateObject(`, `toDataStreamResponse`, `CoreMessage`, `experimental_streamText`, `experimental_output`, `maxSteps:`, `maxSteps`
- [ ] Version-pin assertion test (RT-002 pattern) written and failing before pins are set
- [ ] Golden-output snapshot strategy decided: fixture per meaningful block combination, committed to `test/__snapshots__/`

## Architecture

- [ ] All LLM calls confirmed to run server-side — no `NEXT_PUBLIC_*_API_KEY`
- [ ] Route handler set to `runtime = 'nodejs'` (not edge)
- [ ] Route handler has `maxDuration = 60` (or higher if on Pro plan)
- [ ] Execution sandbox designed as `new Function(argList, body)` — no `require`/`process`/`fs` access from generated code
- [ ] Blockly editor component will be loaded via `next/dynamic({ ssr: false })` from a `'use client'` page

## Blockly Mount Guard

- [ ] `useEffect` guard pattern planned: early return if `workspaceRef.current` is non-null
- [ ] Cleanup nulls the ref BEFORE calling `workspace.dispose()`

## Default Block Behaviors

- [ ] Agent block will default to `stopWhen: stepCountIs(5)` to prevent infinite loops
- [ ] Zod-field optional toggle will emit `.nullable()` (not `.optional()`) for OpenAI strict mode compatibility
- [ ] `result.totalUsage` (not `result.usage`) will be logged after every agent run

---

## Links

- [Quickstart](../quickstart.md)
- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
- [Checklist: Pre-Deploy](pre-deploy-checklist.md)
- [Back to Index](../index.md)
