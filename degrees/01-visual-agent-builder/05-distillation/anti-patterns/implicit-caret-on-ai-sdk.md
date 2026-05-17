# Anti-pattern: Implicit `^` version range on AI SDK packages

**Category:** anti-pattern — supply-chain hygiene

## Why it's tempting

`npm install ai` defaults to `"ai": "^6.0.184"`. The caret means "any 6.x.y patch/minor newer". That sounds safe: SemVer says minor and patch are backward-compatible.

## Why it fails — three layered reasons

### 1. The AI SDK does not respect SemVer for renames

The Vercel AI SDK has *renamed* identifiers within a major version line before. Even within the v6 line, deprecations have shipped quickly. With `^6.0.184`, a fresh `npm install` next month could pull `6.0.230` which deprecates an accessor your snapshot tests depend on. The build passes; the runtime warns; eventually it breaks. None of that is signaled by SemVer.

### 2. v7 canary is *already* renaming things back

The published CHANGELOG shows `stepCountIs` → `isStepCount` pending in v7. The exact-pin version-and-current-api.md document calls this out: "v7 canary exists but is NOT stable." If a future `^6.x` were to "soft-release" v7-ish behavior under a 6.x patch (it has happened before), `^` lets it in.

### 3. The forbidden-name grep + snapshot tests **assume the pin is exact**

Every fixture snapshot in this repo was captured against `ai@6.0.184` specifically. If `npm install` quietly upgrades, the snapshots disagree with the runtime, but the developer who runs `npm install` is not the developer who reviews the snapshot diff. The bug gets committed when someone "updates the snapshot to make tests pass."

## What to do instead

```jsonc
{
  "dependencies": {
    "ai":               "6.0.184",      // exact
    "@ai-sdk/anthropic": "3.0.78",      // exact
    "@ai-sdk/openai":    "3.0.64",      // exact (note: 3.0.75 doesn't exist on npm)
    "blockly":           "12.5.1",      // exact
    "zod":               "^3.25.76"     // ^ allowed only because v6 SDK peer range mandates flexibility
  }
}
```

And add the version-pin regression test that re-reads `package.json` and asserts the exact strings. See [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md).

To upgrade deliberately, follow [`playbooks/upgrading-the-ai-sdk-pin.md`](../playbooks/upgrading-the-ai-sdk-pin.md).

## Evidence

- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 14, 115-123: "v7 canary exists but is NOT stable. … `stepCountIs` renamed to `isStepCount` (again — naming flip from v5 history)."
- `02-planning/risk-register.md` lines 9-23 (R1): "Likelihood: High (SDK is actively evolving; v7 canary is shipping). Impact: High … Pin all AI SDK packages to exact versions in `package.json` (not `^`). Unpin only with explicit decision."
- `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 97-115 (RT-002): the test that locks `ai === '6.0.184'` exactly, not `^6.0.184`.
- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 100-114 (RT-L4-002): same.

## Related

- [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md)
- [`gotchas/ai-sdk-openai-version-3075-does-not-exist.md`](../gotchas/ai-sdk-openai-version-3075-does-not-exist.md)
- [`anti-patterns/trusting-llm-from-memory-for-ai-sdk.md`](trusting-llm-from-memory-for-ai-sdk.md)
