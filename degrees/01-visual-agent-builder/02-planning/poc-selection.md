# POC Selection — Detailed Briefs

Six POCs: L1 through L5, plus L-capstone. Each is a go/no-go gate for the next.

---

## L1 — blockly-hello

### Goal

Establish that Blockly can mount, render, and generate JavaScript code in a browser-hosted Vite app. Validate the React 18 Strict Mode double-mount guard and ResizeObserver resize handling. No AI SDK involvement.

### Scope

**In:**
- Vite + React + TypeScript app (not Next.js — that comes at L5)
- Blockly workspace with the standard toolbox (math, logic, text, controls)
- Generated-code preview panel that updates on every workspace change
- Run-generated-code button (uses `new Function` for this prototype-only POC — explicitly labeled as unsafe)
- Sample fixture: a simple arithmetic + if/else program in three workspace JSON files
- Playwright test: mounts, drags one block, asserts generated code panel updates

**Out:**
- Custom blocks
- AI SDK
- Next.js
- Server-side execution

### Blocks Introduced

| Block Name | Built-in Type | JS Generator Output |
|---|---|---|
| Number | `math_number` | `42` (number literal) |
| Arithmetic | `math_arithmetic` | `(3 + 4)` with correct `Order.*` |
| If | `controls_if` | `if (condition) { ... }` |
| Compare | `logic_compare` | `(a == b)` with `Order.EQUALITY` |
| Print | `text_print` | `window.alert(message);` or `console.log(message);` |

All built-in; no custom generator code needed for these. L1 verifies that the built-in generators work.

### AI SDK Surface Exercised

None.

### Behavioral Tests

1. When the Blockly workspace mounts in React 18 Strict Mode, exactly one workspace instance exists after mount (not two), and no console errors mention "Already injected" or double-mount issues.
2. When the user's container div changes height from 400px to 600px, the workspace resizes to fill the new dimensions within the next animation frame (ResizeObserver fires `ws.resize()`).
3. When a `math_arithmetic` block is connected to two `math_number` blocks (3 and 4), the generated code panel contains the string `3 + 4` (with correct precedence, no unnecessary parentheses at top level).
4. When the workspace is cleared and a `controls_if` block is added with a `logic_compare` block as the condition, the generated code contains `if (` followed by the comparison expression and a closing `}`.
5. When the "Run" button is clicked with the arithmetic sample program, the output pane shows `7` without any JavaScript errors thrown.
6. When the component unmounts, all Blockly event listeners are removed and `ws.dispose()` has been called (verified by asserting `workspaceRef.current === null` post-unmount).

### Acceptance Test

Load the `03-pocs/l1-blockly-hello/test/fixtures/arithmetic-if.json` workspace state, generate code, execute it in the harness, and assert the output pane shows the value `15` (the result of `(3 + 4) * 2 + 1`). This test must pass in both Chrome and Firefox headless via Playwright.

### Risk-Register IDs Validated / Mitigated

- **R3** (SSR/Strict Mode): Validates the double-mount guard pattern.
- **R7** (Bundle size): Measure and record gzipped bundle size.
- **R8** (Vite bundler quirks): Validates `optimizeDeps.include` fix.

### Definition of Done

- [ ] Vite app builds without errors.
- [ ] Workspace renders in Chrome/Firefox with all five built-in block types in toolbox.
- [ ] Generated code panel updates live on block change without lag visible to human.
- [ ] Acceptance test passes in headless Playwright.
- [ ] All six behavioral tests have passing Vitest or Playwright implementations.
- [ ] Bundle size measured and recorded in `04-logs/l1/command-log.md`.
- [ ] `BlocklyEditor` component follows the double-mount guard pattern from `01-research/blockly/integration-with-frameworks.md`.
- [ ] No `eval()` in production code path (the "Run" button explicitly documents its `new Function` usage as prototype-only).

### Estimated Complexity: Small

---

## L2 — single-generate-text-block

### Goal

Define and register the first custom AI block (`GenerateText`), implement its JavaScript code generator, and validate the async codegen wrapper pattern. The generator must emit v6-correct `generateText(...)` with `await`, wrapped in an async IIFE via a custom `AsyncJavascriptGenerator` subclass.

