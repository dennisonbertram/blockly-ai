# Success Criteria — Visual Agent Builder Degree

"Degree complete" means all of the following are true. Each criterion is observable and testable.

---

## POC-Level Success Criteria

### L1 — blockly-hello

- When a user visits the L1 page in a browser, a Blockly workspace renders with a toolbox containing at minimum `math_number`, `math_arithmetic`, `controls_if`, `logic_compare`, and `text_print` blocks.
- When the user drags a `math_arithmetic` block and connects two `math_number` blocks to its inputs, the generated code panel updates within 500ms and displays syntactically valid JavaScript containing the arithmetic expression.
- When the user runs the generated code from a sample fixture containing an `if` block with a numeric comparison, the output pane shows the correct value without any console errors.
- When the component is mounted in React 18 development mode (Strict Mode active), no "Already injected" or double-mount errors appear in the console, and the workspace renders exactly once.
- When the Blockly container div is resized, the SVG workspace fills the new dimensions within one ResizeObserver callback cycle.
- When the component unmounts, no event listeners remain attached to the DOM (verified via `ws.dispose()` in cleanup).

### L2 — single-generate-text-block

- When a workspace contains one `GenerateText` block connected to a text prompt block, `workspaceToCode` produces a string containing `await generateText(` and an import statement for the AI SDK — matching the golden-output snapshot exactly.
- When the generated code is executed with `MockLanguageModelV3` returning `{ content: [{ type: 'text', text: 'Hello' }] }`, the executor resolves with `{ text: 'Hello' }` without throwing.
- When the `GenerateText` block has no prompt input connected, the generator uses the fallback prompt string (not an empty string, which would cause a runtime error).
- When `workspaceToCode` is called on a workspace containing the `GenerateText` block with a `provideFunction_`-registered helper, the generated code is syntactically valid JavaScript that executes without `ReferenceError`.
- When the generated code is wrapped in the async IIFE, `await` expressions inside do not produce `SyntaxError: await is only valid in async functions`.
- When the L2 golden-output snapshot is updated (because the generator changes), the CI diff clearly shows which API names changed, serving as an audit trail against R1.

### L3 — tool-and-object-blocks

- When a workspace contains a `Tool` block with a name field "getWeather" and a `ZodString` input block for "city", `workspaceToCode` produces code containing `tool({ description:`, `inputSchema: z.object({`, `city: z.string()`, and `execute:` — matching the golden-output snapshot.
- When a workspace contains a `GenerateObject` block with an `Object schema` connected containing two string fields, the generated code contains `output: Output.object({ schema: z.object({` — not the deprecated `generateObject(` call.
- When the generated code (Tool + GenerateObject) is executed with `MockLanguageModelV3` returning a JSON-parseable object matching the schema, `output` resolves to a typed object and Zod validation passes without throwing.
- When the `MockLanguageModelV3` is configured to return invalid JSON, the executor catches `NoObjectGeneratedError` and propagates it as a structured error (not a raw unhandled rejection).
- When a `ZodObject` schema block has `.optional()` fields, the generator emits a warning annotation in the code comment instructing the developer to use `.nullable()` for OpenAI strict mode compatibility (mitigating R9).
- When a user drags a `Tool` block into the workspace and then removes it, the generated code no longer references that tool's `inputSchema` — no orphaned Zod declarations.

### L4 — multi-step-agent-and-stream

- When a workspace contains an `Agent` block with `maxSteps` set to 3 and one `Tool` block attached, `workspaceToCode` produces code containing `stopWhen: stepCountIs(3)` — not `maxSteps: 3` (mitigating R6).
- When the generated code is executed with a `MockLanguageModelV3` that returns a tool-call response on step 1 and a text response on step 2, `result.steps.length` equals 2 and `result.toolCalls.length` equals 1.
- When a `StreamText` block is used and the mock returns streaming chunks, the executor yields text deltas in order and the final concatenated string matches the mock's intended output.
- When a `Loop` block iterates over an array of 3 items, the generated code contains a `for` (or equivalent) loop and the mock is called once per iteration.
- When a `Branch` block has a condition that evaluates to `false`, the generated code takes the `else` branch — verified by running the code with a mock that returns `false` for the condition.
- When the agent loop completes, `result.totalUsage` (not `result.usage`) is logged — verifying multi-step token accumulation is captured correctly (mitigating R5 monitoring).
- When the streaming response is consumed with `for await (const chunk of result.textStream)`, the loop does not hang or silently swallow errors — the test explicitly passes a mock that yields an error chunk and asserts it is caught.

### L5 — deploy-to-vercel

- When `next build` is run in the L5 project, the build completes without `ReferenceError: window is not defined` or any Blockly-related server-side import errors.
- When `next dev` is running locally and the user submits a workspace program via the UI, the route handler at `/api/run` returns a streaming response within 5 seconds for a `MockLanguageModelV3`-backed test.
- When the project is deployed to Vercel using `vercel --prod`, the deployment succeeds and the URL is accessible within 2 minutes of the command completing.
- When the deployed URL is visited in a browser, the Blockly workspace loads (the `next/dynamic` component renders), and no SSR-related errors appear in the browser console.
- When the deployed `/api/run` endpoint receives a POST request with a valid workspace program and a real provider key set in Vercel environment variables, the response streams and the browser output pane shows the result.
- When the route handler's generated code contains a forbidden identifier (`process`, `require`, `eval`), the server rejects the request with HTTP 400 before executing.

