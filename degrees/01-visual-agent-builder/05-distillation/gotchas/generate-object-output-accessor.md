# Gotcha: With `Output.object({...})`, the result accessor is `.output` — NOT `.object`

**Category:** gotcha — Vercel AI SDK v6 structured output

## Symptom

Code that the task spec / planner / blog post said to emit:

```ts
const x = (await generateText({ model, output: Output.object({ schema }), prompt })).object;
```

throws `NoOutputGeneratedError` (when the prerequisite `finishReason` is correct), or yields `undefined`.

## Root cause

The v6 `generateText` result with `output: Output.object({ schema })` exposes the parsed value on `.output` (and on the experimental alias `.experimental_output`). There is no `.object` property — that name belonged to the now-deprecated `generateObject` function which had its own dedicated `.object` accessor.

Probe transcript:
```
node -e "const { generateText } = require('ai'); ..."
// prototype keys: ... output, experimental_output
// (no .object key)
```

## Fix — what the emitter should emit

```ts
const { output: typedObject } = await generateText({
  model,
  output: Output.object({ schema: z.object({ name: z.string() }) }),
  prompt,
});
// Or, the L3 form:
const x = (await generateText({...})).output;
```

The L3 regression test pins this with `RT-003: Output.object( in generate-object emitted code` and a forbidden-name guard against `generateObject(`.

## Evidence

- `03-pocs/L3-tool-and-object-blocks/surprises.md` lines 3-15 (surprise 1): "GenerateTextResult accessor is `.output` not `.object`. … The actual v6 SDK result object has `.output` (and `.experimental_output`) as the accessor, not `.object`."
- `04-logs/error-log.md` lines 86-89 (E1): "Task spec said emit `(await generateText({...})).object`. Actual v6 SDK has `.output`."
- `04-logs/expectation-gap-log.md` lines 67-71 (G1): expectation vs reality with the same gap.
- `04-logs/debug-log.md` lines 53-72: D1 + D3 — the runtime probes that found the bug.
- `01-research/vercel-ai-sdk/version-and-current-api.md` line 57: the migration row "`generateObject(...)` → `generateText({ output: Output.object({ schema }) })`. `generateObject` is deprecated in v6 but still works; avoid for new code."

## Related

- [`gotchas/ai-sdk-v6-api-renames.md`](ai-sdk-v6-api-renames.md)
- [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md)