### Scope

**In:**
- `GenerateText` block: fields for `provider` dropdown (anthropic/openai) and `model` text field; one `prompt` value input
- `OutputSink` block: takes a value input and emits `console.log(result.text)`
- Custom `AsyncJavascriptGenerator` class extending `JavascriptGenerator`, overriding `finish()` to add `(async () => { ... })()`
- Golden-output snapshot test for the `GenerateText` + `OutputSink` combination
- Execution test using `MockLanguageModelV3` that verifies the generated code runs correctly
- Server-side execution via a Vite dev-server proxy to a small Express endpoint (or Vite plugin) — keeps API keys off the client

**Out:**
- Tools
- Structured output
- Streaming
- Multiple models in one workspace
- Next.js (still Vite at this POC level)

### Blocks Introduced

| Block Name | Block Type | JS Generator Output |
|---|---|---|
| GenerateText | `ai_generate_text` | `await generateText({ model: anthropic('claude-haiku-4-5'), prompt: promptExpr, system: systemExpr })` |
| OutputSink | `ai_output_sink` | `console.log(resultExpr.text);\n` |
| ProviderModel | `ai_provider_model` | `anthropic('claude-haiku-4-5')` or `openai('gpt-4o-mini')` — value block |

**Codegen contract for GenerateText (v6.0.184):**
```typescript
// Emitted code (statement block, returns nothing):
const _result0 = await generateText({
  model: anthropic('claude-haiku-4-5'),
  prompt: 'Tell me a joke',
  maxOutputTokens: 2000,
  stopWhen: undefined,  // omitted for single-shot
});
```

**Async wrapper applied by `AsyncJavascriptGenerator.finish()`:**
```javascript
(async () => {
// [provideFunction_ helpers, if any]
const _result0 = await generateText({ ... });
console.log(_result0.text);
})();
```

### AI SDK Surface Exercised

- `generateText` from `ai` — single-shot completion
- `anthropic` from `@ai-sdk/anthropic`
- `openai` from `@ai-sdk/openai`
- `MockLanguageModelV3` from `ai/test`

### Behavioral Tests

1. When `workspaceToCode` is called on a workspace with a `GenerateText` block connected to a text prompt "Tell me a joke", the output string contains `await generateText(` and `prompt: 'Tell me a joke'` — verified by golden-output snapshot.
2. When the generated code is executed in the test harness with a `MockLanguageModelV3` returning `{ content: [{ type: 'text', text: 'Mock answer' }] }`, the execution resolves with `result.text === 'Mock answer'` without throwing.
3. When the `GenerateText` block has no prompt input connected, the generator uses the fallback string `'No prompt provided'` rather than `undefined` or an empty string.
4. When the generated code string is wrapped in the async IIFE by `finish()`, executing it in `new Function(code)()` returns a `Promise` that resolves (not a `SyntaxError` about `await` outside async function).
5. When `provideFunction_` is used by any block in the workspace, the helper function appears inside the IIFE (not outside it), and the generated code executes without `ReferenceError`.
6. When the provider dropdown is set to "openai", the generated code contains `openai(` rather than `anthropic(` — confirming the dropdown value is used in codegen.

### Acceptance Test

Load fixture `test/fixtures/generate-text-joke.json` (a workspace with one `ProviderModel` block set to `anthropic/claude-haiku-4-5`, one `GenerateText` block with prompt "Tell me a short joke", and one `OutputSink` block). Run `workspaceToCode` → assert output matches the golden snapshot. Then execute the generated code with `MockLanguageModelV3` returning `{ text: 'Why did the chicken...?' }` → assert the output pane shows that text.

### Risk-Register IDs Validated / Mitigated

- **R2** (Async codegen): The primary validation for this risk.
- **R6** (Stale LLM knowledge): Golden snapshot confirms `inputSchema` not `parameters`; `generateText` not `experimental_generateText`.
- **R12** (`finish()` / `provideFunction_` interaction): L2 acceptance test validates this explicitly.

