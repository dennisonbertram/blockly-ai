# Gotcha: `new Function` in happy-dom rejects the multi-string-args form — use the two-arg comma-list form

**Category:** gotcha — Code execution in tests (happy-dom)

## Symptom

```
SyntaxError: Unexpected token ','
```

when calling

```ts
new Function('generateText', 'anthropic', 'openai', body)
```

inside a Vitest test running in `environment: 'happy-dom'`.

## Root cause

happy-dom's `Function` constructor does not implement the standard multi-string-args form correctly. Whether this is by spec ambiguity or happy-dom shim incompleteness, the symptom is: arg names must be in a *single* comma-separated string, not separate string arguments.

## Fix — use the two-argument form

```ts
// WRONG (works in Node, fails in happy-dom)
const fn = new Function('a', 'b', 'c', body)

// RIGHT — works everywhere
const fn = new Function('a, b, c', body)
```

This was applied in the `buildRunnable()` test helper that compiles the emitted module and injects the AI SDK + provider packages as lexical parameters. It became the standard form from L3 onward.

## Evidence

- `04-logs/error-log.md` lines 109-113 (E5): verbatim error and fix.
- `03-pocs/L3-tool-and-object-blocks/surprises.md` lines 57-61 (surprise 4): "the multi-argument form `new Function('a', 'b', 'c', body)` triggers 'Unexpected token ','' in happy-dom's `Function` implementation … The alternative two-argument form `new Function('a, b, c', body)` with a comma-separated string works correctly."
- `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 41-43: "The two-argument `new Function('a, b, c, ...', body)` form is used (comma-separated params as one string) to avoid happy-dom's multi-argument `Function` constructor issue."
- `03-pocs/L4-multi-step-agent-and-stream/implementation-notes.md` lines 73-76: pattern carried forward in L4's `buildRunnable`.

## Related

- [`anti-patterns/new-function-for-es-module-syntax.md`](../anti-patterns/new-function-for-es-module-syntax.md)
- [`patterns/asyncfunction-body-injection-vs-temp-file.md`](../patterns/asyncfunction-body-injection-vs-temp-file.md)
