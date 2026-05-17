# Playbook: Upgrade the AI SDK pin (verify against forbidden-name + snapshot + execute tests)

**Category:** playbook

## When to use

You want to move from `ai@6.0.184` to a newer pin — patch, minor, or major.

## Steps

### 1. Read the CHANGELOG for the target version

```bash
cat node_modules/ai/CHANGELOG.md | head -200
# Or, for a version you don't have installed yet:
npm view ai@<target> repository
```

Look for the keywords `rename`, `deprecate`, `remove`, `breaking`. Note every renamed identifier into a delta list.

### 2. Confirm publish status

```bash
npm view ai version            # latest published
npm view ai dist-tags --json   # latest, beta, canary, etc.
npm view @ai-sdk/openai version
npm view @ai-sdk/anthropic version
```

Confirm the version you want is on the `latest` dist-tag, not `beta` or `canary`. **Never** pin a beta or canary for downstream consumers.

### 3. Make the bump in a branch

```bash
git checkout -b chore/bump-ai-sdk-<from>-<to>
# Edit package.json — update the exact pin, keep no caret
# Edit test/regression.test.ts — update the RT-N02 assertion strings to match
pnpm install   # not npm; pnpm to honor pnpm-lock.yaml
```

### 4. Run the full test gauntlet

```bash
pnpm test            # 1st run — observe failures
```

Three classes of failure are possible:

- **Forbidden-name grep fires** → a generator now emits a name that's deprecated in the new version. Add it to the forbidden list **and** fix the generator. Example: if a future v6.1 deprecates `Output.object` in favor of `Output.json`, the grep will catch any leftover `Output.object(` in your emitted code.
- **Snapshot mismatch** → a generator's output literally changed. Investigate: is this an expected change (you intentionally moved to a new API)? If yes, update the snapshot after human review. If no, the SDK probably changed an option default and your generator needs to be updated to compensate.
- **Execute-test failure** → a runtime shape changed. The most common are `MockLanguageModelV3`'s `finishReason` / `usage` shapes, or stream chunk fields. See [`gotchas/mock-language-model-v3-stream-shape.md`](../gotchas/mock-language-model-v3-stream-shape.md). Probe the new SDK with `node -e`.

### 5. Run a smoke against a real provider (gated)

```bash
RUN_LIVE_MODEL_TESTS=1 ANTHROPIC_API_KEY=... OPENAI_API_KEY=... pnpm test
```

This catches behavior changes the mock can't model (e.g., `Output.array` accessor returns a different shape with a real model).

### 6. Update the research doc

If the new version changed any of:
- An identifier name → update `01-research/vercel-ai-sdk/version-and-current-api.md`'s mapping table.
- A `MockLanguageModelV3` shape → update `01-research/vercel-ai-sdk/testing-model.md`.

Otherwise downstream POCs will hit the same expectation gaps you just fixed.

### 7. Commit, PR, merge

```bash
git add . && git commit -m "chore: bump ai 6.0.184 → 6.0.x — regression snapshots updated for <reason>"
```

The PR description should explicitly say *why* each snapshot changed. Reviewers should be able to map every snapshot diff to one CHANGELOG entry.

## Why this playbook exists

The L3 surprises (`.output` not `.object`, `finishReason: { unified }` not `'stop'`, `mockValues(...)` not `[...]`) all *would have been caught* by this exact playbook, had it been run when the research-doc was first read. Several of those mismatches were already present at `ai@6.0.184`; the research doc had captured pre-publication shapes.

## Evidence

- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 12, 25, 49, 113, 123: every "Evidence:" line in that doc is a runtime probe — the version doc itself follows this playbook.
- `02-planning/risk-register.md` lines 16-23 (R1 mitigations): "Pin all AI SDK packages to exact versions … Add a CI step that runs `npm outdated` and fails if any AI SDK package drifts from pins."
- `03-pocs/L-capstone-research-agent/surprises.md` lines 36-39 (S-capstone-004): "Checked for a patched 15.x release. next@15.3.2 is current at time of writing. No bump documented because no newer 15.x stable was available." — the playbook starts with this check.
- `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 95-115 (RT-002): the version-pin regression that needs updating in step 3.

## Related

- [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md)
- [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md)
- [`anti-patterns/implicit-caret-on-ai-sdk.md`](../anti-patterns/implicit-caret-on-ai-sdk.md)
