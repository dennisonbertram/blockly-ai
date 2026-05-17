# Integration Blueprint — Blockly × Vercel AI SDK

How the two libraries fit together architecturally for the Visual Agent Builder.

## One-paragraph mental model

The user composes a program visually by dragging Blockly blocks. The Blockly JavaScript code generator walks the block tree and emits a TypeScript module that imports from `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, and `zod`. The emitted module is shipped to a Next.js route handler, executed server-side (so API keys never leave the server), and its output (text or streamed deltas) is sent back to the browser. Blockly is the **authoring surface**; the AI SDK is the **runtime**.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                     │
│   ┌──────────────────┐    ┌────────────────────────────┐    │
│   │ Blockly workspace│ →  │ workspace.toCode(generator)│    │
│   │ (custom blocks)  │    │  → emitted TS source       │    │
│   └──────────────────┘    └────────────────────────────┘    │
│                                  │                          │
│                                  ▼ POST                     │
└──────────────────────────────────┼──────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────┐
│ Next.js route handler (Node/Edge)│                          │
│   ┌────────────────────────────────────────────────────┐    │
│   │ Receives source + workspace state. Validates,      │    │
│   │ compiles, executes inside a constrained sandbox.   │    │
│   │ Calls AI SDK: generateText / streamText / tools.   │    │
│   └────────────────────────────────────────────────────┘    │
│                                  │                          │
│                                  ▼ streamed chunks          │
└──────────────────────────────────┼──────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│ Browser receives toUIMessageStreamResponse chunks           │
│ Renders output pane live                                    │
└─────────────────────────────────────────────────────────────┘
```

## Block taxonomy (planned, validated in POCs)

| Category | Block | Compiles to (AI SDK v6) |
|---|---|---|
| Model | `Model (provider, name)` | `anthropic('claude-sonnet-4-5')` or `openai('gpt-4o-mini')` |
| Prompt | `Prompt template` | string interpolation |
| Generate | `GenerateText (model, prompt, system?)` | `await generateText({ model, prompt, system })` |
| Generate | `StreamText (model, prompt, system?)` | `streamText({ ... })` + iterate `textStream` |
| Structured | `GenerateObject (model, schema, prompt)` | `generateText({ ..., output: Output.object({ schema }) })` |
| Tool | `Tool (name, description, inputSchema, body)` | `tool({ description, inputSchema, execute })` |
| Tool wiring | `Use tools (...)` | `tools: { name1: t1, ... }` map |
| Agent | `Run agent (model, tools, stopWhen)` | `await generateText({ model, tools, stopWhen: stepCountIs(N) })` |
| Schema | `Object schema { field: type }` | `z.object({ field: z.string(), ... })` |
| Control | `If/else`, `For each`, `While` | standard JS control flow |
| Output | `Send to UI` | yield/return chunk |

Each block has a JS code generator producing v6-correct code. Mismatches caught by golden-output tests.

## Codegen contract

- Generated module: ESM. `export default async function run(io): Promise<...>` where `io` is a callback object provided by the executor.
- Provider construction: based on `Model` block; provider package imported at top.
- Tools: defined inline as constants then passed via `tools: { ... }`.
- All async; statements `await`.
- Each emitted call uses **only** v6 API names (validated by snapshot tests).

## Execution sandbox

The server compiles the emitted source with `new Function('imports', source)` or via a worker. The executor injects pinned imports (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `zod`) and an `io` callback for streaming output. No arbitrary fs/network access from the generated code itself — only the AI SDK functions surfaced via the imports map.

## Hard constraints

- API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) live in `.env`, only on the server. Never bundle.
- The Blockly workspace MUST be loaded via `next/dynamic({ ssr: false })` — see `blockly/integration-with-frameworks.md`.
- All code-generator outputs MUST be covered by golden-output tests so SDK drift becomes a test failure rather than a runtime surprise.
- Multi-step agents MUST set a `stopWhen` to bound cost. Default: `stepCountIs(5)` in POCs.
- Generated programs run in a server route handler with a request timeout (≤ 25s on Vercel Edge; longer on Node runtime).

## Open architecture questions (validated in POCs)

- Async codegen: Blockly has no native async/await codegen mode. We will hand-wrap. POC L2 is the first verification.
- Workspace → executable: client-emit-then-POST vs. server-emit-from-state. POC L4–L5 will compare.
- Tool body authoring: users write JS in a `Code` block (text-area field)? Or restrict to predefined tool stubs? POC L3 decides.
- Streaming back to UI: `toUIMessageStreamResponse` defaults vs. custom SSE format. POC L4 decides.
