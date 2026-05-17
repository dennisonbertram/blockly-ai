# Lesson 02 — Emit a v6-Correct GenerateText Call

**Prerequisite:** [Lesson 01 — Mount Blockly Safely](01-mount-blockly-safely.md)
**Source:** L2 (single-generate-text-block) implementation notes
**Risks retired:** R2 (async codegen), R1 (SDK drift via first snapshot), R6 (stale LLM API names)

---

## The Problem with Blockly's JS Generator

Blockly's `javascriptGenerator` is a singleton that emits synchronous ES5-style code. The Vercel AI SDK requires `await`. There is no official Blockly pattern for async code generation.

The obvious fix — subclass `JavascriptGenerator` and override `finish()` — fails on contact. `javascriptGenerator` is exported as a *singleton instance*, not a class. You would need to introspect the prototype chain to get the class, losing all type safety.

---

## The AsyncJavascriptGenerator Post-Processor

The solution is a post-processor function wrapping the singleton's output:

```ts
// lib/codegen/async-generator.ts
import { javascriptGenerator } from 'blockly/javascript'
import type { Workspace } from 'blockly/core'

const RUN_SIGNATURE =
  `export default async function run({ model: __model_provider, sink: __sink } = {}) {`

function buildImportHeader(body: string): string {
  const aiImports: string[] = ['generateText']
  if (body.includes('streamText('))   aiImports.push('streamText')
  if (body.includes('tool({'))        aiImports.push('tool')
  if (body.includes('Output.object('))aiImports.push('Output')
  if (body.includes('stepCountIs('))  aiImports.push('stepCountIs')
  if (body.includes('hasToolCall('))  aiImports.push('hasToolCall')

  const lines = [`import { ${aiImports.join(', ')} } from 'ai';`]
  if (body.includes('z.'))       lines.push(`import { z } from 'zod';`)
  if (body.includes('anthropic('))lines.push(`import { anthropic } from '@ai-sdk/anthropic';`)
  if (body.includes('openai('))  lines.push(`import { openai } from '@ai-sdk/openai';`)
  return lines.join('\n')
}

export function generateAsyncModule(workspace: Workspace): string {
  const body = javascriptGenerator.workspaceToCode(workspace)
  const header = buildImportHeader(body)
  const indented = body.split('\n').map(l => l.trim() === '' ? '' : '  ' + l).join('\n').trimEnd()
  return [header, '', RUN_SIGNATURE, indented, '}', ''].join('\n')
}
```

The import detection is a body-substring scan — simple but effective because the generated code never contains comments.

Source: `05-distillation/patterns/async-codegen-via-post-processor.md`

---

## Expression vs. Statement Generator Return Shapes

Blockly distinguishes two generator types:

**Expression blocks** (used as value inputs — e.g., Model, Prompt, GenerateText):
```ts
javascriptGenerator.forBlock['ai_generate_text'] = (block, generator): [string, number] => {
  const model = generator.valueToCode(block, 'MODEL', Order.NONE) || '...'
  const prompt = generator.valueToCode(block, 'PROMPT', Order.NONE) || "'No prompt provided'"
  const code = `(await generateText({ model: ${model}, prompt: ${prompt} })).text`
  return [code, Order.AWAIT]   // 2-tuple: code + precedence order
}
```

**Statement blocks** (stack connections — e.g., OutputSink, ToolReturn):
```ts
javascriptGenerator.forBlock['ai_output_sink'] = (block, generator): string => {
  const value = generator.valueToCode(block, 'VALUE', Order.NONE)
  return `__sink?.('output', ${value});\n`  // plain string with trailing newline
}
```

Returning a bare string from an expression generator strips precedence information. Blockly cannot decide whether to wrap the snippet in parentheses when it is embedded in a larger expression. The resulting precedence bugs are subtle and hard to spot.

Source: `05-distillation/gotchas/blockly-expression-generator-must-return-tuple.md`

---

## The GenerateText Block

The `ai_generate_text` block compiles to `(await generateText({...})).text`. Key points:

1. **Model block is an expression block** returning `[code, Order.FUNCTION_CALL]`. The `ai_model` block emits `(__model_provider ?? anthropic('claude-haiku-4-5'))` — the `__model_provider` fallback allows the executor to override the model at runtime for testing.

2. **Prompt block returns a string expression** — connected to the `prompt:` value input.

3. **When tools are connected without an explicit stopWhen**, the generator defaults to `stopWhen: stepCountIs(5)` — always bound, never `maxSteps`.

Emitted code example:

```ts
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export default async function run({ model: __model_provider, sink: __sink } = {}) {
  __sink?.('output', (await generateText({ model: (__model_provider ?? anthropic('claude-haiku-4-5')), prompt: 'Tell me a short joke' })).text);
}
```

Source: `03-pocs/L5-deploy-to-vercel/source/lib/blocks/generate-text.ts`

---

## MockLanguageModelV3 — First Contact

For unit tests, never call a real provider. Use `MockLanguageModelV3` from `ai/test`:

```ts
import { MockLanguageModelV3, mockValues } from 'ai/test'

const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues(
    {
      content: [{ type: 'text', text: 'Why did the chicken...' }],
      finishReason: { unified: 'stop' },   // OBJECT, not 'stop' string
      usage: {
        inputTokens:  { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 5,  text: undefined,    reasoning: undefined },
      },
    }
  ),
})
```

Three shape rules to remember (full detail in [Lesson 04](04-multi-step-and-streaming.md) and [recipe-mock-language-model-v3.md](../recipes/recipe-mock-language-model-v3.md)):
1. `finishReason` is an **object** `{ unified: 'stop' }`, not a string.
2. `usage` fields are **nested**: `inputTokens: { total: 10, ... }`.
3. `mockValues(...)` takes spread args, not an array.

---

## Your First Golden-Output Snapshot

The snapshot is the most important test in the suite. It locks the exact string that the code generator emits:

```ts
// test/regression.test.ts
import fixture from './fixtures/generate-text-joke.json'

it('generate-text-joke fixture snapshot locked', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(fixture, workspace)
  Blockly.Events.enable()
  expect(generate(workspace)).toMatchSnapshot()
})
```

Run `pnpm test` once to write the snapshot file. Commit it. From this point forward, any change to the emitted code will fail this test — exactly the moment to ask "is this change intentional?"

The snapshot catches: stale API names (`parameters:` instead of `inputSchema:`), accidental `generateObject` usage, structural regressions. See [lessons/00-tdd-discipline.md](00-tdd-discipline.md) for the full rationale.

---

## Exercise

1. Define the `ai_generate_text` block with JSON definition and register the generator.
2. Write a fixture workspace JSON containing one GenerateText block with prompt "Tell me a short joke".
3. Run the golden-output snapshot test.
4. Write an execution test using `MockLanguageModelV3` and verify `result.text === 'Mock answer'`.

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Previous Lesson: Mount Blockly Safely](01-mount-blockly-safely.md)
- [Next Lesson: Tools and Structured Output](03-tools-and-structured-output.md)
- [Recipe: Async Generator Post-Processor](../recipes/recipe-async-generator-postprocessor.md)
- [Recipe: MockLanguageModelV3](../recipes/recipe-mock-language-model-v3.md)
- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [Reference: Blockly Codegen Cheatsheet](../reference/blockly-codegen-cheatsheet.md)
