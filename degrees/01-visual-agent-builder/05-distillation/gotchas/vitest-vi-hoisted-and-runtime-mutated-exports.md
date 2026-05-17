# Gotcha: `vi.mock` is hoisted — use `vi.hoisted` for vars, and spread does NOT capture runtime-mutated keys

**Category:** gotcha — Vitest mocking with Blockly

## Why this is one entry

Both pieces bit on the same test file (`workspace-mount.test.tsx`) within minutes of each other. They share a root: Vitest's `vi.mock(...)` factory runs *before* anything in lexical order, and its return value is an artificial namespace object — neither a closure over your variables nor a true ESM namespace proxy.

## Symptom A — `ReferenceError: Cannot access 'mockInject' before initialization`

```ts
const mockInject = vi.fn()           // declared at module scope
vi.mock('blockly/core', () => ({ inject: mockInject }))   // factory uses it
//                                  ^ runs hoisted, before const initializes
```

## Fix A — `vi.hoisted`

```ts
const { mockInject } = vi.hoisted(() => ({ mockInject: vi.fn() }))
vi.mock('blockly/core', () => ({ inject: mockInject }))
```

`vi.hoisted` runs as part of the hoisted block, so its bindings are available to the factory.

## Symptom B — `[vitest] No "Blocks" export is defined on the "blockly/core" mock.`

```ts
vi.mock('blockly/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('blockly/core')>()
  return { ...actual }                 // looks complete; isn't
})
// Later: Blockly.Blocks['greet'] = ... → fails
```

## Root cause B

`Blockly.Blocks` is not a static named export — it is a *registry property mutated at runtime* by `Blockly.common.defineBlocks` and by side-effectful `import '../src/blocks/...'` statements. The ESM module-namespace object the mock receives via `importOriginal()` enumerates only the static export names; runtime-mutated keys are not in `Object.keys(actual)` and `{ ...actual }` does not capture them.

## Fix B — name the runtime-mutated keys explicitly

```ts
return {
  ...actual,
  Blocks:    actual.Blocks,
  setLocale: vi.fn(),         // dynamic import inside useEffect needs it on the mock
}
```

The L5 e2e test repeated this lesson for `setLocale` — without explicit inclusion the dynamic `import('blockly/core')` inside `useEffect` fails to find it.

## Evidence

- `04-logs/error-log.md` lines 37-41: symptom A verbatim.
- `04-logs/error-log.md` lines 76-81: symptom B verbatim.
- `04-logs/debug-log.md` lines 32-47: investigation for both.
- `03-pocs/L1-blockly-hello/implementation-notes.md` lines 21-36: both fixes.
- `03-pocs/L1-blockly-hello/surprises.md` lines 19-36 (surprises 2 & 3): same.
- `03-pocs/L5-deploy-to-vercel/surprises.md` lines 46-56 (S4): the `setLocale` repeat at L5: "the mock must explicitly include `setLocale: vi.fn()` even if it spreads `...actual` — the dynamic import path inside the component hits the module mock and does not find `setLocale` if not explicitly mocked."

## Related

- [`gotchas/happy-dom-blockly-incompatibility.md`](happy-dom-blockly-incompatibility.md)
