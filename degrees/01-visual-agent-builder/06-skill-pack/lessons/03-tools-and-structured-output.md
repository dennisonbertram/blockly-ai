# Lesson 03 — Tools and Structured Output

**Prerequisite:** [Lesson 02 — Emit GenerateText v6](02-emit-generate-text-v6.md)
**Source:** L3 (tool-and-object-blocks) implementation notes + surprises
**Risks retired:** R6 (inputSchema rename), R9 (.nullable for OpenAI strict mode)

---

## Tool Calling — the v6 API

The v6 `tool()` function uses `inputSchema`, not `parameters`. This is the single most common stale-name error in this degree:

```ts
// CORRECT (v6.0.184)
tool({
  description: 'Get the weather for a city.',
  inputSchema: z.object({ city: z.string() }),
  execute: async (input) => {
    return { temperature: 72, city: input.city }
  },
})

// WRONG (v3/v4 — do not emit this)
tool({
  description: 'Get the weather for a city.',
  parameters: z.object({ city: z.string() }),  // WRONG
  execute: async (input) => { ... },
})
```

The fail mode if you use `parameters:` is silent: the tool compiles, the model calls it, but `execute` receives `any` because the schema wasn't wired correctly.

Source: `05-distillation/gotchas/ai-sdk-v6-api-renames.md`

---

## The Tool Block Generator

The `ai_tool` block emits the entire `tool({...})` call as an expression:

```ts
// Emitted by the ai_tool block
tool({
  description: 'Get the weather',
  inputSchema: z.object({ city: z.string() }),
  execute: async (input) => {
    return await __tools.getWeather(input.city);
  }
})
```

The block generator (`03-pocs/L-capstone-research-agent/source/lib/blocks/tool.ts`) reads:
- `NAME` field: the key in the `tools: { ... }` map
- `DESCRIPTION` field: the description string (LLM reads this to decide when to call the tool)
- `INPUT_SCHEMA` value input: a `ZodObject` expression block
- `BODY` statement input: execute function body

A companion `ai_tool_return` block compiles to `return <value>;` inside the body.

---

## Zod Schema Blocks

Four Zod primitive blocks: `ZodString`, `ZodNumber`, `ZodBoolean`, `ZodArray`. They are all **expression blocks** returning `[code, Order.ATOMIC]`.

The `ZodField` block composes into a `ZodObject`:

```ts
// Emitted by a ZodObject block with two ZodField children
z.object({
  city: z.string(),
  temperature: z.number(),
})
```

The `ZodObject` block uses a mutator (dynamic slot addition) to add fields. The generator iterates connected statement inputs and joins the field expressions.

---

## Structured Output — `Output.object`, NOT `generateObject`

The v6 pattern for structured output:

```ts
// CORRECT (v6.0.184)
const result = await generateText({
  model,
  output: Output.object({ schema: z.object({ name: z.string(), age: z.number() }) }),
  prompt: 'Who was Ada Lovelace?',
})
const person = result.output   // NOT result.object

// WRONG — generateObject is deprecated in v6
const result = await generateObject({
  model,
  schema: z.object({ name: z.string() }),
  prompt: '...',
})
const person = result.object   // WRONG
```

Key facts:
1. `generateText` with `output: Output.object({ schema })` replaces `generateObject`.
2. The result accessor is `result.output`, not `result.object`. Using `.object` throws `NoOutputGeneratedError`.
3. The `Output` namespace is imported from `'ai'`, not from a subpath.

Source: `05-distillation/gotchas/generate-object-output-accessor.md`

---

## `.nullable()` vs `.optional()` — the OpenAI Strict Mode Trap

OpenAI's structured output strict mode does not allow optional fields in Zod schemas. If your schema contains `.optional()`, the call will throw `AI_NoObjectGeneratedError` when using an OpenAI model.