### Definition of Done

- [ ] `GenerateText`, `OutputSink`, and `ProviderModel` blocks defined with JSON definitions and registered.
- [ ] Code generators implemented and tested.
- [ ] `AsyncJavascriptGenerator` subclass implemented with `finish()` override.
- [ ] Golden-output snapshot test exists and passes.
- [ ] Execution test with `MockLanguageModelV3` passes.
- [ ] Async wrapper test explicitly verifies no `SyntaxError`.
- [ ] `provideFunction_` interaction test passes.
- [ ] Server-side execution endpoint created (no API key in browser).
- [ ] R2 is marked resolved or escalated in `risk-register.md`.

### Estimated Complexity: Medium

---

## L3 — tool-and-object-blocks

### Goal

Add `Tool`, `GenerateObject` (via `Output.object`), and `ZodSchema` primitive blocks. The code generator must emit correct v6 Zod schema literals and the `output: Output.object({ schema })` pattern — not the deprecated `generateObject()`. This is the most complex codegen in the degree.

### Scope

**In:**
- `Tool` block: fields for name, description; `inputSchema` statement input (accepts Zod primitive blocks); `body` statement input (the execute function body)
- `ZodString`, `ZodNumber`, `ZodBoolean`, `ZodObject`, `ZodArray` schema primitive blocks — value blocks that compose into a Zod object literal
- `GenerateObject` block: accepts a model block, prompt text, and a schema block; emits `generateText({ ..., output: Output.object({ schema: <zodExpr> }) })`
- `UseTools` block: accepts a list of `Tool` blocks and produces the `tools: { ... }` map
- Schema golden-output snapshot tests for each Zod primitive combination
- Structured output test with `MockLanguageModelV3` returning valid and invalid JSON

**Out:**
- Multi-step agents (L4)
- Streaming (L4)
- Dynamic tools (advanced feature, not in POC scope)
- `Output.array` / `Output.choice` (documented but not block-ified in this POC)

### Blocks Introduced

| Block Name | Block Type | JS Generator Output |
|---|---|---|
| Tool | `ai_tool` | `tool({ description: '...', inputSchema: z.object({...}), execute: async (args) => { ... } })` |
| GenerateObject | `ai_generate_object` | `await generateText({ model, prompt, output: Output.object({ schema: z.object({...}) }) })` |
| ZodString | `zod_string` | `z.string()` (value block; output type: "ZodType") |
| ZodNumber | `zod_number` | `z.number()` |
| ZodBoolean | `zod_boolean` | `z.boolean()` |
| ZodObject | `zod_object` | `z.object({ field: zodExpr, ... })` with dynamic mutator for field count |
| ZodArray | `zod_array` | `z.array(zodExpr)` |
| ZodField | `zod_field` | `fieldName: zodTypeExpr` — a key-value pair block that composes into ZodObject |
| UseTools | `ai_use_tools` | `tools: { toolName1: tool1, toolName2: tool2 }` |

**Key codegen rule:** `GenerateObject` must emit `Output.object` not `generateObject`. This is caught by the golden snapshot.

### AI SDK Surface Exercised

- `tool` from `ai` — tool definition
- `generateText` with `output: Output.object({ schema })` from `ai`
- `Output` namespace from `ai`
- `z.object`, `z.string`, `z.number`, `z.boolean`, `z.array` from `zod`
- `MockLanguageModelV3` with tool-call simulation
- `NoObjectGeneratedError` from `ai` — error handling test

### Behavioral Tests

