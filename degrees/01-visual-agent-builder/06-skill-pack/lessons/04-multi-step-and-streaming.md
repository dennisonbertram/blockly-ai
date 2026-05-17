# Lesson 04 — Multi-Step Agents and Streaming

**Prerequisite:** [Lesson 03 — Tools and Structured Output](03-tools-and-structured-output.md)
**Source:** L4 (multi-step-agent-and-stream) implementation notes + surprises
**Risks retired:** R5 (cost runaway), R6 (maxSteps rename), streaming chunk shape

---

## Stop Conditions — Never Use `maxSteps`

`maxSteps` was removed in v5. The v6 form is `stopWhen: stepCountIs(N)`:

```ts
// CORRECT (v6.0.184)
import { generateText, stepCountIs } from 'ai'

const result = await generateText({
  model,
  tools,
  prompt: 'Research transformers and summarize.',
  stopWhen: stepCountIs(5),  // stops after at most 5 steps
})

// WRONG — maxSteps was removed in v5
const result = await generateText({
  model,
  tools,
  prompt: '...',
  maxSteps: 5,  // TypeScript error or silently stops after 1 step
})
```

The Agent block always emits `stopWhen: stepCountIs(N)`. When no `StopCondition` block is connected, the default is `stepCountIs(5)`.

The L4 regression test `RT-L4-003` permanently locks this — every Agent-using fixture must contain `stepCountIs(` in the emitted code.

Source: `05-distillation/anti-patterns/maxsteps-as-loop-bound.md`

---

## Stop Condition Variants

```ts
import { stepCountIs, isLoopFinished, hasToolCall } from 'ai'

// Stop after N steps (most common for bounded agents)
stopWhen: stepCountIs(5)

// Natural termination only — DANGEROUS without a backup bound
stopWhen: isLoopFinished()

// Stop when the model emits the named tool call
stopWhen: hasToolCall('finalAnswer')

// Multiple conditions (whichever fires first)
stopWhen: [stepCountIs(10), hasToolCall('done')]
```

**`hasToolCall` semantics:** When using `hasToolCall('name')`, the tool **executes** but the model is **not called again** to process its result. `result.text` will be empty; the answer lives in `result.toolResults`. This surprises newcomers who expect the model to summarize the tool's output.

Source: `05-distillation/gotchas/hastoolcall-stop-semantics.md`

---

## `streamText` is NOT Awaited

This is the most common streaming mistake:

```ts
// CORRECT — streamText returns synchronously with async iterables
const result = streamText({ model, prompt })
for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}

// WRONG — awaiting streamText consumes the stream before you can iterate it
const result = await streamText({ model, prompt })  // WRONG
```

`streamText` is designed to return synchronously so you can immediately start consuming the async iterable. `generateText` is the opposite — it must be awaited.

The L4 regression test `RT-L4-008` greps the emitted code for `await streamText(` and fails if found.

Source: `05-distillation/gotchas/streamtext-not-awaited.md`

---

## The StreamText Block

The `ai_stream_text` block emits:

```ts
// Statement block usage:
const _stream = streamText({ model: (__model_provider ?? anthropic('claude-haiku-4-5')), prompt: '...' });
for await (const _chunk of _stream.textStream) {
  __sink?.('stream', _chunk);
}
```

The `StreamSink` block wraps a `StreamText` block in this loop. The `for await` is emitted by the StreamSink, not by StreamText itself.

---

## The Agent Block

The `ai_agent` block is a wrapper around `generateText` with tools and a stop condition:

```ts
// Emitted by Agent block
(await generateText({
  model: (__model_provider ?? anthropic('claude-haiku-4-5')),
  prompt: 'Research and summarize the topic.',
  tools: {
    search: tool({ description: '...', inputSchema: z.object({ query: z.string() }), execute: async (input) => { return await __tools.search(input.query) } }),
  },
  toolChoice: 'auto',
  stopWhen: stepCountIs(5),
})).text
```