```ts
// AVOID with OpenAI structured output
z.object({ middleName: z.string().optional() })

// PREFER — works with both Anthropic and OpenAI
z.object({ middleName: z.string().nullable() })
```

The semantic difference:
- `.optional()` — key may be absent entirely from the output.
- `.nullable()` — key must be present, with value `null` if empty.

The `ZodField` block's "optional" checkbox emits `.nullable()`, not `.optional()`, by design. The L3 regression test `RT-007` permanently locks this.

**Why this matters for the visual builder:** The same visual program is shared between provider Model blocks. A schema that works with Anthropic breaks with OpenAI if it uses `.optional()`. Defaulting to `.nullable()` keeps programs portable across providers.

Source: `05-distillation/anti-patterns/optional-vs-nullable-zod-openai-strict.md`

---

## UseTools Block

The `ai_use_tools` block collects Tool block outputs and emits the `tools: { ... }` map:

```ts
// Emitted by UseTools with two Tool blocks
{
  getWeather: tool({ description: '...', inputSchema: z.object({ city: z.string() }), execute: ... }),
  getHumidity: tool({ description: '...', inputSchema: z.object({ city: z.string() }), execute: ... }),
}
```

When the `GenerateText` block has a `UseTools` block connected to its `tools:` input, the generator also adds `toolChoice: 'auto'` and a default `stopWhen: stepCountIs(5)` if no explicit stop condition is connected.

---

## MockLanguageModelV3 for Tool Calls

To test a tool-calling flow with mocks:

```ts
const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues(
    // Step 1 — model calls the tool
    {
      content: [{
        type: 'tool-call',
        toolName: 'getWeather',
        toolCallId: 'tc_1',
        input: JSON.stringify({ city: 'Tokyo' }),  // JSON STRING, not object
      }],
      finishReason: { unified: 'tool-calls' },
      usage: { inputTokens: { total: 20 }, outputTokens: { total: 5 } },
    },
    // Step 2 — model summarizes
    {
      content: [{ type: 'text', text: 'The weather in Tokyo is sunny.' }],
      finishReason: { unified: 'stop' },
      usage: { inputTokens: { total: 80 }, outputTokens: { total: 15 } },
    }
  ),
})
```

The `input` field on a tool-call must be a **JSON string**, not an object. Passing an object causes `{ invalid: true }` on the tool call and `execute` never runs.

---

## Forbidden Name Regression — Extended List for L3

Add to the forbidden-name grep after completing L3:

```ts
const forbiddenNames = [
  'parameters:',        // v4 tool() option name
  'generateObject(',    // deprecated in v6
  'toDataStreamResponse',  // renamed in v5
  'CoreMessage',        // renamed to ModelMessage
  '.object',            // use .output instead
]
```

---

## Exercise

1. Implement `ai_tool`, `ai_tool_return`, `ai_zod_object`, `ai_zod_field`, `ai_use_tools`, `ai_generate_object` blocks.
2. Create a fixture with a Tool block (name: "getWeather", inputSchema: `{ city: z.string() }`).
3. Run `workspaceToCode` and assert the emitted code contains `inputSchema:` (not `parameters:`).
4. Run `workspaceToCode` on a GenerateObject fixture and assert it contains `Output.object(` (not `generateObject(`).

See [labs/lab-02-add-a-new-tool.md](../labs/lab-02-add-a-new-tool.md) and [labs/lab-03-extend-the-schema.md](../labs/lab-03-extend-the-schema.md) for hands-on exercises.

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Previous Lesson: Emit GenerateText v6](02-emit-generate-text-v6.md)
- [Next Lesson: Multi-Step and Streaming](04-multi-step-and-streaming.md)
- [Recipe: Tools Injection Import Map](../recipes/recipe-tools-injection-import-map.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Troubleshooting: Tool Not Being Called](../troubleshooting/symptom-tool-not-being-called.md)
- [Reference: Block Catalog](../reference/block-catalog.md)
