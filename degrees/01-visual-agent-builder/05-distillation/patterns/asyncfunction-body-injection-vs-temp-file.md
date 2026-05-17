# Pattern: Test-execute generated code via `new Function` body injection (with trade-offs)

**Category:** pattern — codegen verification under Vitest

## Problem it solves

You have a generated ES module string. You want a Vitest test to run it and assert behavior. The textbook approach — `import('file:///tmp/test-xxx.mjs')` — *does not work in Vitest* because Vite refuses to load files outside the project root (verified, file existed on disk, Vite still returned "Does the file exist?").

You also want the test to run the *same* code the production handler will run, not a stripped-down rewrite.

## The pattern — two options

### Option A — `new Function` injection (used L2–L4 and L5 test layer)

1. Take the emitted ES module source.
2. Strip `import` and `export default` declarations.
3. Wrap with `new Function('argNames, ...', body)`.
4. Call with the actual modules (or mocks) as positional args.

```ts
// test/execute.test.ts
function buildRunnable(emittedSource: string) {
  const body = emittedSource
    .split('\n')
    .filter(line => !line.startsWith('import '))
    .map(line => line.replace(/^export default /, ''))
    .join('\n') +
    '\nreturn run({ model: __mockModel, sink: __sink, tools: __tools });'
  // happy-dom requires the two-arg comma-list form:
  return new Function('generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __mockModel, __sink, __tools', body)
}
```

Trade-off: tests do **not** run literally the same module shape as production (the production handler runs `runEmitted` which goes through the *same* `new Function` strip → inject path — so production and tests share this adapter at L5). Tests do not verify the `import` statements; the regression `RT-L4-005` exists for that purpose.

### Option B — Same approach in the production route handler

L5 codified it: `lib/execute/run-emitted.ts` performs the identical strip+inject step server-side. Tests and production share the adapter, so the divergence "tests run a different shape than production" is gone.

## Why temp-file dynamic import lost

`Vitest/Vite refuses to load files outside the project root via file:// URL, even though the file exists on disk` — the task's planning doc promised "Vitest supports this fine"; reality disagreed. This was an expectation-gap that ate L2 time and was documented for downstream POCs.

## Evidence

- `04-logs/error-log.md` lines 59-65: temp-file approach failure mode, verbatim error `Failed to load url /tmp/blockly-l2-test-xxx.mjs`.
- `04-logs/expectation-gap-log.md` lines 47-54: "Expected: Task description said 'Vitest supports [temp-file + dynamic import] fine.' Actual: Vitest/Vite refuses to load files outside the project root via `file://` URL."
- `04-logs/decision-log.md` lines 56-63 (L2 decision "Compile-execute strategy"): full rationale and trade-offs.
- `03-pocs/L2-single-generate-text-block/implementation-notes.md` lines 17-29: the strip-and-inject recipe.
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 26-39 (`run-emitted.ts` description): production handler reuses the same approach so test and prod execution paths converge.
- `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 37-43: `buildRunnable` extended for L3 modules.

## Related

- [`gotchas/new-function-two-arg-string-in-happy-dom.md`](../gotchas/new-function-two-arg-string-in-happy-dom.md)
- [`anti-patterns/new-function-for-es-module-syntax.md`](../anti-patterns/new-function-for-es-module-syntax.md)
- [`patterns/server-side-execution-via-import-map.md`](server-side-execution-via-import-map.md)