1. When a `ZodObject` block with two `ZodField` children (field "name" → `ZodString`, field "age" → `ZodNumber`) is in the workspace, `workspaceToCode` produces `z.object({ name: z.string(), age: z.number() })` — verified by golden snapshot.
2. When a `GenerateObject` block uses the above schema, the generated code contains `output: Output.object({ schema: z.object({ name: z.string(), age: z.number() }) })` — NOT `generateObject(` — verified by snapshot.
3. When the generated code is executed with `MockLanguageModelV3` returning `'{"name":"Alice","age":30}'` as text, `output.name` equals `"Alice"` and `output.age` equals `30`.
4. When the mock returns `'not valid json'`, the executor catches `NoObjectGeneratedError` and the error is surfaced as a structured error object with `error.text === 'not valid json'` — not an unhandled rejection.
5. When a `Tool` block with the name "getWeather" and a `ZodObject` inputSchema for `{ city: ZodString }` is in the workspace, the generated code contains `tool({ description:`, `inputSchema: z.object({ city: z.string() })`, and `execute: async` — verified by snapshot.
6. When a `ZodObject` block has a field with `.optional()` type (e.g., the user enables an "optional" checkbox on `ZodField`), the generator emits a comment `// Note: use .nullable() for OpenAI strict mode compatibility` adjacent to the `.optional()` call.

### Acceptance Test

Load fixture `test/fixtures/weather-tool-generate-object.json` containing: one `Tool` block (name "getWeather", inputSchema `{ city: z.string() }`, execute body returning `{ temperature: 72 }`), one `GenerateObject` block (prompt "What is the weather?", schema `{ city: z.string(), temperature: z.number() }`), and a `UseTools` block. Run `workspaceToCode` — assert the output matches the golden snapshot. Execute with a mock that simulates a tool-call response followed by a schema-valid JSON response. Assert `output.city` and `output.temperature` are both defined and typed correctly.

### Risk-Register IDs Validated / Mitigated

- **R1** (API drift): Golden snapshots lock `Output.object`, `tool({ inputSchema:... })`, `z.object(...)`.
- **R6** (Stale LLM knowledge): Snapshot confirms `Output.object` not `generateObject`; `inputSchema` not `parameters`.
- **R9** (Provider parity): `.optional()` warning comment generation validated.

### Definition of Done

- [ ] All seven new block types defined and registered.
- [ ] Code generators for all seven blocks implemented and tested.
- [ ] Golden-output snapshots for: ZodObject schema, Tool block, GenerateObject block, UseTools block.
- [ ] Valid-JSON execution test passes.
- [ ] Invalid-JSON error-handling test passes.
- [ ] `.optional()` warning comment test passes.
- [ ] No use of deprecated `generateObject` in any generated code.

### Estimated Complexity: Large

---

## L4 — multi-step-agent-and-stream

### Goal

Add `Agent` and `StreamText` blocks for multi-step agentic execution and streaming output. Add `Loop` and `Branch` control flow blocks. Validate `stopWhen: stepCountIs(N)`, streaming delta iteration, and the `toUIMessageStreamResponse()` server response pattern.

### Scope

**In:**
- `Agent` block: `model`, `tools` (UseTools input), `stopWhen` (numeric field defaulting to 5), `system` (text field)
- `StreamText` block: similar to `GenerateText` but emits `streamText(...)` and iterates `textStream` deltas
- `Loop` block: for-each style, iterates over an array value input; emits `for (const item of arrayExpr) { ... }`
- `Branch` block: if/else with condition value input and two statement inputs
- `onStepFinish` callback wiring in generated agent code for logging
- Server streaming endpoint in the Vite proxy that calls `toUIMessageStreamResponse()` (or equivalent for non-Next.js)
- UI output pane that receives and renders streaming deltas in order
- Multi-step mock scenario: mock returns tool-call on step 1, text on step 2

**Out:**
- `ToolLoopAgent` class (use `generateText` + `stopWhen` at this stage; `ToolLoopAgent` is documented but not block-ified until capstone)
- `useChat` hook (that is a Next.js/React hook pattern; defer to L5)

### Blocks Introduced

| Block Name | Block Type | JS Generator Output |
|---|---|---|
| Agent | `ai_agent` | `await generateText({ model, tools, stopWhen: stepCountIs(N), system, onStepFinish: ... })` |
| StreamText | `ai_stream_text` | `const _stream = streamText({ model, prompt }); for await (const chunk of _stream.textStream) { ... }` |
| Loop | `ai_loop` | `for (const _item of arrayExpr) {\n  ...\n}\n` |
| Branch | `ai_branch` | `if (conditionExpr) {\n  ...\n} else {\n  ...\n}\n` |

