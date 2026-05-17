# Pattern: Exact version pins (no `^`) on every AI SDK package + a regression test that re-reads them

**Category:** pattern — supply-chain hygiene

## Problem it solves

The AI SDK ships frequent breaking renames (see [the v6 renames gotcha](../gotchas/ai-sdk-v6-api-renames.md)). A `package.json` of `"ai": "^6.0.184"` legitimizes `npm update` quietly upgrading into a release that renames `stepCountIs` to `isStepCount` — already pending in v7 canary — and every committed snapshot becomes wrong overnight. Even within v6, patch releases can deprecate accessors.

## The pattern

### Step 1 — Pin exactly, no caret

```json
{
  "dependencies": {
    "ai": "6.0.184",
    "@ai-sdk/anthropic": "3.0.78",
    "@ai-sdk/openai":    "3.0.64",
    "blockly":           "12.5.1",
    "zod":               "^3.25.76"
  }
}
```

(`zod` keeps `^` because the v6 SDK's peer-dependency range is `^3.25.76 || ^4.1.8` — pinning would conflict with other peers.)

### Step 2 — Codify the pin with a test that re-reads `package.json`

```ts
// test/regression.test.ts
describe('RT-002: version-pin assertion', () => {
  it('package.json pins ai@6.0.184', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { dependencies: Record<string,string> }
    expect(pkg.dependencies['ai']).toBe('6.0.184')
  })
  it('package.json pins blockly@12.5.1', () => {
    /* ... */
  })
})
```

A test, not a comment, because comments are read only after the bug.

### Step 3 — When upgrading, do it deliberately

The forbidden-name grep + snapshot tests will flag any v6-API-surface regression. The version-pin test forces a human to update the test file when bumping the pin — exactly the moment to ask "why am I upgrading?"

## Why this is one pattern, not three

Each piece alone is insufficient. Exact pins without tests can be silently relaxed by a tool. Tests without exact pins still allow drift. Snapshots without either catch the symptom but not the cause.

## Evidence

- `02-planning/risk-register.md` lines 16-23 (R1 mitigations 1, 3, 4): "Pin all AI SDK packages to exact versions in `package.json` (not `^`). Unpin only with explicit decision." Plus the manual pins-table in `02-planning/degree-plan.md`. Plus the CI `npm outdated` gate.
- `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 97-115 (RT-002): the canonical test for L3.
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 100-114 (RT-L4-002): same shape, carried forward.
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 90-99 (version pins table): the exact pins used in production.
- `03-pocs/L2-single-generate-text-block/implementation-notes.md` lines 55-57: explicit reminder — "The research file `version-and-current-api.md` specifies `@ai-sdk/openai@3.0.75`. The actual latest published version (2026-05-17) is `3.0.64`."

## Related

- [`gotchas/ai-sdk-openai-version-3075-does-not-exist.md`](../gotchas/ai-sdk-openai-version-3075-does-not-exist.md) — the failure mode this pattern exists to prevent.
- [`anti-patterns/implicit-caret-on-ai-sdk.md`](../anti-patterns/implicit-caret-on-ai-sdk.md)
- [`playbooks/upgrading-the-ai-sdk-pin.md`](../playbooks/upgrading-the-ai-sdk-pin.md)
