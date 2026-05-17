# Surprises — L3 tool-and-object-blocks

## 1. GenerateTextResult accessor is `.output` not `.object`

The task spec said the `GenerateObject` block should emit `(await generateText({...})).object`.
The actual v6 SDK result object has `.output` (and `.experimental_output`) as the accessor, not `.object`.

Probe:
```
node -e "const { generateText } = require('ai'); ..."
// prototype keys: ... output, experimental_output
// (no .object key)
```

Fix: Updated `generate-object.ts` to emit `.output`. Documented.

## 2. LanguageModelV3 uses structured finishReason and nested usage

The testing-model.md research doc showed flat format:
```ts
finishReason: 'stop',
usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }
```

But `LanguageModelV3` (the actual spec) requires:
```ts
finishReason: { unified: 'stop' },  // structured object, not string
usage: {
  inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: undefined, reasoning: undefined },
}
```

The flat format does NOT throw for simple `generateText` calls (because `undefined.total` doesn't crash, and the step's finishReason becomes `undefined` which still allows text output). BUT it silently breaks:
- `Output.object({ schema })` — requires `lastStep.finishReason === 'stop'` for output parsing
- Tool calling — requires `result.finishReason.unified === 'tool-calls'` to detect tool steps

Fix: Updated execute tests to use the nested V3 format.

## 3. mockValues() takes spread args, not an array

The testing-model.md research showed: `doGenerate: mockValues([step1, step2])` (array arg).
The actual `mockValues` signature is: `mockValues<T>(...values: T[]): () => T` (spread args).

```ts
// Wrong (research doc pattern):
doGenerate: mockValues([step1, step2])
// Returns a function that returns [step1, step2] on first call (the array itself!)

// Correct:
doGenerate: mockValues(step1, step2)
// Returns a function that returns step1 on first call, step2 on second
```

Fix: Updated execute test to use spread form.

## 4. `new Function('a, b, c', body)` form works in happy-dom

The multi-argument form `new Function('a', 'b', 'c', body)` triggers "Unexpected token ','" in happy-dom's `Function` implementation (related to how it parses the arguments). The alternative two-argument form `new Function('a, b, c', body)` with a comma-separated string works correctly.

Fix: `buildRunnable()` uses the two-argument form with comma-separated param names as one string.

## 5. Output export path is correct: `import { Output } from 'ai'`

Probe verified: `const ai = require('ai'); console.log(Object.keys(ai).filter(k=>k.includes('Output')))` returns `['NoOutputGeneratedError', 'Output']`. The `Output` export is present at the package root, as the research said.
