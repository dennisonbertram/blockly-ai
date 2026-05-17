# Recipe: Pinning the AI SDK Exactly (No Caret)

**Use when:** Starting a new project or reviewing an existing `package.json` for supply-chain hygiene.

---

## The Correct `package.json` Dependencies

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
  }
}
```

Note: `zod` keeps `^` because the v6 SDK peer-dependency range is `^3.25.76 || ^4.1.8`. Pinning zod exactly can conflict with other peers.

---

## The Regression Test That Enforces the Pin

A comment in `package.json` is read only after the bug. A test is read before:

```ts
// test/regression.test.ts
import { readFileSync } from 'fs'
import { join } from 'path'

describe('RT-002: version-pin assertion', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  ) as { dependencies: Record<string, string> }

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

When bumping a dependency:
1. Update the pin in `package.json`.
2. Update the assertion string in the test.
3. Run the upgrade playbook (forbidden-name grep + snapshot review).

This three-step gate forces a human to make an intentional decision at the same moment they bump the version — exactly when it matters.

---

## Why Exact Pins (No `^`)

| Risk | Without exact pins | With exact pins |
|---|---|---|
| `pnpm update` or `npm update` | Silently pulls a new minor with renamed identifiers | Fails — no version range to satisfy |
| CI dependency cache invalidation | Possibly picks up a newer patch | Always resolves the same version |
| Snapshot tests | May break silently post-deploy | Break immediately on install |
| Team reproducibility | "Works on my machine" divergence | Same lockfile always |

The AI SDK has renamed load-bearing identifiers across every major: `parameters` → `inputSchema`, `maxSteps` → `stepCountIs`, `CoreMessage` → `ModelMessage`. A `^` turns these into silent landmines.

---

## The `@ai-sdk/openai@3.0.75` Trap

The research notes reference `@ai-sdk/openai@3.0.75`. That version does not exist on npm. The correct pin is `3.0.64`. Verify before installing:

```bash
npm view @ai-sdk/openai versions --json | tail -20
```

---

## Links

- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
- [Lab 05: Upgrade the AI SDK Pin](../labs/lab-05-upgrade-the-ai-sdk-pin.md)
- [Reference: Package Pins](../reference/package-pins.md)
- [Back to Index](../index.md)
