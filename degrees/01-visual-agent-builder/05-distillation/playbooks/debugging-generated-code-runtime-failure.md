# Playbook: Debug a generated-code runtime failure

**Category:** playbook

## When to use

A workspace fixture passes codegen tests (snapshot is locked) but the **execute** test fails — or worse, the production route handler returns a confusing error. The bug is somewhere between "block emitted JS that looks correct" and "JS ran in the executor and threw".

## The three layers to check, in order

### Layer 1 — Look at the emitted source

The most common mistake is staring at the block code or the SDK. Look at *the string the generator produced*:

```ts
// In your test
const code = generate(workspace)
console.log(code)             // print it
expect(code).toContain('...')  // assert the shape you expect
```

Cross-check the emitted text against the v6 API ([renames gotcha](../gotchas/ai-sdk-v6-api-renames.md)). Common findings: `.object` instead of `.output`; `maxSteps:` snuck back in; `await streamText(` accidentally added; `parameters:` not `inputSchema:`.

### Layer 2 — Look at the mock setup

If the emitted source is correct, the next suspect is the `MockLanguageModelV3` shape. See [`gotchas/mock-language-model-v3-stream-shape.md`](../gotchas/mock-language-model-v3-stream-shape.md).

Specific things to check:

- `finishReason: 'stop'` (FLAT — bad) vs `finishReason: { unified: 'stop' }` (NESTED — good).
- `usage: { inputTokens: 10 }` (FLAT — bad) vs `usage: { inputTokens: { total: 10, ... } }` (NESTED — good).
- Tool-call `input` is a JSON **string**, not an object.
- Stream chunks use `delta:`, with matching `id:` on `text-start` / `text-delta` / `text-end`.
- `mockValues(step1, step2)` spread, not `mockValues([step1, step2])` array.

Run the runtime probe to verify expected values:

```bash
node -e "
const { MockLanguageModelV3 } = require('ai/test');
const m = new MockLanguageModelV3({});
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(m)));
"
```

### Layer 3 — Look at the sink wiring / injection

If the source is correct and the mock is correct, the bug is in how the executor invokes `run`.

- Is `__sink` reaching the place where output is consumed? In tests this is a `vi.fn()`; in production it's a `ReadableStream` controller.
- Is `__tools` injected when the program calls `await __tools.search(...)`? Capstone added `tools: __tools` to the `run` signature *after* L5 — make sure your handler is on the capstone signature if the program uses tools.
- Are the SDK functions in the right order in the comma-list arg string passed to `new Function`? Mis-ordered args = silent value swap. The L3+ test helper `buildRunnable` codifies the canonical order.

## Quick decision tree

```
test failed
├── on a snapshot diff?
│     └── Layer 1: emitted source changed. Diff it. v3/v4 name? Fix codegen. Intentional? Update snapshot.
├── with NoOutputGeneratedError / undefined output?
│     └── Layer 2: finishReason or usage shape — probably flat string instead of { unified }.
├── with "tool.execute never called" or "result.toolResults is empty"?
│     └── Layer 2: tool-call.input is probably an object, must be a JSON string.
├── with "stream yielded nothing"?
│     └── Layer 2: text-delta chunk used `text:` or `textDelta:` instead of `delta:`, or missing `id:` on text-start.
├── with "is not a function" on .toUIMessageStreamResponse / .object?
│     └── Layer 1: you emitted a v4 name. Fix codegen.
└── with the program running but producing wrong values?
      └── Layer 3: sink/__tools injection or argument-order mismatch.
```

## Example commands

```bash
# Print emitted code from a failing test
node -e "
const Blockly = require('blockly/core')
require('./src/blocks/...')        // register all custom blocks
const fixture = require('./test/fixtures/your-fixture.json')
const ws = new Blockly.Workspace()
Blockly.Events.disable(); Blockly.serialization.workspaces.load(fixture, ws); Blockly.Events.enable()
const { generate } = require('./src/codegen/generate')
console.log(generate(ws))
"

# Inspect the actual SDK exports your code is calling
node -e "console.log(Object.keys(require('ai')).sort().join('\n'))"

# Inspect a generated call's options at runtime
# (instrument buildRunnable to log mockModel.doGenerateCalls[0] before assertions)
```

## Evidence

- `04-logs/debug-log.md` lines 50-83 (L3 D1-D4): the canonical debug flow — probe Output export path, probe `LanguageModelV3GenerateResult` shape, trace `NoOutputGeneratedError` to `lastStep.finishReason === undefined`, probe `mockValues` source.
- `04-logs/error-log.md` lines 67-73 (L2 E "missing closing brace"): an example where the emitted source was wrong by one character; the test failure named the missing brace.
- `04-logs/error-log.md` lines 86-107 (L3 E1-E5): five distinct bugs across the three layers.
- `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 3-49: stream chunks (`delta:`/`id:`) and tool-call (`input: JSON.stringify(...)`) — both Layer 2 issues.

## Related

- [`gotchas/mock-language-model-v3-stream-shape.md`](../gotchas/mock-language-model-v3-stream-shape.md)
- [`gotchas/ai-sdk-v6-api-renames.md`](../gotchas/ai-sdk-v6-api-renames.md)
- [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md)
