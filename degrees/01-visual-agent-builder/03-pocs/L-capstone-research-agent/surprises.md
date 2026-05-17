# Surprises — L-capstone

## S-capstone-001: run() signature change broke L5 snapshots

When the `RUN_SIGNATURE` in `async-generator.ts` was extended to include `tools: __tools`,
all existing L5 snapshot tests failed with a mismatch. This was expected (the signature
is part of the generated output). Snapshots were updated with `vitest run -u`.

Impact: The capstone async-generator.ts is NOT backward-compatible with L5 snapshot files.
Mitigated: Updated snapshots committed. L5 project itself is unchanged (L5 has its own copy).

## S-capstone-002: Workspace execution order is top-to-bottom (GenerateObject first)

The Blockly workspace serialization places the `summary` OutputSink (GenerateObject) as the
first block and the `agent_result` OutputSink (Agent) as the second. The generated code
executes them in this order. This means the structured output is produced BEFORE the agent
research loop runs.

In the test mocks, the MockLanguageModelV3 responses must be ordered:
1. GenerateObject call → structured JSON
2. Agent step 1 → tool-call
3. Agent step 2 → tool-call or text

If the mock order is wrong, the GenerateObject call receives a tool-call response (which
can't be parsed as JSON) and fails with "No object generated".

## S-capstone-003: ai_prompt block emits string literals, not expressions

The `ai_prompt` block wraps text in single quotes, making it a string literal. It cannot
emit dynamic expressions like `agentResult + " - summarize this"`. This means the
GenerateObject prompt cannot reference the agent result output.

Workaround: The demo program uses a static prompt for GenerateObject. A future
`ConcatText` or `ExpressionRef` block would enable dynamic wiring.

## S-capstone-004: next@15.3.2 — no patched version bump needed

Checked for a patched 15.x release. next@15.3.2 is current at time of writing.
No bump documented because no newer 15.x stable was available.
