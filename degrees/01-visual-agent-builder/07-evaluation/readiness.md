# Skill-Pack Readiness

The skill pack at `06-skill-pack/` is ready for use by LLM agents. This document is the explicit readiness checklist matching the doctrine's gate criteria.

## Component completeness

| Component | Present | Self-contained | Linked from index |
|---|---|---|---|
| `README.md` | yes | yes | n/a |
| `index.md` | yes | yes | n/a (is the index) |
| `quickstart.md` | yes | yes | yes |
| `curriculum.md` | yes | yes | yes |
| `agent-instructions.md` | yes | yes | yes |
| `lessons/` (7) | yes | yes | yes |
| `labs/` (5) | yes | yes | yes |
| `recipes/` (8) | yes | yes | yes |
| `checklists/` (4) | yes | yes | yes |
| `troubleshooting/` (8) | yes | yes | yes |
| `reference/` (5) | yes | yes | yes |
| `examples/` (6) | yes | yes | yes |
| `assessments/` (4) | yes | yes | yes |

Total files: 51 (excluding `.gitkeep` placeholders).

## Navigability check (Phase 11)

- **From `index.md`**: all 51 files reachable. ✅
- **From `README.md`**: index + quickstart + curriculum + agent-instructions + all 7 lessons + key cheatsheets + pre-flight checklist. ✅
- **From `quickstart.md`**: index + first lesson + troubleshooting for the two most likely first-run errors. ✅
- **From `curriculum.md`**: all lessons + all labs + recipes + reference + index + README + agent-instructions. ✅
- **Orphans**: 0.
- **Broken links**: 0.

## Coverage check

- Every block category from the POCs (Model, Prompt, GenerateText, Tool, ZodObject, ZodField, UseTools, GenerateObject, StopCondition, StreamText, StreamSink, Agent, ForEach, OutputSink, ToolCall, Greet) is documented in `reference/block-catalog.md`.
- Every gotcha in `05-distillation/gotchas/` has a corresponding troubleshooting entry OR is covered in a lesson.
- Every pattern in `05-distillation/patterns/` has a corresponding recipe.
- The forbidden v3/v4 API names (`parameters:`, `maxSteps`, `generateObject(`, `toDataStreamResponse`, `CoreMessage`, `experimental_streamText`) appear in the pack ONLY inside DON'T contexts.

## Version-pin propagation

Exact pins (`blockly@12.5.1`, `ai@6.0.184`, `@ai-sdk/anthropic@3.0.78`, `@ai-sdk/openai@3.0.64`, `next@15.x`) are cited consistently across:
- `README.md`
- `quickstart.md`
- `agent-instructions.md`
- `reference/package-pins.md`
- `recipes/recipe-pinning-ai-sdk-exactly.md`
- `checklists/pre-flight-checklist.md`
- `checklists/sdk-upgrade-checklist.md`
- `labs/lab-05-upgrade-the-ai-sdk-pin.md`

## Confidence ratings (skill-pack author's note)

| Topic | Confidence | Notes |
|---|---|---|
| v6 API names | **high** | Runtime-probed; forbidden-name regression test enforces |
| Async codegen post-processor pattern | **high** | Used in L2-Capstone; tested with golden output |
| Server-side execution via injected imports | **high** | L5/Capstone tested |
| MockLanguageModelV3 shapes | **high** | All 4 non-obvious shape requirements documented and tested |
| Multi-step agent loops (stopWhen) | **high** | L4/Capstone tested |
| Streaming via `streamText.textStream` | **high** | L4/L5 tested |
| Real-LLM smoke tests | **medium** | Gated; not run in this session due to env var absence |
| Vercel deployment automation | **medium** | Simulated; manual plan documented |
| Production sandbox security | **medium** | `new Function` is NOT a strong sandbox; documented as future-work for untrusted user programs |

## What can an LLM agent build with this pack?

- A custom block + matching JS code generator + test (per `labs/lab-01-write-a-greet-block.md`)
- A new AI SDK call type wired into the visual workspace (per `playbooks/adding-a-new-ai-sdk-call-type.md`)
- A new tool added to an Agent program (per `labs/lab-02-add-a-new-tool.md`)
- A multi-provider switch (Anthropic ↔ OpenAI) without other code changes (per `labs/lab-04-swap-providers.md`)
- An SDK pin upgrade across a project of this shape (per `labs/lab-05-upgrade-the-ai-sdk-pin.md`)
- A clone-and-adapt for a different "visual builder for X" tool (per `recipes/recipe-async-generator-postprocessor.md` + `recipes/recipe-server-side-execution-route-handler.md`)
