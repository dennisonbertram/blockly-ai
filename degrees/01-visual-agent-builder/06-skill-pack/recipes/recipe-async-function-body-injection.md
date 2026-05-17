# Recipe: Async Function Body Injection (`new Function`)

**Use when:** Executing an emitted ES module string in tests (Vitest) or in the production route handler, without writing to a temp file.

---

## Why Not a Temp File?

Vitest/Vite refuses to load files outside the project root via `file://` URL. Even if the file exists on disk, Vite returns "Does the file exist?" and aborts. Dynamic `import()` of temp files does not work under Vitest.

The solution: strip the import/export syntax and inject the modules as positional `Function` arguments.

---

## The `buildRunnable` Helper (Tests)

```ts
// test/execute.test.ts
import { generateText, streamText, tool, Output, stepCountIs, hasToolCall } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai }    from '@ai-sdk/openai'
import { z } from 'zod'

function buildRunnable(emittedSource: string) {
  const body = emittedSource
    .split('\n')
    .filter(line => !line.startsWith('import '))
    .map(line => line.replace(/^export default /, ''))
    .join('\n')
    + '\nreturn run({ model: __mockModel, sink: __sink, tools: __tools });'

  // Two-arg comma-list form — required for happy-dom compatibility
  return new Function(
    'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __mockModel, __sink, __tools',
    body
  )
}
```

## Usage in Tests

```ts
import { MockLanguageModelV3, mockValues } from 'ai/test'
import { generateAsyncModule } from '../src/codegen/async-generator'

it('generates and executes', async () => {
  const mockModel = new MockLanguageModelV3({
    doGenerate: mockValues({
      content: [{ type: 'text', text: 'Hello' }],
      finishReason: { unified: 'stop' },
      usage: { inputTokens: { total: 20 }, outputTokens: { total: 5 } },
    }),
  })

  const code = generateAsyncModule(workspace)
  const sink = vi.fn()

  await buildRunnable(code)(
    generateText, streamText, tool, Output, z, stepCountIs, hasToolCall,
    anthropic, openai,
    mockModel, sink, {}   // __tools empty for non-agent programs
  )

  expect(sink).toHaveBeenCalledWith('output', 'Hello')
})
```

## Critical: Two-Arg String Form for happy-dom

Vitest uses happy-dom as its DOM implementation. happy-dom has a known incompatibility with `new Function(['arg1', 'arg2'], body)` (array form). Always use the comma-separated string form:

```ts
// WRONG — array form breaks in happy-dom
new Function(['arg1', 'arg2', 'arg3'], body)

// CORRECT — comma-list string
new Function('arg1, arg2, arg3', body)
```

## What Gets Stripped

The emitted module looks like:

```ts
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  // ... body ...
}
```

After stripping:
- All lines starting with `import ` are removed (modules are injected as args).
- `export default ` prefix is removed from the function declaration.
- `return run({...})` is appended to invoke the function with the injected args.

## In Production (`runEmitted`)

The production route handler performs the same strip+inject but uses the real SDK modules instead of mocks. Tests and production share the same execution path — the only difference is which model factory is passed in.

---

## Links

- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Recipe: Async Generator Post-Processor](recipe-async-generator-postprocessor.md)
- [Recipe: Server-Side Execution Route Handler](recipe-server-side-execution-route-handler.md)
- [Troubleshooting: Generated Code Throws TypeError](../troubleshooting/symptom-generated-code-throws-typeerror.md)
- [Back to Index](../index.md)
