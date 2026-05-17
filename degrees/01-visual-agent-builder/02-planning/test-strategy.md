# Test Strategy — Visual Agent Builder

## Framework Choice: Vitest

**Chosen framework:** Vitest `^2.x`

**Rationale:**

1. **ESM compatibility.** The AI SDK (`ai@6.0.184`) ships ESM-first. Vitest runs tests in native ESM mode without the `--experimental-vm-modules` flag that Jest requires. This eliminates a class of `SyntaxError: Cannot use import statement in a module` failures that are common with Jest + AI SDK.

2. **Blockly's hybrid module shape.** Blockly ships `.mjs` wrappers around pre-compiled UMD bundles. Vitest's default dependency pre-bundling (via Vite/esbuild) handles this correctly with `deps.inline: ['blockly']`. Jest's `transform` config requires additional manual setup (`moduleNameMapper`, `transformIgnorePatterns`) to handle the same shape.

3. **Next.js 15 alignment.** Vitest is the recommended test runner for Vite-based projects and works well alongside Next.js 15. The `@vitejs/plugin-react` is shared between the production build and the test environment. Jest requires a separate babel/swc configuration.

4. **Speed.** Vitest runs tests in parallel by default and is faster than Jest for projects with many small unit tests (e.g., one test file per block generator).

5. **Snapshot testing.** Vitest's `expect(value).toMatchSnapshot()` and `expect(value).toMatchInlineSnapshot(...)` APIs are compatible with Jest. Existing Jest snapshot patterns migrate without changes.

**Why not Jest:**
Jest works but requires `--experimental-vm-modules` for ESM, `transformIgnorePatterns` for Blockly's UMD bundles, and manual `moduleNameMapper` for AI SDK subpath exports (`ai/test`). Each of these is a setup failure mode that would slow down POC workers. Vitest eliminates all three.

**Evidence:** `01-research/vercel-ai-sdk/testing-model.md` notes `ai/test` subpath may not work with CJS require; Vitest's native ESM support avoids this. `01-research/blockly/testing-model.md` shows Blockly's own tests use Mocha/Chai — Vitest is a compatible replacement for CI.

---

## Test Types

### 1. Unit Tests: Block Definitions and Generators

**What they test:** Each block's JSON definition is correctly formed (required fields present, connection types valid). Each generator function produces the expected code string for a given block configuration.

**How they run:** Headless. Import `Workspace` from `blockly/core` (not `WorkspaceSvg`). No DOM required because the headless `Workspace` class works in Node.js (Blockly bootstraps jsdom automatically via `core-node.js` for the XML parsing that some internals still use, but `Workspace` + code generation does not require SVG).

**Pattern:**
```typescript
// test/blocks/ai_generate_text.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { blocks } from '../../src/blocks/ai_generate_text';
import { forBlock } from '../../src/generators/javascript';

Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

describe('ai_generate_text generator', () => {
  let workspace: Blockly.Workspace;
  beforeEach(() => { workspace = new Blockly.Workspace(); });
  afterEach(() => { workspace.dispose(); });

  it('emits generateText with await', () => {
    const state = { /* fixture */ };
    Blockly.Events.disable();
    Blockly.serialization.workspaces.load(state, workspace);
    Blockly.Events.enable();

    const code = javascriptGenerator.workspaceToCode(workspace);
    expect(code).toContain('await generateText(');
    expect(code).toContain('stopWhen');  // agent blocks only
  });
});
```

**Coverage target:** 90% line coverage on the generator layer (`src/generators/`). Use `vitest --coverage` with `@vitest/coverage-v8`.

**Per `01-research/blockly/testing-model.md`:** Always wrap programmatic workspace loads in `Blockly.Events.disable()` / `Blockly.Events.enable()`. Always call `workspace.dispose()` in `afterEach`.

---

### 2. Golden-Output (Snapshot) Tests

**What they test:** The exact emitted code string for a fixed workspace state. These are the **primary defense against SDK API drift (R1)** and stale LLM knowledge (R6).

**Pattern:** Each block (or meaningful block combination) has one golden-output test. The snapshot is committed to the repo. A failing snapshot means a code generator changed its output — requires human review before updating.

```typescript
// test/snapshots/generate-text-golden.test.ts
it('matches golden output snapshot', () => {
  Blockly.Events.disable();
  Blockly.serialization.workspaces.load(fixture, workspace);
  Blockly.Events.enable();

  const code = javascriptGenerator.workspaceToCode(workspace);
  expect(code).toMatchSnapshot();
  // Snapshot content example:
  // "
  // (async () => {
  // const _result0 = await generateText({
  //   model: anthropic('claude-haiku-4-5'),
  //   prompt: 'Tell me a joke',
  //   maxOutputTokens: 2000,
  // });
  // console.log(_result0.text);
  // })();
  // "
});
```

**What a snapshot failure means:** Either (a) a generator was intentionally changed — update snapshot after review, or (b) an AI SDK API name drifted (e.g., after `npm update`) — this is R1 occurring. In case (b), fix the generator to use the correct v6.0.184 API before updating the snapshot.