### L-capstone — research-agent

- When an LLM agent (or human user) builds a research-and-summarize workspace using the standard block library, `workspaceToCode` produces code that compiles and executes without manual edits.
- When the capstone is deployed and given the query "Summarize recent developments in transformer attention mechanisms", the response is a non-empty, structured JSON object matching the `ResearchSummary` schema (title, keyFindings array, confidenceScore, relatedTopics, limitations, suggestedNextSteps).
- When the same capstone is queried with three distinct topics, all three return schema-valid structured summaries without error.
- When the capstone is queried with an intentionally ambiguous topic ("stuff"), the agent gracefully handles it (does not crash; may return a low-confidence summary or an explanatory message).
- When a shareable URL is posted publicly, the page loads and the workspace is interactive — confirming the Vercel deployment is stable and not session-dependent.
- When `result.totalUsage` is logged for each capstone run, the token count is below 20,000 input tokens per query (confirming the `stopWhen: stepCountIs(5)` cap is effective).

---

## Skill-Pack Success Criteria

A downstream LLM agent reading `06-skill-pack/` is considered successful when:

- When the agent is asked "How do I mount a Blockly workspace in Next.js without SSR errors?", it can cite the `BlocklyEditor` component pattern, `next/dynamic({ ssr: false })`, and the ref guard — without hallucinating `window` guard workarounds that are documented as insufficient.
- When the agent is asked "What is the v6 AI SDK API for tool calling?", it uses `tool({ inputSchema: z.object({...}) })` — not the v4 `parameters:` form.
- When the agent is asked to generate a multi-step agent, it includes `stopWhen: stepCountIs(N)` with a conservative N, and explains why the default is dangerous.
- When the agent is tasked with building a similar visual-agent-builder project for a different domain (e.g., visual data pipeline builder), it can adapt the block taxonomy and code generator patterns from the skill pack without additional research.
- When the agent encounters a `NoObjectGeneratedError`, it can diagnose whether the cause is invalid JSON from the model, schema mismatch, or OpenAI strict mode `.optional()` issue — and apply the correct fix from the troubleshooting guide.

---

## Coverage Criteria: Research → Skill Pack

Each skill-pack lesson must trace to at least one research artifact:

| Skill Pack Lesson | Research Source(s) |
|---|---|
| Mounting Blockly in React/Next.js | `blockly/integration-with-frameworks.md`, `blockly/known-failure-modes.md` §1,2 |
| Writing custom block definitions (JSON + JS) | `blockly/custom-blocks.md` |
| Code generation patterns (value, statement, async) | `blockly/code-generation.md` |
| Blockly serialization and testing | `blockly/serialization.md`, `blockly/testing-model.md` |
| AI SDK v6 core functions | `vercel-ai-sdk/version-and-current-api.md` |
| Tool calling (v6) | `vercel-ai-sdk/tool-calling.md` |
| Structured output (Output.object) | `vercel-ai-sdk/generate-object.md` |
| Multi-step agents + stopWhen | `vercel-ai-sdk/multi-step-agents.md` |
| Streaming in Next.js | `vercel-ai-sdk/nextjs-integration.md` |
| Testing with MockLanguageModelV3 | `vercel-ai-sdk/testing-model.md` |
| Observability and cost tracking | `vercel-ai-sdk/observability-and-errors.md` |
| Security (API key handling, sandbox) | `vercel-ai-sdk/security-model.md` |
| Known failure modes (consolidated) | `blockly/known-failure-modes.md`, `vercel-ai-sdk/known-failure-modes.md`, `known-failure-modes.md` |
| Integration blueprint | `integration-blueprint.md` |

Any lesson that cannot be traced to a research artifact is flagged as uncovered and requires either a new research file or removal from the lesson plan.

---

## Evidence Completeness Criteria

Every claim in the distillation artifacts (`05-distillation/`) must meet:

- The claim cites at least one source in the format: `Per \`01-research/<path>.md\` ...`.
- API names in code examples are verified against the pinned version (`ai@6.0.184`, `blockly@12.5.1`).
- Any claim about runtime behavior (not just API signatures) must be backed by either: a passing test in `03-pocs/`, a runtime probe result documented in `01-research/`, or an official documentation URL with a retrieval date.
- "Likely" and "probably" language is forbidden in distillation claims. Claims are either verified or explicitly labeled as "unverified — validate in POC."

---

## Demo Criterion

The capstone is considered deployable when:

- A public Vercel URL exists and resolves without authentication.
- The Blockly workspace loads and is interactive in Chrome/Firefox/Safari.
- The "Research and Summarize" default workspace program runs end-to-end on at least three test queries.
- The streaming output is visible in the browser as it arrives (not buffered until complete).
- The deployed URL and a screen recording demonstrating the three queries are committed to `07-evidence/capstone/`.