**Critical:** `Agent` block emits `stopWhen: stepCountIs(N)` — never `maxSteps`. The field name on the block is "Max Steps" (user-friendly) but the generated code uses `stepCountIs`. The value `N` must be clamped between 1 and 20 by a field validator.

### AI SDK Surface Exercised

- `streamText` from `ai`
- `generateText` with `tools`, `stopWhen: stepCountIs(N)`, `onStepFinish`
- `stepCountIs` from `ai`
- `result.textStream` async iteration
- `result.fullStream` error chunk handling
- `result.totalUsage` for cost logging
- `toUIMessageStreamResponse()` on the result (via server proxy)
- `MockLanguageModelV3` with multi-step tool-call scenario

### Behavioral Tests

1. When an `Agent` block has its "Max Steps" field set to 3, `workspaceToCode` produces `stopWhen: stepCountIs(3)` — not `maxSteps: 3` — verified by golden snapshot.
2. When the generated agent code is executed with a mock that returns a tool-call on step 1 (`finishReason: 'tool-calls'`) and text on step 2 (`finishReason: 'stop'`), `result.steps.length === 2` and `result.toolCalls.length === 1`.
3. When the generated `StreamText` code is executed with a mock yielding chunks `['Hello', ' ', 'world']`, the accumulated text from `textStream` iteration equals `'Hello world'` in the correct order.
4. When the streaming mock yields an error chunk `{ type: 'error', error: new Error('Network failure') }` and the generated code iterates `fullStream`, the executor catches the error and surfaces it — does not silently continue.
5. When a `Loop` block iterates over an array `['a', 'b', 'c']` and an inner `GenerateText` block uses `_item` as the prompt, the generated code contains a `for...of` loop and `_item` is referenced inside it — verified by golden snapshot.
6. When a `Branch` block has its condition evaluate to `false`, the executor takes the else branch and does NOT execute the if-branch statements — verified by running the code with a mock condition.
7. When the agent run completes, `result.totalUsage.inputTokens` is greater than `result.usage.inputTokens` (confirming multi-step accumulation is tracked correctly, not just the last step).

### Acceptance Test

Load fixture `test/fixtures/agent-weather-summarize.json` containing: a `Tool` block ("getWeather"), an `Agent` block with `stopWhen: stepCountIs(3)` and the weather tool attached. Execute with a mock configured to: step 1 → tool-call `getWeather({ city: 'Paris' })`, step 2 → text response "The weather in Paris is 22°C". Assert `result.text` contains "Paris" and `result.steps.length === 2`.

### Risk-Register IDs Validated / Mitigated

- **R1** (API drift): Snapshots lock `stepCountIs`, `streamText`, `textStream`, `toUIMessageStreamResponse`.
- **R5** (Cost runaway): Validates `stopWhen` is always emitted; `totalUsage` logging test.
- **R6** (Stale LLM knowledge): Snapshot confirms `stepCountIs` not `maxSteps`.

### Definition of Done

- [ ] `Agent`, `StreamText`, `Loop`, `Branch` blocks defined and registered.
- [ ] Code generators for all four blocks implemented.
- [ ] `stopWhen: stepCountIs(N)` golden snapshot.
- [ ] Multi-step mock test (2-step tool-call → text) passes.
- [ ] Streaming chunk order test passes.
- [ ] Streaming error chunk test passes.
- [ ] `totalUsage` accumulation test passes.
- [ ] Loop + Branch golden snapshots.
- [ ] Server streaming endpoint in the proxy returns streaming deltas.
- [ ] UI output pane renders deltas in order.

### Estimated Complexity: Large

---

## L5 — deploy-to-vercel

### Goal

Migrate the L4 block library into a Next.js 15 App Router application, implement the server-side execution sandbox, and deploy to Vercel. No new blocks — this POC is entirely about the deployment layer.

### Scope

