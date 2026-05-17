# POC Plan — Visual Agent Builder

Each POC builds on the last. Every POC has a single primary lesson; secondary lessons are noted but not the success bar.

---

## L1 — blockly-hello

- **Goal**: Mount a Blockly workspace in a minimal browser harness and confirm that the JavaScript code generator emits valid code from the built-in math/logic toolbox.
- **Scope**: No AI, no custom blocks. One HTML page (or minimal Vite app) with a toolbox, a workspace, and a "Show generated code" panel.
- **Blocks introduced**: Built-in only — `math_number`, `math_arithmetic`, `controls_if`, `logic_compare`, `text_print`.
- **AI SDK surface**: None.
- **Test focus**: Can a user drag blocks, see generated JS, and run it? Does the generated code execute without errors?
- **Definition of done**: Workspace renders; generated code panel updates live; running the generated code in the harness produces the expected output for at least three sample programs.

---

## L2 — single-generate-text-block

- **Goal**: Introduce the first custom AI block — `GenerateText (prompt)` — and have it compile to a real `generateText({ model, prompt })` call.
- **Scope**: One custom block. One model (start with one provider). One-shot completion. No tools, no streaming.
- **Blocks introduced**: `GenerateText` (input: prompt text), `OutputSink` (logs result).
- **AI SDK surface**: `generateText` from `ai`, one provider adapter (e.g., `@ai-sdk/openai` or `@ai-sdk/anthropic`).
- **Test focus**: Workspace XML/JSON → generated code → executed → non-empty result. Use a mock model in tests so CI does not require provider keys.
- **Definition of done**: Sample workspace fixture compiles to expected generated code (snapshot test); with a mock model, execution returns the mock's response.

---

## L3 — tool-and-object-blocks

- **Goal**: Add declarative `Tool` and `GenerateObject` blocks so visually-constructed agents can call typed tools and return typed objects.
- **Scope**: Two new block families. Zod schemas constructed from nested Blockly fields (string/number/boolean/array of object).
- **Blocks introduced**: `Tool` (name, description, params schema sub-blocks, body), `GenerateObject` (prompt + schema → typed result), `ZodString` / `ZodNumber` / `ZodObject` schema primitives.
- **AI SDK surface**: `tool`, `generateObject`, Zod schema construction.
- **Test focus**: Schema-from-blocks round-trips correctly; `generateObject` output validates against the constructed schema.
- **Definition of done**: A user can build a workspace with one tool plus one structured-output call; generated code compiles and (with a mock model) produces a schema-valid result.

---

## L4 — multi-step-agent-and-stream

- **Goal**: Move from one-shot to **agentic** execution and from buffered to **streaming** output.
- **Scope**: `Agent` block exposes `maxSteps` and a tool list; `StreamText` block streams deltas. Add `Loop` and `Branch` control flow.
- **Blocks introduced**: `Agent`, `StreamText`, `Loop` (over array), `Branch` (if/else).
- **AI SDK surface**: `streamText`, `generateText` with `tools` and `maxSteps`, async iteration over text deltas.
- **Test focus**: Multi-step loop terminates; streaming UI receives deltas in order; loop and branch blocks emit correct generated code.
- **Definition of done**: Sample "use a tool, then summarize" workspace runs with a mock model that calls the tool once, then returns text; UI shows streamed output.

---

## L5 — deploy-to-vercel

- **Goal**: Wrap the workspace and the runner in a Next.js (App Router) app, execute generated code **server-side** via a streaming route handler, and deploy to Vercel.
- **Scope**: Next.js host, server-side execution, env-var-based provider keys, Vercel deploy.
- **Blocks introduced**: None new. Re-package L4's blocks inside a Next.js shell.
- **AI SDK surface**: Same as L4, but invoked from a route handler returning a streaming response.
- **Test focus**: Local `next dev` runs end-to-end; deploy succeeds; deployed URL responds with a streaming response.
- **Definition of done**: Public Vercel URL serves the workspace, accepts a "run" action, and streams an AI SDK response back to the browser.

---

## L-capstone — research-agent

- **Goal**: A user (or LLM agent) drags blocks to construct a **research-and-summarize agent**, deploys it, and shares the URL.
- **Scope**: Capstone integrating all prior lessons. Search tool (stub or real), fetch tool, summarize step with structured output. Streamed UI. Deployed.
- **Blocks introduced**: None mandatory; any block created here is generalized back into the standard library.
- **AI SDK surface**: Full — `streamText`, `generateObject`, `tool`, `maxSteps`, provider abstraction.
- **Test focus**: End-to-end happy path — visual program compiles, deploys, runs against a real provider, returns a sensible summary.
- **Definition of done**: Deployed capstone produces a streamed, structured research summary for at least three distinct user queries.