**Fixture directory:** `degrees/01-visual-agent-builder/03-pocs/<level>/test/fixtures/`
- Fixtures are JSON workspace states captured via `Blockly.serialization.workspaces.save(ws)`.
- Each fixture is named after the block combination it represents: `generate-text-simple.json`, `tool-zod-string.json`, `agent-two-tools.json`, etc.

**Snapshots directory:** `degrees/01-visual-agent-builder/03-pocs/<level>/test/__snapshots__/`

---

### 3. Integration Tests: Execute Generated Code with MockLanguageModelV3

**What they test:** The full pipeline from workspace JSON fixture → `workspaceToCode` → code string → execution in the server sandbox → mock model response → result object shape.

**Key constraint:** No real API calls. `MockLanguageModelV3` from `ai/test` is mandatory in CI.

**Pattern — single step:**
```typescript
import { generateText } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

it('generates text with mock model', async () => {
  const mockModel = new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: 'Mock response' }],
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }),
  });

  // Execute the generated code string with the mock model injected
  const code = compileWorkspace(fixture);
  const result = await executeInSandbox(code, { model: mockModel });

  expect(result.text).toBe('Mock response');
  expect(mockModel.doGenerateCalls).toHaveLength(1);
});
```

**Pattern — multi-step tool call:**
```typescript
import { mockValues } from 'ai/test';

const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues([
    {
      content: [{ type: 'tool-call', toolName: 'getWeather', toolCallId: 'tc1', input: { city: 'Paris' } }],
      finishReason: 'tool-calls',
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
    },
    {
      content: [{ type: 'text', text: 'The weather in Paris is 22°C.' }],
      finishReason: 'stop',
      usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
    },
  ]),
});
```

**Per `01-research/vercel-ai-sdk/testing-model.md`:** `mockModel.doGenerateCalls[0]` contains the full `LanguageModelV3CallOptions` sent to the model — use it to assert `tools`, `toolChoice`, and `stopWhen` were passed correctly.

---

### 4. End-to-End (E2E) Tests

**What they test:** The browser UI → workspace interaction → code generation → submission → streaming response → UI update pipeline.

**Framework:** Playwright (separate from Vitest; run via `playwright test`).

**Scope per POC:**
- L1: Drag a block, assert generated code panel updates.
- L2: Load a fixture, click "Run", assert output pane shows mock response.
- L5: Load fixture in Next.js app, click "Run", assert streaming output appears in the output pane.

**Mock strategy in E2E:** The E2E test environment uses a mock API server (MSW or a local express stub) that returns `MockLanguageModelV3`-equivalent responses over HTTP. Real API keys are never used in E2E tests.

**Execution:** Run locally and in CI on push. Playwright tests run in headless Chromium. Firefox is run as a secondary check (not required to pass CI).

---

### 5. Provider-Contract Tests (Smoke Tests)

**What they test:** That the exact API usage in generated code works with a real provider, not just the mock. Tests whether `Output.object({ schema })` works with Anthropic and OpenAI, whether `stopWhen: stepCountIs(N)` terminates correctly, and whether streaming delivers chunks.

**Gate:** `RUN_LIVE_MODEL_TESTS=1` environment variable must be set. If not set, these tests are skipped (`it.skipIf(!process.env.RUN_LIVE_MODEL_TESTS)(...)`).

**When to run:** Manually before each POC is marked done. NOT in CI on every commit (cost and flakiness).

**Models used:** `anthropic('claude-haiku-4-5')` and `openai('gpt-4o-mini')` only — cheapest available for smoke tests.

**Pattern:**
```typescript
it.skipIf(!process.env.RUN_LIVE_MODEL_TESTS)('Output.object works with Anthropic', async () => {
  const { output } = await generateText({
    model: anthropic('claude-haiku-4-5'),
    output: Output.object({ schema: z.object({ answer: z.string() }) }),
    prompt: 'Say "yes" in the answer field.',
    temperature: 0,
  });
  expect(output.answer).toBeTruthy();
});
```

**Per `01-research/vercel-ai-sdk/testing-model.md`:** Provider-contract tests are "golden/snapshot" quality checks — run on schedule (weekly or pre-release), not per PR.

---

## Mocking Strategy

### MockLanguageModelV3

Primary mock. From `ai/test`. Use for all unit and integration tests.

```typescript
import { MockLanguageModelV3, mockValues, simulateReadableStream } from 'ai/test';
```

- **Single response:** `doGenerate: async () => ({ content, finishReason, usage })`
- **Sequence of responses (multi-step):** `doGenerate: mockValues([response1, response2, ...])`
- **Streaming:** `doStream: async () => ({ stream: simulateReadableStream({ chunks: [...] }), rawCall: {...}, request: {} })`

### Asserting Tools Were Called