**In:**
- Next.js 15 App Router project with TypeScript
- `BlocklyEditor` wrapped with `next/dynamic({ ssr: false })` — mandatory
- Route handler `app/api/run/route.ts`: receives `{ source: string, workspaceHash: string }` POST body; validates source (static analysis for forbidden identifiers); executes in `new Function` sandbox with pinned AI SDK imports; returns `toUIMessageStreamResponse()`
- Environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` in `.env.local` (server-only, never `NEXT_PUBLIC_`)
- Vercel deployment with env vars set in project settings
- `next build` must pass cleanly
- Acceptance test: local `next dev` end-to-end with `MockLanguageModelV3` (not a real key)

**Out:**
- `useChat` hook integration (the `useChat` hook from `@ai-sdk/react` is the "right" pattern for a production chat UI, but for the POC we use a simpler `fetch()` → stream reading approach to keep the focus on deployment plumbing)
- Rate limiting (documented but not implemented in POC)
- New blocks

### Blocks Introduced

None. All blocks from L1–L4 are re-used.

### AI SDK Surface Exercised

- `streamText` in a Next.js route handler
- `toUIMessageStreamResponse()` as the route handler return value
- `convertToModelMessages` for UIMessage → ModelMessage conversion
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` via `process.env` on the server
- `MockLanguageModelV3` in the acceptance test (real key in live smoke test only)

### Behavioral Tests

1. When `next build` is run, the build succeeds with exit code 0 and produces no Blockly-related SSR errors or `window is not defined` warnings.
2. When the Blockly workspace route is visited in a browser during `next dev`, the workspace loads and is interactive — verifying `next/dynamic({ ssr: false })` is working correctly.
3. When the route handler at `/api/run` receives a POST with a source string containing `process.env.SECRET`, the handler returns HTTP 400 with a body explaining the forbidden identifier — the source is never executed.
4. When the route handler receives a valid source string (generated by `workspaceToCode` from a `GenerateText` workspace) and the `MockLanguageModelV3` is injected (via test configuration), the response streams text deltas and the status is 200.
5. When the deployed Vercel URL serves the `/api/run` endpoint with a real `ANTHROPIC_API_KEY` set in project settings and a simple prompt, the response streams and the browser receives at least one text delta within 10 seconds.
6. When a user visits the deployed URL in an incognito browser, the Blockly workspace loads without any authentication errors — confirming the deployment is publicly accessible.

### Acceptance Test

