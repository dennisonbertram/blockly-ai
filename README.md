# Blockly + AI — AI School Ecosystem

Agent-ready skill packs on combining Google Blockly with the Vercel AI SDK and LLMs.

## Audience

Autonomous LLM coding agents. The skill packs assume the reader is an LLM building a project that combines visual programming with modern AI runtimes.

## Structure

- `shared/` — cross-degree fundamentals (glossary, platform fundamentals, conventions)
- `degrees/01-visual-agent-builder/` — **first degree** (✅ complete): a visually-composed agent builder using Blockly 12.5.1 + Vercel AI SDK v6.0.184. Six POCs (L1–L5 + capstone), 200+ tests, full TDD audit trail, deployed-capstone simulation.
- `docs/context/` — command intent + session context

## Status

Degree 01 (`visual-agent-builder`): **complete** as of 2026-05-17. Phase 11 audit verdict: READY-FOR-CLOSE (all 4 quality gates PASS).

To consume the skill pack, start at `degrees/01-visual-agent-builder/06-skill-pack/`:
- `README.md` — landing page for the skill pack
- `quickstart.md` — fastest happy path
- `curriculum.md` — recommended order
- `agent-instructions.md` — instructions tailored for LLM agents

## Doctrine

The portable doctrine that produced this degree lives at `../instructions/instructions.md` (not copied into this repo — it's the ecosystem-wide protocol).

## Pinned versions (Phase 1 confirmed, exact)

| Package | Version |
|---|---|
| `blockly` | `12.5.1` |
| `ai` | `6.0.184` |
| `@ai-sdk/anthropic` | `3.0.78` |
| `@ai-sdk/openai` | `3.0.64` |
| Node | `≥ 20` |
| Next.js | `15.x` |

## Future degrees (planned)

The ecosystem is structured for additional degrees. Candidate angles surfaced during Phase 11 evaluation:
- NL ⇄ Blockly Round-Trip — LLMs generate Blockly XML from natural-language prompts; reverse-direction explanations.
- LLM-Powered Custom Block DSL — LLMs help designers define new block types from natural-language specs.
- Agentic Workflows on Blockly — long-running, event-driven, human-in-the-loop agent workflows visualized as blocks.

See `degrees/01-visual-agent-builder/07-evaluation/future-work.md` for the full list.
