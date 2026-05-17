# Glossary — blockly-ai

> Initial draft, to be expanded during research. Each term is 1–3 sentences; precise definitions and version-pinned references will be added in the research phase of each degree.

## Blockly

### Blockly
Google's open-source visual programming editor that renders interlocking "blocks" representing code. It runs in the browser, emits code in several target languages, and is designed to be embedded in other applications.

### Workspace
The main editing surface where blocks are placed and connected. A workspace has serializable state (XML or JSON), a current toolbox, and an associated code generator that produces source code from the current block tree.

### Toolbox
The categorized palette from which the user drags blocks into the workspace. Configured declaratively (XML or JSON) and may include dynamic categories.

### Block
The atomic visual unit. A block declares its inputs, fields, output/connection shape, tooltip, and a code-generator function that emits code for it. Blocks can be built-in (math, logic, lists) or custom (defined by the embedder).

### Mutator
A mechanism for letting users change a block's shape at runtime (e.g., adding extra inputs to an `if/elif/else` block). Mutators serialize their state alongside the block.

### Code Generator
A per-language module that walks the workspace's block tree and emits source code. Blockly ships with generators for JavaScript, Python, PHP, Lua, and Dart; this degree uses the JavaScript generator exclusively.

### XML Serialization
Legacy format for saving/loading workspace state as XML. Still widely supported but superseded by JSON in recent versions.

### JSON Serialization
Newer (Blockly v9+) format for saving/loading workspace state as JSON. Preferred for new projects.

## Vercel AI SDK

### Vercel AI SDK
TypeScript SDK that provides a unified, provider-agnostic interface for calling LLMs. Splits into `AI SDK Core` (model calls) and `AI SDK UI` (React hooks/streaming components).

### AI SDK Core
The framework-agnostic core: `generateText`, `streamText`, `generateObject`, `streamObject`, `tool`, agent loops. Runs in Node, edge, or browser.

### AI SDK UI
React-oriented helpers (e.g., `useChat`, `useCompletion`) that consume server streams. Optional; not strictly required for this degree.

### generateText
One-shot text generation. Takes a model, prompt or messages, optional tools, and returns text plus metadata.

### streamText
Streaming variant of `generateText`. Returns an async iterable of text deltas suitable for piping to a UI or a server-sent-events response.

### generateObject
Structured-output generation. Takes a Zod schema and returns a typed object validated against that schema.

### streamObject
Streaming variant of `generateObject` that emits partial objects as they are produced.

### tool
SDK helper for declaring an LLM-callable tool: name, description, Zod parameter schema, and an `execute` function. Used in both single calls and multi-step agents.

### multi-step / maxSteps
The SDK's agent loop control: when `maxSteps` is set, the model can call tools, receive their outputs, and call again until completion or step limit.

### Provider abstraction
The SDK's mechanism for selecting an underlying LLM provider (Anthropic, OpenAI, Google, etc.) through a uniform `model` interface. Each provider has its own adapter package (`@ai-sdk/anthropic`, `@ai-sdk/openai`, etc.).

## LLMs and Agents

### LLM
Large language model — a transformer-based model that takes a sequence of tokens and produces a probability distribution over next tokens. In this degree, accessed exclusively through the AI SDK.

### System Prompt
Instruction text prepended to a conversation that sets persona, constraints, or behavior expectations for the model.

### Tool Calling
The capability of an LLM to emit structured calls to external functions (tools), receive their results, and incorporate them into its response.

### Structured Output
Generation of output that conforms to a schema (typically JSON validated against a Zod or JSON Schema definition). Enables reliable downstream parsing.

### Zod Schema
TypeScript-first runtime validation library used by the AI SDK to describe tool parameters and structured-output shapes.

### Streaming
Producing output incrementally as the model generates it, rather than waiting for completion. Important for user-perceived latency and progress UIs.

### Agent
A loop in which the LLM observes state, optionally calls tools, and decides whether to continue. In the AI SDK, expressed via `generateText`/`streamText` with `tools` and `maxSteps`.

### Agent Loop
The iterative control flow: model proposes action → tool executes → result fed back into context → model decides next step. Terminates on a final answer, an explicit stop, or a step limit.

### Multi-step Reasoning
Solving a problem across multiple model calls, typically with tool use in between. The AI SDK encodes this as multi-step generation under a single high-level call.