Run `next dev` locally. Submit the `generate-text-joke` workspace program via the UI (the same fixture as L2's acceptance test). Assert the streaming response delivers text to the output pane within 5 seconds. Then run `vercel --prod` and perform the same test against the deployed URL with a real provider key.

### Risk-Register IDs Validated / Mitigated

- **R3** (SSR): `next build` success confirms SSR exclusion is correct.
- **R4** (Sandbox): Forbidden identifier rejection test validates the static analysis gate.
- **R7** (Bundle size): Measure and record Vercel build output sizes.
- **R8** (Bundler): Next.js / Webpack 5 + Blockly compatibility confirmed.
- **R10** (Edge runtime): Route handler uses Node.js runtime (no `export const runtime = 'edge'`); documented.

### Definition of Done

- [ ] `next build` passes cleanly.
- [ ] `BlocklyEditor` uses `next/dynamic({ ssr: false })`.
- [ ] Route handler `/api/run` implemented with forbidden identifier check.
- [ ] Route handler uses `toUIMessageStreamResponse()`.
- [ ] Local `next dev` end-to-end test passes with mock model.
- [ ] `vercel --prod` deployment succeeds.
- [ ] Deployed URL accessible in browser.
- [ ] Deployed URL streams response for a real provider key.
- [ ] All six behavioral tests pass.

### Estimated Complexity: Medium

---

## L-capstone — research-agent

### Goal

Compose a research-and-summarize agent from the standard block library. Deploy it. The capstone demonstrates that a user (or LLM agent) can build a non-trivial multi-step AI program visually and share a working URL.

### Scope

**In:**
- Default workspace (pre-loaded JSON fixture) containing: a `Tool` block for "search" (stub that returns canned results), a `Tool` block for "fetch" (stub that fetches a URL and extracts text), an `Agent` block with `stopWhen: stepCountIs(5)`, a `GenerateObject` block producing a `ResearchSummary` schema
- `ResearchSummary` Zod schema: `{ title: z.string(), keyFindings: z.array(z.string()), confidenceScore: z.number(), relatedTopics: z.array(z.object({...})), limitations: z.string(), suggestedNextSteps: z.array(z.string()) }` (from `01-research/vercel-ai-sdk/generate-object.md`)
- Real provider run: Anthropic `claude-haiku-4-5` for cost efficiency
- UI: streaming output pane + structured result display
- Deployed at a public Vercel URL
- Three query acceptance tests committed to `07-evidence/capstone/`

**Out:**
- Real web search API integration (too expensive for POC; use stub tools)
- User authentication
- Persisted workspace history
- `ToolLoopAgent` class (documented in skill pack as the production alternative; capstone uses `generateText` with `stopWhen` for explicitness)

### Blocks Introduced

None mandatory. Any new block created here is generalized back into the standard library.

### AI SDK Surface Exercised

- Full: `generateText` with `tools`, `output: Output.object({ schema })`, `stopWhen: stepCountIs(5)`, `onStepFinish`, `result.totalUsage`
- `streamText` via `StreamText` block for interim output
- `anthropic('claude-haiku-4-5')` provider (real API key)
- `MockLanguageModelV3` in CI tests (real model gated by `RUN_LIVE_MODEL_TESTS=1`)

### Behavioral Tests

1. When the pre-loaded research workspace is compiled with `workspaceToCode`, the emitted code contains: `stopWhen: stepCountIs(5)`, `output: Output.object({`, `z.object({ title: z.string(), keyFindings: z.array(z.string())` — all verified against a golden snapshot.
2. When the capstone is run with a mock model configured to: (a) call the "search" tool, (b) call the "fetch" tool, (c) return structured JSON matching `ResearchSummary` — the `output` object has all required fields populated and passes `researchSummarySchema.parse(output)`.
3. When the deployed capstone receives the query "Summarize transformer attention mechanisms", the streaming response begins within 5 seconds and the structured output section populates completely within 60 seconds.
4. When the deployed capstone receives three distinct queries sequentially, all three return schema-valid `ResearchSummary` objects without error.
5. When `result.totalUsage.inputTokens` is logged for each capstone run, the value is below 20,000 (confirming the `stopWhen: stepCountIs(5)` bound is respected).
6. When the capstone URL is opened in an incognito browser, the workspace loads with the pre-loaded research agent program visible — no blank workspace.

### Acceptance Test

With `RUN_LIVE_MODEL_TESTS=1 ANTHROPIC_API_KEY=<key>`, run the three acceptance queries:
1. "Summarize transformer attention mechanisms"
2. "Summarize the history of distributed computing"
3. "Summarize recent developments in quantum error correction"

For each: assert HTTP 200, assert the response is a schema-valid `ResearchSummary` JSON object, assert `keyFindings` has at least 2 items, assert `confidenceScore` is between 0 and 1. Record the deployed URL, response times, and token usage in `07-evidence/capstone/acceptance-results.md`.

### Risk-Register IDs Validated / Mitigated

- **R1** (API drift): Final golden snapshot is the regression baseline for the complete degree.
- **R5** (Cost runaway): `totalUsage` logged and bounded by `stopWhen`.
- **R9** (Provider parity): Tested with Anthropic; documented divergence from OpenAI strict mode.
- **R10** (Edge runtime): Node.js runtime confirmed; not Edge.

### Definition of Done

- [ ] Pre-loaded research workspace JSON committed as fixture.
- [ ] Capstone deployed to Vercel with public URL.
- [ ] Three acceptance queries pass with real Anthropic key.
- [ ] All six behavioral tests pass (mock-model versions in CI).
- [ ] Golden-output snapshot committed.
- [ ] `07-evidence/capstone/` contains: deployed URL, screen recording, acceptance results.
- [ ] `result.totalUsage` logging confirmed in `04-logs/capstone/`.
- [ ] `success-criteria.md` Demo Criterion is met.

### Estimated Complexity: Medium