```typescript
const call = mockModel.doGenerateCalls[0];
expect(call.tools).toBeDefined();
expect(Object.keys(call.tools!)).toContain('getWeather');
// Assert stopWhen was passed (it appears as part of the call options in the mock):
// Note: stopWhen is evaluated by the SDK loop, not passed to the model directly.
// Assert via result.steps.length:
expect(result.steps.length).toBeLessThanOrEqual(stepLimit);
```

### Asserting Structured Output Schema Validation

```typescript
// Valid mock response — parsed by SDK before returning:
doGenerate: async () => ({
  content: [{ type: 'text', text: '{"name":"Alice","age":30}' }],
  finishReason: 'stop',
  usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
})

// Expect valid output:
const { output } = await generateText({ model: mockModel, output: Output.object({ schema }), prompt });
expect(schema.parse(output)).toEqual(output);  // Zod validation passes

// Invalid mock response — triggers NoObjectGeneratedError:
doGenerate: async () => ({
  content: [{ type: 'text', text: 'not json' }],
  finishReason: 'stop',
  usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
})
await expect(generateText({ model: mockModel, output: Output.object({ schema }), prompt }))
  .rejects.toSatisfy(NoObjectGeneratedError.isInstance);
```

---

## Fixture Format

Workspace states are serialized as JSON using `Blockly.serialization.workspaces.save(workspace)`.

**Directory:** `degrees/01-visual-agent-builder/03-pocs/<level>/test/fixtures/`

**Naming convention:** `<block-combination>-<variant>.json`

Examples:
- `generate-text-simple.json` — one `GenerateText` block, one `ProviderModel` block, no extras
- `tool-weather-zodstring.json` — one `Tool` block with ZodString input
- `agent-two-tools-step5.json` — one `Agent` block with two tools and `stopWhen: stepCountIs(5)`

**How to create a fixture:**
1. Mount a Blockly workspace in the browser (or test harness).
2. Arrange the desired blocks.
3. Call `Blockly.serialization.workspaces.save(ws)` and copy the JSON to the fixture file.
4. Commit the fixture alongside the test that uses it.

**Loading a fixture in tests:**
```typescript
import fixture from '../fixtures/generate-text-simple.json';

Blockly.Events.disable();
Blockly.serialization.workspaces.load(fixture, workspace);
Blockly.Events.enable();
```

---

## Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| Code generators (`src/generators/`) | 90% | These are the most critical and most testable layer. Every branch in a generator (e.g., "has inputs" vs. "no inputs") must be covered. |
| Block definitions (`src/blocks/`) | 70% | JSON block definitions are mostly declarative; test that required fields are present. |
| Execution sandbox (`src/executor.ts`) | 80% | The sandbox has multiple code paths (forbidden identifier check, import map injection, error handling). Cover all branches. |
| UI components (`src/components/`) | 50% | React components with DOM/Blockly dependencies are hard to unit test. Rely on E2E tests for coverage. |
| Overall | 70% | Accept lower overall due to UI and Blockly DOM dependency exclusions. |

**Measuring coverage:** `vitest run --coverage` with `@vitest/coverage-v8`. Coverage reports committed to `04-logs/<level>/coverage/` after each POC.

---

## TDD Discipline

The degree follows red → green → regression discipline per the AI School doctrine:

1. **Red:** Write the failing test for the behavioral spec before writing any implementation.
2. **Green:** Write the minimum generator/block code to make the test pass.
3. **Regression commit:** Commit both test and implementation together. The commit message format: `feat(l2): GenerateText block passes async IIFE test [red->green]`.

**Mandatory for:**
- Every new block generator function.
- Every new execution sandbox code path.
- Every behavioral spec listed in `poc-selection.md`.

**Golden snapshots:** Created in the "green" step after the generator produces its first correct output. Snapshot is committed immediately so future changes are detectable.

---

## Cost-Aware Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Never run live model tests in CI by default:
    // Tests using .skipIf(!process.env.RUN_LIVE_MODEL_TESTS) handle this individually.
    
    // Timeout: 10s for unit tests; live model tests need higher timeout via test-level override
    testTimeout: 10_000,
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/components/**', 'test/**', '*.config.*'],
    },
    
    // Inline Blockly's UMD bundles for ESM compatibility:
    deps: {
      inline: ['blockly'],
    },
  },
});
```

**CI matrix:**
- Every push: unit tests + golden snapshots + integration tests (mock model). No live model tests.
- Pre-POC sign-off: `RUN_LIVE_MODEL_TESTS=1` run by the implementer. Results logged in `04-logs/<level>/`.
- Weekly (optional): `RUN_LIVE_MODEL_TESTS=1` run in scheduled CI for regression detection.

**Environment variables for tests:**
- `RUN_LIVE_MODEL_TESTS=1` — enables provider-contract tests.
- `ANTHROPIC_API_KEY` — required for Anthropic smoke tests.
- `OPENAI_API_KEY` — required for OpenAI smoke tests.
- Never commit these to the repo. Use `.env.local` (gitignored) or CI secrets.
