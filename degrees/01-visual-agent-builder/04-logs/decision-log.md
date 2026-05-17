# Decision Log — Visual Agent Builder

Append-only record of design and tooling decisions. Every entry names the decision, the alternatives considered, the rationale, and the trade-offs accepted.

## Entry Format

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>

- **Decision**:
- **Alternatives considered**:
- **Rationale**:
- **Trade-offs accepted**:
- **Reversibility** (easy / costly / one-way):
- **Revisit when**:
```

## Entries

## 2026-05-17T00:13:00Z — Use pnpm over npm for L1

- **Decision**: Use pnpm as the package manager for the L1 POC.
- **Alternatives considered**: npm, yarn
- **Rationale**: pnpm is available on this machine (`pnpm@10.33.4`), is faster than npm, and is the monorepo-standard choice. The task contract references pnpm in its commands.
- **Trade-offs accepted**: pnpm 10.x blocks build scripts by default (esbuild workaround needed).
- **Reversibility**: easy (package-lock.json vs pnpm-lock.yaml)
- **Revisit when**: L2+ if workspace setup changes.

## 2026-05-17T00:13:10Z — Use happy-dom over jsdom for test environment

- **Decision**: Use `happy-dom` as the Vitest test environment (specified in `vitest.config.ts`).
- **Alternatives considered**: jsdom
- **Rationale**: Task contract specifies `happy-dom@latest stable`. Both fail for Blockly.inject (same FocusManager issue) so the choice doesn't matter for workspace tests. happy-dom is faster.
- **Trade-offs accepted**: happy-dom has the same Blockly.inject incompatibility as jsdom. Workspace-mount tests must mock inject.
- **Reversibility**: easy (one config line change)
- **Revisit when**: Never for L1. If happy-dom fixes EventTarget compatibility, injection mock can be removed.

## 2026-05-17T00:14:00Z — Use input_value for greet block NAME (not field_input)

- **Decision**: Greet block uses `input_value` connector for NAME rather than `field_input` text field.
- **Alternatives considered**: `field_input` (text embedded in block face)
- **Rationale**: The test fixtures use `inputs.NAME.block` structure which is the JSON serialization of `input_value` connectors. `field_input` would require `fields.GREET_NAME` structure.
- **Trade-offs accepted**: `input_value` requires a text block to be connected; standalone greet block shows an empty slot unless a shadow is configured.
- **Reversibility**: easy (would require fixture changes)
- **Revisit when**: If the greet block is redesigned for L2+ with a simpler UX.

## 2026-05-17T00:28:00Z — L2: Async codegen approach: post-process vs. subclass finish()

- **Decision**: Implement async wrapping as a post-processor (`generateAsyncModule()`) rather than subclassing `javascriptGenerator` and overriding `finish()`.
- **Alternatives considered**: Subclass `javascriptGenerator.constructor` (planner's preferred approach). Post-process the raw `workspaceToCode()` output.
- **Rationale**: Blockly exports `javascriptGenerator` as a singleton instance. The class is accessible via `Object.getPrototypeOf(javascriptGenerator).constructor` but TypeScript doesn't know the constructor's signature, making subclassing fragile and untyped. The post-process approach is strictly equivalent: it intercepts the output of `workspaceToCode` and wraps it — exactly what `finish()` does.
- **Trade-offs accepted**: The post-processor is a separate function call rather than a method override. Callers must call `generateAsyncModule(workspace)` instead of `asyncGenerator.workspaceToCode(workspace)`. The API is slightly more explicit but less surprising.
- **Reversibility**: easy (refactor to subclass if needed in L3+)
- **Revisit when**: L3+ if multiple generators (async vs. sync) need to share an interface.

## 2026-05-17T00:28:30Z — L2: Compile-execute strategy: AsyncFunction injection vs. temp-file dynamic import

- **Decision**: Use `new Function('generateText', 'anthropic', 'openai', body)` with injected modules for test execution.
- **Alternatives considered**: Write emitted source to a temp `.mjs` file and use `await import('file:///tmp/...')`.
- **Rationale**: The temp-file approach fails in Vitest because Vite resolves dynamic imports through its module graph and refuses to load files outside the project root. The `new Function` approach strips ES import/export syntax and injects the real (or mock) modules as parameters — the same code runs, just in a different execution context.
- **Trade-offs accepted**: The test helper (`buildRunnable()`) adds complexity. The emitted module-mode code is not literally "run as-is" in tests — it's adapted. This is documented in both `implementation-notes.md` and `surprises.md`.
- **Reversibility**: easy (swap to temp-file if Vitest adds file:// support for arbitrary paths)
- **Revisit when**: L5 (Node.js server-side execution) — a proper vm sandbox or subprocess approach will be needed anyway.

## 2026-05-17T00:28:45Z — L2: Module vs. injected mode for emitted code

- **Decision**: Always emit module mode (with ES `import`/`export`). Tests use an injection adapter, not a separate "injected mode" generator.
- **Alternatives considered**: Two generator modes: module mode (production) and injected mode (parameters for testing).
- **Rationale**: A single output format is simpler and less error-prone. The test adapter is 20 lines and clearly separated from the generator. Maintaining two codegen modes would require duplicating tests.
- **Trade-offs accepted**: Tests cannot run the emitted code without the `buildRunnable()` adapter.
- **Reversibility**: easy
- **Revisit when**: If the emitted code is tested in a Node.js subprocess or browser E2E at L5.

## 2026-05-17T00:15:00Z — Mock Blockly.inject in workspace-mount tests

- **Decision**: Mock `Blockly.inject` in `workspace-mount.test.tsx` instead of testing with real injection.
- **Alternatives considered**: (1) Use jsdom with real inject. (2) Skip workspace-mount tests. (3) Use Playwright for all component tests.
- **Rationale**: Research docs state UI tests require a real browser. happy-dom/jsdom are incompatible with Blockly's FocusManager. Skipping would leave BT-005 untested. Playwright is out of scope for unit tests. Mocking inject lets us test the React lifecycle (Strict Mode guard) without Blockly DOM dependency.
- **Trade-offs accepted**: The mock doesn't test actual Blockly rendering. The Strict Mode guard logic is tested via a pure unit test simulation and via the `mockInject` call count assertions.
- **Reversibility**: easy (remove mock when Playwright tests are added at L5)
- **Revisit when**: L5 adds Playwright — real E2E tests will cover actual inject behavior.

## 2026-05-17T00:45:00Z — L3: Multi-line tool body uses ToolReturn block instead of return field

- **Decision**: Companion `ai_tool_return` statement block compiles to `return <value>;` inside the tool's `execute` body.
- **Alternatives considered**: (1) A "return value" value input directly on the `ai_tool` block's face. (2) A text field for a raw expression string.
- **Rationale**: Blockly fields are single-line strings — they can't hold composed block expressions (e.g., a ZodObject block or a function call block). A statement block follows Blockly's natural composition model: any expression block can be dragged into the `VALUE` input of `ai_tool_return`. This is the same pattern Blockly's built-in `procedures_return` block uses. It also allows multi-statement execute bodies with logic before the final return.
- **Trade-offs accepted**: Users must explicitly place a ToolReturn block at the end of the body. Forgetting it means the execute function returns `undefined` implicitly. Documentation in tooltip mitigates this.
- **Reversibility**: easy (if a simpler single-value UI is preferred later, add a shadow/default ToolReturn)
- **Revisit when**: L4+ when tool bodies may have conditional return paths.

## 2026-05-17T00:45:10Z — L3: .nullable() over .optional() for ZodField optional toggle

- **Decision**: When the ZodField `OPTIONAL` checkbox is checked, emit `.nullable()` (not `.optional()`).
- **Alternatives considered**: `.optional()` (Zod standard). A dropdown with both choices.
- **Rationale**: OpenAI's strict structured output mode fails schema validation when fields use `.optional()`. The research document `generate-object.md` explicitly states: "Use `.nullable()` not `.optional()` for OpenAI strict mode." Since the primary use case for GenerateObject is OpenAI/Anthropic structured output, `.nullable()` is the safer default. The field label says "nullable:" to be transparent.
- **Trade-offs accepted**: Semantically `.nullable()` means the value can be `null` (not `undefined`). Code consuming the generated object must handle `null` values, not missing keys. This is a different contract than `.optional()`. Advanced users who need `.optional()` cannot do so via the visual block (they would need to write code manually).
- **Reversibility**: easy (add dropdown in L4+)
- **Revisit when**: When Anthropic or other providers relax strict mode requirements, or when user research shows `.optional()` is more intuitive.

## 2026-05-17T00:45:20Z — L3: Testing tool execution without a real model

- **Decision**: Use `MockLanguageModelV3` with `mockValues(step1, step2)` — step 1 returns a tool-call, step 2 returns the final text — to prove end-to-end tool execution wiring.
- **Alternatives considered**: (1) Use a real model (Anthropic/OpenAI) for one test. (2) Test only that the tools map is passed to generateText (inspect doGenerateCalls), not that execute runs. (3) Use a single-step mock that only returns a tool-call (leaving no final text step).
- **Rationale**: No real LLM calls in CI (cost, flakiness). Option 2 doesn't prove the tool's `execute` function actually runs — it only proves the tools map is wired. The two-step mock (tool-call → text) proves the full loop: (a) mock receives tool call, (b) tool.execute runs in the SDK's step loop, (c) mock responds with text after seeing tool result, (d) sink receives final text.
- **Trade-offs accepted**: The `stopWhen: stepCountIs(5)` in the emitted code must be honored. The mock's second response stops the loop naturally with `finishReason: { unified: 'stop' }`. If the emitted code omitted `stopWhen`, the loop would continue indefinitely (third call would replay the last mock value forever).
- **Reversibility**: easy
- **Revisit when**: L4 adds `ToolLoopAgent` which may change how tool loops are bounded.

## 2026-05-17T00:45:30Z — L3: toolChoice defaults to 'auto' when tools wired

- **Decision**: When a `UseTools` block is connected to `GenerateText`, emit `toolChoice: 'auto'` in the `generateText` call.
- **Alternatives considered**: (1) No toolChoice (SDK default). (2) A dropdown on the `GenerateText` block for all toolChoice options. (3) A separate `ToolChoiceBlock`.
- **Rationale**: `toolChoice: 'auto'` is the SDK default and the most useful setting for typical agentic flows. Emitting it explicitly makes the generated code self-documenting. A dropdown on the block would add UI complexity for a feature that rarely needs overriding. A separate block adds visual overhead.
- **Trade-offs accepted**: Users who want `toolChoice: 'required'` or a specific tool cannot do so via the block UI (L4+ work).
- **Reversibility**: easy (add dropdown in L4+)
- **Revisit when**: L4 if agents need fine-grained tool routing.

## 2026-05-17T01:09:00Z — L4: generateText with stopWhen over ToolLoopAgent class

- **Decision**: The `Agent` block compiles to `(await generateText({ model, prompt, tools, stopWhen })).text`, not `new ToolLoopAgent({ ... }).generate({ prompt })`.
- **Alternatives considered**: `ToolLoopAgent` — a reusable class instantiated once with fixed config, called many times. Available since ai@6.0.0.
- **Rationale**: (1) `generateText` with `stopWhen` is the canonical v6 one-shot agent pattern. (2) `ToolLoopAgent` is designed for applications that reuse an agent config across many requests (e.g., a Next.js route handler serving N users). Our blocks generate code executed once per program run — there is no reuse benefit. (3) `generateText` makes the entire agent loop visible in the emitted code (model, tools, stopWhen all in one call object). `ToolLoopAgent` hides the loop behind a class. (4) `generateText` is fully testable with `MockLanguageModelV3` without any class instantiation. (5) Both are v6-correct; `generateText` is the safer, more explicit choice.
- **Trade-offs accepted**: If the generated code is eventually deployed as a server-side agent handling many concurrent requests, `ToolLoopAgent` would be more efficient (one config instance, not one `generateText` call per request). This is L5+ work.
- **Reversibility**: easy (new block type or new codegen template)
- **Revisit when**: L5 deploy-to-vercel — if agent blocks are used in server-side route handlers.

## 2026-05-17T01:09:10Z — L4: Mutator for UseTools deferred

- **Decision**: Skip the Blockly mutator pattern for `UseTools`. Keep the L3 fixed N=5 inputs (TOOL_0 through TOOL_4... actually L3 only has 3 slots — we keep the same).
- **Alternatives considered**: Blockly mutator pattern: allows users to add/remove tool inputs dynamically via a UI button and a companion XML serializer.
- **Rationale**: The Blockly mutator API (mixins, `decompose()`, `compose()`, `mutationToDom()`, `domToMutation()`) requires significant boilerplate and is poorly documented for custom blocks. Research estimated >30 minutes to implement correctly. The task contract explicitly says "Defer if mutators prove too complex — document and keep N=5 fixed inputs. The mutator is nice to have for L4; the agent/stream blocks are the must-have." The fixed N=3 inputs are sufficient for all L4 test scenarios.
- **Trade-offs accepted**: Maximum 3 tools per UseTools block. For programs needing more tools, users must compose multiple UseTools blocks (not currently supported) or write code manually.
- **Reversibility**: medium (requires adding mixin + serialization + UI, updating fixtures)
- **Revisit when**: L5 or when users report needing more than 3 tools.

## 2026-05-17T01:25:00Z — L5: Server-side Blockly headless execution strategy

- **Decision**: Use `new Blockly.Workspace()` (not `Blockly.inject`) on the server. Register all blocks as side-effect imports at route-handler module load time.
- **Alternatives considered**: (1) Generate code in the browser and POST the source string. (2) Write workspace JSON to disk and spawn a child process. (3) Use a headless DOM shim (jsdom/happy-dom) on the server to enable Blockly.inject.
- **Rationale**: `Blockly.Workspace` (the serialization/codegen API) works in Node.js without any DOM. `Blockly.inject` (the visual renderer) requires DOM but is NOT used here. All L1–L4 tests used `new Blockly.Workspace()` directly — this is already proven. Approach (1) would leak the codegen to the client and make server-side execution insecure. Approach (2) would add complexity and temp-file I/O. Approach (3) is unnecessary.
- **Trade-offs accepted**: All block registrations must happen before the workspace is created. The route handler must import all block modules at the top level to ensure this ordering. This is a one-time module-load cost, not per-request.
- **Reversibility**: easy
- **Revisit when**: If Blockly's import chain adds DOM references at module load time (not observed so far).

## 2026-05-17T01:25:10Z — L5: Stream-back transport (custom ReadableStream over toUIMessageStreamResponse)

- **Decision**: Return a custom `ReadableStream<Uint8Array>` response from `runEmitted`. Each `__sink(label, value)` call enqueues the value as UTF-8 bytes. Content-Type: text/plain; charset=utf-8.
- **Alternatives considered**: (1) `result.toUIMessageStreamResponse()` — built-in helper from the AI SDK. (2) Server-Sent Events (SSE) framing with `data:` prefix. (3) JSON-lines (newline-delimited JSON).
- **Rationale**: `toUIMessageStreamResponse()` requires calling `streamText()` at the route handler level and passing its return value directly to the helper. Our architecture executes arbitrary user-authored Blockly programs that may call `generateText`, `streamText`, or `Agent` (multi-step). The unified sink callback approach works for all three cases — the route handler doesn't need to know which AI function the emitted code calls. This matches L4's `buildRunnable` injection pattern exactly.
- **Trade-offs accepted**: The response is NOT in the UIMessage stream protocol format (no `d:` framing). The browser client uses `response.body.getReader()` and collects raw text chunks, not parsed UIMessages. This is simpler for the POC but would need to be redesigned for a production `useChat` integration.
- **Reversibility**: medium — would require changing the route handler and client to use the UIMessage protocol.
- **Revisit when**: If `useChat` from `@ai-sdk/react` is integrated (L6+).

## 2026-05-17T01:25:20Z — L5: Node.js runtime for /api/run (NOT Edge)

- **Decision**: `/api/run` route exports `export const runtime = 'nodejs'`.
- **Alternatives considered**: `export const runtime = 'edge'` (Vercel Edge Runtime).
- **Rationale**: Edge runtime caps execution at 25 seconds (Vercel hobby plan). Multi-step agent loops in L4 can use up to `stepCountIs(5)` steps — each step is an LLM call (~5–10 seconds). 5 steps × 10s = 50s, exceeding the edge cap. Node.js runtime supports up to 60 seconds (hobby) or unlimited on Pro. This is documented as R10 in the task contract.
- **Trade-offs accepted**: Cold starts are slower on Node.js than Edge (~200ms vs ~50ms). Bundle size is not constrained (Edge has 1MB limit). This is the right trade-off for an agent executor.
- **Reversibility**: easy (one export change) but functionally incorrect for multi-step agents on Edge.
- **Revisit when**: Never for this use case. If a "simple generateText only" variant is needed, a separate `/api/chat` Edge route could coexist.

## 2026-05-17T01:09:20Z — L4: textStream iteration via for await, NOT fullStream

- **Decision**: `StreamSink` iterates `source.textStream` with `for await (const __chunk of ...)`.
- **Alternatives considered**: `fullStream` — emits typed chunks including text, tool-call, tool-result, start/finish events, errors.
- **Rationale**: (1) `textStream` is the simplest API — yields only text string deltas, exactly what a visual "stream output" block needs. (2) `fullStream` requires a switch statement on `part.type` to extract text, adding complexity the user can't configure visually. (3) The task contract specifically says "textStream" is the property name to use.
- **Trade-offs accepted**: `StreamSink` cannot observe tool-calls or step-boundaries in the stream. For full observability, users would need a custom `for await` over `fullStream` — outside scope of visual blocks.
- **Reversibility**: easy (add a separate `FullStreamSink` block if needed)
- **Revisit when**: L5 if streaming agent observability (tool-calls, step events) is needed in the UI.