The Agent block is an **expression block** returning `[code, Order.AWAIT]`.

Source: `03-pocs/L5-deploy-to-vercel/source/lib/blocks/agent.ts`

---

## `result.totalUsage` vs `result.usage`

For multi-step agents, always log `result.totalUsage`:

```ts
// WRONG — only counts tokens from the last step
const cost = result.usage.inputTokens + result.usage.outputTokens

// CORRECT — sums all steps
const cost = result.totalUsage.inputTokens + result.totalUsage.outputTokens
console.log('Total tokens:', result.totalUsage.inputTokens, 'in,', result.totalUsage.outputTokens, 'out')
```

Each step in an agent loop re-sends the full conversation history as input. Input token cost compounds with step count — the reason `stopWhen: stepCountIs(5)` is the default.

Source: `05-distillation/gotchas/total-usage-vs-usage.md`

---

## MockLanguageModelV3 Stream Shapes — All Four Rules

```ts
// Rule 1: finishReason is an OBJECT
finishReason: { unified: 'stop' }       // correct
finishReason: 'stop'                     // WRONG — breaks Output.object parsing

// Rule 2: usage is NESTED
usage: {
  inputTokens:  { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5,  text: undefined,    reasoning: undefined },
}
// NOT: usage: { inputTokens: 10 }  — WRONG

// Rule 3: text-delta uses delta:, with matching id:
{ type: 'text-start', id: 'text-1' }
{ type: 'text-delta', id: 'text-1', delta: 'Hello' }  // delta:, not text: or textDelta:
{ type: 'text-end',   id: 'text-1' }
// NOT: { type: 'text-delta', text: 'Hello' }  — WRONG

// Rule 4: tool-call input is a JSON STRING
{ type: 'tool-call', toolName: 'weather', toolCallId: 'tc_1',
  input: JSON.stringify({ city: 'Tokyo' }) }
// NOT: input: { city: 'Tokyo' }  — WRONG

// Bonus: mockValues takes spread, not array
doGenerate: mockValues(step1, step2)     // correct
doGenerate: mockValues([step1, step2])   // WRONG — returns the array as first call
```

Source: `05-distillation/gotchas/mock-language-model-v3-stream-shape.md`

---

## Forbidden Name Regression — Extended List for L4

```ts
const forbiddenNames = [
  'parameters:',
  'generateObject(',
  'toDataStreamResponse',
  'CoreMessage',
  'experimental_streamText',
  'experimental_output',
  'maxSteps:',
  'maxSteps',           // also catch bare maxSteps reference
]
```

---

## For-Each and Branch Blocks

The `ai_loop` (ForEach) and `ai_branch` (Branch) blocks emit standard control flow:

```ts
// ForEach block
for (const _item of arrayExpr) {
  // body statements
}

// Branch block
if (conditionExpr) {
  // if-branch
} else {
  // else-branch
}
```

Both are statement blocks returning strings.

---

## Exercise

1. Implement the `ai_agent` block with `stopWhen: stepCountIs(N)` default.
2. Write a multi-step mock test: step 1 returns a tool call, step 2 returns text. Assert `result.steps.length === 2`.
3. Implement `ai_stream_text` and a `StreamSink` block. Write a streaming test asserting chunk order.
4. Add `maxSteps` to your forbidden-name list and verify the grep test catches it.

See [labs/lab-02-add-a-new-tool.md](../labs/lab-02-add-a-new-tool.md) for a guided wiring exercise.

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Previous Lesson: Tools and Structured Output](03-tools-and-structured-output.md)
- [Next Lesson: Deploy to Vercel](05-deploy-to-vercel.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Recipe: Forbidden Name Grep Test](../recipes/recipe-forbidden-name-grep-test.md)
- [Troubleshooting: streamText Not Iterable](../troubleshooting/symptom-streamtext-not-iterable.md)
- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
