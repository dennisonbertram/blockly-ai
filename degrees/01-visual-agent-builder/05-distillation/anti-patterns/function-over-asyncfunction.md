# Anti-pattern: Using `Function` instead of `AsyncFunction` for async bodies

**Category:** anti-pattern — code execution

## Why it's tempting

`new Function(body)` is the standard. You strip `import`/`export`, inject your modules, and call. You forget that the emitted code contains `await generateText({...})` at the top level of its body.

## Why it fails

`new Function` produces a regular (non-async) function. `await` at the top level of a non-async function is a `SyntaxError`:

```
SyntaxError: await is only valid in async functions and the top level bodies of modules
```

You can wrap the body in `(async () => { ... })()` and not return the promise, but then your test can't `await` the result.

## What to do instead — two options

### Option A — `new AsyncFunction(...)` directly

```ts
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const fn = new AsyncFunction('argNames', body)
const result = await fn(generateText, /* ... */)
```

### Option B — emit a `run` function and have the body return its invocation

This is what this degree uses. The emitted module declares:

```ts
export default async function run({ model, sink, tools } = {}) {
  // ... body ...
}
```

After stripping imports and `export default`, the test appends `return run({ model, sink, tools })`. The outer `new Function` itself is *not* async — but its body returns a `Promise` from invoking the inner async `run`. The test awaits that promise.

This sidesteps `AsyncFunction` entirely and keeps the emitted module shape unchanged between test and production. See [`patterns/asyncfunction-body-injection-vs-temp-file.md`](../patterns/asyncfunction-body-injection-vs-temp-file.md).

## Evidence

- `03-pocs/L2-single-generate-text-block/implementation-notes.md` lines 17-29: "Strip `import` statement lines from the emitted source. Strip `export default` from the `run` function declaration. Wrap in a `Function('generateText', 'anthropic', 'openai', body)` factory. Call the factory with the actual (or mock) module values." The body uses `return run({...})` so the outer Function need not be async.
- `04-logs/decision-log.md` lines 65-72 (L2 decision "Module vs. injected mode"): "Always emit module mode (with ES `import`/`export`). Tests use an injection adapter, not a separate 'injected mode' generator."
- `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 37-43: same pattern with the extended argument list.

## Related

- [`anti-patterns/new-function-for-es-module-syntax.md`](new-function-for-es-module-syntax.md)
- [`patterns/asyncfunction-body-injection-vs-temp-file.md`](../patterns/asyncfunction-body-injection-vs-temp-file.md)
