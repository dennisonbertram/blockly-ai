# Reference: Block Catalog

All custom blocks built in this degree's POC ladder, organized by category.

---

## Core AI Blocks

### `ai_model` (Expression)

Emits the model factory call with `__model_provider` override support.

**Emits:**
```ts
(__model_provider ?? anthropic('claude-haiku-4-5'))
// or
(__model_provider ?? openai('gpt-4o-mini'))
```

**Fields:** `PROVIDER` (dropdown: `anthropic` | `openai`), `NAME` (text input)

**Introduced:** L2

---

### `ai_generate_text` (Statement)

Calls `generateText` and pipes result to `__sink`.

**Emits:**
```ts
__sink?.('output', (await generateText({
  model: (__model_provider ?? anthropic('claude-haiku-4-5')),
  prompt: 'Hello',
  tools: __tools,
  stopWhen: stepCountIs(5),   // only when UseTools block is connected
})).text);
```

**Connections:** MODEL input (value), PROMPT input (value), optional TOOLS input (statement)

**Introduced:** L2

---

### `ai_stream_text` (Statement)

Calls `streamText` (NOT awaited) and iterates `.textStream`.

**Emits:**
```ts
const __stream = streamText({
  model: (__model_provider ?? anthropic('claude-haiku-4-5')),
  prompt: 'Stream this',
});
for await (const __chunk of __stream.textStream) {
  __sink?.('chunk', __chunk);
}
```

**Connections:** MODEL input (value), PROMPT input (value)

**Introduced:** L4

---

### `ai_agent` (Statement)

Calls `generateText` with tools and `stopWhen: stepCountIs(5)` default.

**Emits:**
```ts
const __agentResult = await generateText({
  model: (__model_provider ?? anthropic('claude-haiku-4-5')),
  tools: __tools,
  stopWhen: stepCountIs(5),
  prompt: 'Research this topic',
});
__sink?.('output', __agentResult.text);
```

**Connections:** MODEL input (value), PROMPT input (value), STOP_WHEN input (value)

**Introduced:** L4

---

## Tool Blocks

### `ai_tool` (Expression)

Emits a complete `tool({ description, inputSchema, execute })` call.

**Emits:**
```ts
tool({
  description: 'Search the web',
  inputSchema: z.object({ query: z.string() }),
  execute: async (input) => {
    return await __tools.search(input.query);
  },
})
```

**Connections:** SCHEMA input (value), BODY statement connection

**Introduced:** L3 (inputSchema) / Capstone (with `__tools`)

---

### `ai_tool_call` (Statement)

Emits `await __tools.<name>(<arg>)` inside a tool's execute body.

**Emits:**
```ts
return await __tools.search(input.query);
```

**Fields:** `NAME` (the tool function name), `ARG` (the argument expression)

**Introduced:** Capstone

---

### `ai_tool_return` (Statement)

Wraps a value in `return`. Used inside tool execute bodies.

**Emits:**
```ts
return <value>;
```

**Introduced:** L3

---

### `ai_use_tools` (Statement / Container)

Container block that holds one or more `ai_tool` expression blocks and passes them to the connected GenerateText or Agent block.

**Introduced:** L3

---

## Structured Output Blocks

### `ai_generate_object` (Statement)

Calls `generateText` with `Output.object({ schema })`. Accesses `.output` (not `.object`).

**Emits:**
```ts
__sink?.('output', (await generateText({
  model: (__model_provider ?? anthropic('claude-haiku-4-5')),
  output: Output.object({ schema: z.object({ title: z.string() }) }),
  prompt: 'Generate a summary',
})).output);
```

**Introduced:** L3

---

## Zod Schema Blocks

### `ai_zod_object` (Expression)

Emits `z.object({ ...fields })`. Fields come from connected `ai_zod_field` blocks.

**Emits:**
```ts
z.object({
  title: z.string(),
  score: z.number(),
})
```

**Introduced:** L3

---

### `ai_zod_field` (Statement, used inside ZodObject)

Emits a single field definition. Supports string, number, boolean, array types plus a nullable checkbox.

**Emits (with nullable checked):**
```ts
fieldName: z.string().nullable(),
```

**Fields:** `NAME` (text), `TYPE` (dropdown), `IS_OPTIONAL` (checkbox)

**Introduced:** L3

---

### `ai_zod_array` (Expression)

Emits `z.array(<innerType>)`. Inner type connected as a value input.

**Emits:**
```ts
z.array(z.string())
```

**Introduced:** L3

---

## Stop Condition Blocks

### `ai_stop_count_is` (Expression)

Emits `stepCountIs(N)`.

**Fields:** `COUNT` (number)

**Introduced:** L4

---

### `ai_stop_has_tool_call` (Expression)

Emits `hasToolCall('toolName')`. Causes the loop to stop when the named tool is called; tool runs but model is NOT called again.

**Fields:** `NAME` (text)

**Introduced:** L4

---

## Total Block Count: 15

---

## Links

- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Reference: Blockly Codegen Cheatsheet](blockly-codegen-cheatsheet.md)
- [Reference: Run Signature](run-signature.md)
- [Back to Index](../index.md)
