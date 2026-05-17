# Visual Agent Builder — Skill Pack

**Stack:** Google Blockly 12.5.1 + Vercel AI SDK 6.0.184 + Next.js 15.3.2

This skill pack teaches you to build a visual agent builder: a browser-based Blockly workspace that compiles programs into Vercel AI SDK v6 code, executed server-side via a Next.js API route.

---

## Version Pins (Use These Exactly)

| Package | Pin | Note |
|---|---|---|
| `ai` | `6.0.184` | exact, no caret |
| `@ai-sdk/anthropic` | `3.0.78` | exact |
| `@ai-sdk/openai` | `3.0.64` | exact — `3.0.75` does not exist |
| `blockly` | `12.5.1` | exact |
| `next` | `15.3.2` | |
| `zod` | `^3.25.76` | `^` intentional (SDK peer range) |

---

## If You Do Nothing Else, Read These Three Files

1. **[Agent Instructions](agent-instructions.md)** — if you are an AI agent, read this first
2. **[Reference: v6 API Cheatsheet](reference/v6-api-cheatsheet.md)** — every v6 import + the Old→New rename table; avoids the most common mistakes
3. **[Checklist: Pre-Flight](checklists/pre-flight-checklist.md)** — before starting any new project

---

## Quick Links

- **[Index](index.md)** — full navigable TOC of every file
- **[Quickstart](quickstart.md)** — 6 steps from clone to running AI program in browser
- **[Curriculum](curriculum.md)** — learning path overview
- **[Before You Build](../05-distillation/before-you-build/before-you-build.md)** — source pre-flight document

---

## What This Pack Covers

**Lessons** (in order):
- [00: TDD Discipline](lessons/00-tdd-discipline.md)
- [01: Mount Blockly Safely](lessons/01-mount-blockly-safely.md)
- [02: Emit GenerateText v6](lessons/02-emit-generate-text-v6.md)
- [03: Tools and Structured Output](lessons/03-tools-and-structured-output.md)
- [04: Multi-Step and Streaming](lessons/04-multi-step-and-streaming.md)
- [05: Deploy to Vercel](lessons/05-deploy-to-vercel.md)
- [06: The Capstone Research Agent](lessons/06-the-capstone-research-agent.md)

**Labs:** 5 hands-on exercises (custom block, new tool, schema extension, provider swap, SDK upgrade)

**Recipes:** 8 copy-paste solutions (async generator, tools injection, mock shapes, forbidden grep, route handler, Strict Mode guard, function injection, pin enforcement)

**Troubleshooting:** 8 symptom-to-fix guides

**Checklists:** 4 pre-flight, pre-deploy, pre-merge, SDK upgrade

**Reference:** 5 cheatsheets (v6 API, Blockly codegen, package pins, block catalog, run signature)

**Examples:** 6 complete programs from Hello Blockly to the capstone research agent

**Assessments:** 4 quizzes covering fundamentals, naming, architecture, debugging

---

## Source

Assembled from Phase 9 distillations:
`05-distillation/` — 17 gotchas, 10 patterns, 10 anti-patterns, 7 playbooks, before-you-build
