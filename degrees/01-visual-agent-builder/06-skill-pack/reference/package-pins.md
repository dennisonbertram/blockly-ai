# Reference: Package Pins

**Last verified:** 2026-05-17 (against npm registry)

---

## Canonical `package.json` Dependencies

```json
{
  "dependencies": {
    "ai":                "6.0.184",
    "@ai-sdk/anthropic": "3.0.78",
    "@ai-sdk/openai":    "3.0.64",
    "blockly":           "12.5.1",
    "next":              "15.3.2",
    "react":             "18.3.1",
    "react-dom":         "18.3.1",
    "zod":               "^3.25.76"
  },
  "devDependencies": {
    "vitest":            "...",
    "typescript":        "..."
  }
}
```

---

## Pin Table

| Package | Exact pin | Why exact | Known gotcha |
|---|---|---|---|
| `ai` | `6.0.184` | Breaking renames in every major; even patches can deprecate accessors | v7 canary renames `stepCountIs` → `isStepCount`; do not use |
| `@ai-sdk/anthropic` | `3.0.78` | Provider packages must match core `ai` version | — |
| `@ai-sdk/openai` | `3.0.64` | Provider packages must match core `ai` version | `3.0.75` does NOT exist on npm; `3.0.64` is the correct pin |
| `blockly` | `12.5.1` | Generator API compatibility; `FocusManager` behavior changes between minors | — |
| `next` | `15.3.2` | App Router behavior (`ssr: false` requires `'use client'` in 15.x) | `next/dynamic({ ssr: false })` must be called from a Client Component |
| `zod` | `^3.25.76` | AI SDK peer range is `^3.25.76 \|\| ^4.1.8`; pinning conflicts with peers | Use `^` intentionally |

---

## Verifying Pins

```bash
# Confirm ai latest stable
npm view ai dist-tags --json

# Confirm @ai-sdk/openai versions near 3.0.x
npm view @ai-sdk/openai versions --json | grep '"3\.0\.'

# Confirm what's installed
cat node_modules/ai/package.json | grep '"version"'
cat node_modules/@ai-sdk/openai/package.json | grep '"version"'
```

## Regression Test (RT-002 Pattern)

```ts
describe('RT-002: version-pin assertion', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))

  it('pins ai@6.0.184', () => {
    expect(pkg.dependencies['ai']).toBe('6.0.184')
  })
  it('pins @ai-sdk/anthropic@3.0.78', () => {
    expect(pkg.dependencies['@ai-sdk/anthropic']).toBe('3.0.78')
  })
  it('pins @ai-sdk/openai@3.0.64', () => {
    expect(pkg.dependencies['@ai-sdk/openai']).toBe('3.0.64')
  })
  it('pins blockly@12.5.1', () => {
    expect(pkg.dependencies['blockly']).toBe('12.5.1')
  })
})
```

When upgrading: update `package.json`, update these assertions, follow the [SDK Upgrade Checklist](../checklists/sdk-upgrade-checklist.md).

---

## Links

- [Recipe: Pinning AI SDK Exactly](../recipes/recipe-pinning-ai-sdk-exactly.md)
- [Checklist: SDK Upgrade](../checklists/sdk-upgrade-checklist.md)
- [Reference: v6 API Cheatsheet](v6-api-cheatsheet.md)
- [Back to Index](../index.md)
