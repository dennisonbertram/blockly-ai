# Command Intent — blockly-ai

## Verbatim User Command

> Read /Users/dennison/develop/agent-university/start-degree.md and do it for Google Blockly, combine it with something interesting like Vercel AI SDK and LLMs

## Interpreted Intent

Build a degree (full AI School learning track) that teaches LLM agents how to combine Google Blockly with the Vercel AI SDK in order to produce a visual, no-code agent builder. Blockly provides the drag-and-drop visual workspace; the AI SDK provides the runtime and provider abstraction; LLMs (Anthropic, OpenAI) provide the underlying intelligence. The pairing is the "interesting" part: Blockly's JavaScript code generator can emit AI SDK calls, turning visual blocks into executable agent code.

## Success Criteria

A complete, navigable skill pack under `degrees/01-visual-agent-builder/` consisting of:

- Research phase covering Blockly and the Vercel AI SDK with version-pinned, citation-backed notes
- A planning phase that fixes architecture, block taxonomy, and integration boundaries
- Working POCs L1 through L5 plus a capstone, each with logs and evidence
- Distillation artifacts (gotchas, patterns, anti-patterns, playbooks, before-you-build)
- A skill pack (lessons, labs, recipes, troubleshooting) navigable by a downstream LLM agent
- A deployed capstone (research-and-summarize agent) built from visual blocks

## Mental Model

Three layers, separated cleanly:

1. **Blockly** is the visual surface — blocks, toolbox, workspace, code generator.
2. **Vercel AI SDK** is the runtime — `generateText`, `streamText`, `generateObject`, `tool`, multi-step agents.
3. **LLM provider** supplies intelligence — Anthropic and OpenAI via the SDK's provider abstraction.

Each layer is independently swappable. The degree's job is to teach LLM agents how to wire them together correctly and where the seams are.

## Assumptions

- TypeScript everywhere.
- Next.js as the default host for the capstone (L5+).
- Public GitHub repo (`blockly-ai`).
- Anthropic and OpenAI providers via the AI SDK's provider abstraction (no direct provider SDK usage).
- The user has Vercel CLI access for L5 deployment.

## Out of Scope

- Native mobile (iOS/Android).
- Non-JavaScript Blockly code generators (Python, Lua, Dart, PHP).
- Python execution surfaces.
- Custom fine-tuning of models.
- Self-hosted / local LLM runtimes.
- Scratch compatibility, gamification, or end-user UI polish beyond what is needed to demonstrate the capstone.
