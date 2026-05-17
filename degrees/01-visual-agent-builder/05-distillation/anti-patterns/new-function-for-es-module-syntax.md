# Anti-pattern: `new Function(source)` to execute ES module syntax

**Category:** anti-pattern — code execution

## Why it's tempting

You have a generated `.mjs`-style string that starts with `import { generateText } from 'ai'` and `export default async function run({ ... })`. You want to evaluate it in a test. `new Function(source)` looks like the smallest possible sandbox.

## Why it fails

`new Function(body)` evaluates its argument as a *function body*, not as an ES module. The function-body grammar **does not allow** `import` or `export` statements:

```
SyntaxError: import' and 'export' may only appear at the top level
```

Even if you replace `import` with `require`, you're now constructing a CJS environment, and `require` is not in scope unless you inject it. And injecting `require` is exactly the security hole the [server-side execution pattern](../patterns/server-side-execution-via-import-map.md) exists to prevent — `require` gives the program filesystem/network access.

## What to do instead

Strip the `import` and `export default` lines first, then inject what they would have imported as **positional parameters**:

```ts
const body = emittedSource
  .split('\n')
  .filter(line => !line.startsWith('import '))
  .map(line  => line.replace(/^export default /, ''))
  .join('\n') + '\nreturn run({ model: __mockModel, sink: __sink, tools: __tools });'

const fn = new Function(
  'generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, __mockModel, __sink, __tools',  // arg-list as one comma-separated string (happy-dom)
  body
)
const result = await fn(generateText, streamText, tool, Output, z, stepCountIs, hasToolCall, anthropic, openai, mockModel, sink, tools)
```

Now the generated `run` function closes over the injected modules and has no access to anything else. This is the *same* approach the L5 production route handler uses — strip the module syntax, inject the import map, run.

## Evidence

- The strategy is documented at `04-logs/decision-log.md` lines 56-63 (L2 decision "Compile-execute strategy"): "The `new Function` approach strips ES import/export syntax and injects the real (or mock) modules as parameters — the same code runs, just in a different execution context."
- `03-pocs/L2-single-generate-text-block/implementation-notes.md` lines 17-29: the recipe in detail.
- `02-planning/risk-register.md` lines 60-74 (R4 "Sandbox Security") explicitly forbids injecting `require`: "Generated code cannot access `require`, `process`, `fs`, or any other Node global."

## Related

- [`patterns/asyncfunction-body-injection-vs-temp-file.md`](../patterns/asyncfunction-body-injection-vs-temp-file.md)
- [`anti-patterns/function-over-asyncfunction.md`](function-over-asyncfunction.md)
- [`gotchas/new-function-two-arg-string-in-happy-dom.md`](../gotchas/new-function-two-arg-string-in-happy-dom.md)
