# Lab 05 — Upgrade the AI SDK Pin End-to-End

**Goal:** Walk the full upgrade playbook from `ai@6.0.184` to a newer patch release, confirm all three test layers survive, and leave the repo in a clean state.

**Prerequisites:** [Lesson 00](../lessons/00-tdd-discipline.md), [Lesson 04](../lessons/04-multi-step-and-streaming.md), [Lesson 05](../lessons/05-deploy-to-vercel.md)

**Time estimate:** 30–60 minutes (depending on how many renames the new version introduced)

---

## Why This Exercise Exists

The Vercel AI SDK ships frequently. LLM coding assistants have training data skewed toward older API shapes. Without a mechanical upgrade process, a well-intentioned bump silently re-introduces deprecated names. This lab forces you to run the three-layer gauntlet — CHANGELOG scan, forbidden-name grep, snapshot review — so upgrades are never silent.

---

## Steps

### Step 1 — Confirm publish status before touching package.json

```bash
npm view ai version                     # highest stable
npm view ai dist-tags --json            # latest / beta / canary
npm view @ai-sdk/anthropic version
npm view @ai-sdk/openai version
```

Pick a version on the `latest` dist-tag only. Never pin `beta` or `canary` for a consumer-facing project.

If the latest stable is still `6.0.184`, abort the lab — there is nothing to upgrade. You can simulate the exercise by temporarily bumping to an older patch and walking steps 2–7 anyway.

### Step 2 — Read the CHANGELOG before touching code

```bash
cat node_modules/ai/CHANGELOG.md | head -300
```

Or for a version not yet installed:

```bash
npm view ai@<target> --json | grep '"repository"'
# then visit the repo and read CHANGELOG.md on the target tag
```

Build a delta list of every `rename`, `deprecate`, `remove`, or `breaking` entry between `6.0.184` and your target version. Write it down — you will reconcile it against snapshot diffs in step 5.

### Step 3 — Create a branch and bump the pin

```bash
git checkout -b chore/bump-ai-sdk-6.0.184-<target>
```

Edit `package.json` — change the **exact** pin (no caret) for `ai`, `@ai-sdk/anthropic`, and `@ai-sdk/openai`. Keep all three pins in sync — provider packages version-match the core.

Also edit `test/regression.test.ts` — update the RT-002 version-pin assertion strings to the new values:

```ts
// Before
expect(pkg.dependencies['ai']).toBe('6.0.184')
// After
expect(pkg.dependencies['ai']).toBe('<target>')
```

Then install:

```bash
pnpm install   # must use pnpm, not npm, to honor pnpm-lock.yaml
```

### Step 4 — First test run — observe failures

```bash
pnpm test
```

Three classes of failure are expected:

| Failure class | What it looks like | What to do |
|---|---|---|
| **Forbidden-name grep fires** | `"<fixture>" uses deprecated name "<name>"` | Add the name to your forbidden list AND fix the generator that emits it. |
| **Snapshot mismatch** | Vitest snapshot diff shows changed strings | Investigate: is it an expected API rename (accept after human review)? Or an unexpected default-option change (fix the generator first)? |
| **Execute-test failure** | `MockLanguageModelV3` shape error, stream chunk error, or runtime TypeError | Probe the new SDK with `node -e` — shapes may have changed. See [Troubleshooting: MockLanguageModel Shape Error](../troubleshooting/symptom-mocklanguagemodel-shape-error.md). |

### Step 5 — Reconcile diffs against your CHANGELOG delta list

For every snapshot diff, map it to one entry in your delta list. If a diff has no matching CHANGELOG entry, the SDK silently changed behavior — that is a bug, not a feature. File an issue and consider whether to proceed.

If a forbidden-name test fires on a name the new SDK removed, add it to the forbidden list and fix the generator to emit the new name.

### Step 6 — Update snapshots only after human review

```bash
pnpm test -u   # accept all snapshot changes
```

Only run this after step 5 is complete. The audit trail is the diff in `test/__snapshots__/`. Review it in full before committing.

### Step 7 — Smoke against a real provider (optional, requires API keys)

```bash
RUN_LIVE_MODEL_TESTS=1 ANTHROPIC_API_KEY=... OPENAI_API_KEY=... pnpm test
```

This catches behavior changes the mock cannot model — for example, if a real provider now returns a different `output` accessor shape than MockLanguageModelV3 simulates.

### Step 8 — Update research docs if shape changed

If any `MockLanguageModelV3` shape changed (e.g., `finishReason`, `usage`, `content` chunk fields), update the reference material so the next person does not hit the same gap:

- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [Reference: Package Pins](../reference/package-pins.md)

### Step 9 — Commit with an explicit PR description

```bash
git add .
git commit -m "chore: bump ai 6.0.184 → <target> — snapshots updated for <reason>"
```

The PR description must list every snapshot diff and the CHANGELOG entry it corresponds to. Reviewers should be able to verify each change without looking at the full diff.

---

## Acceptance Criteria

- [ ] `npm view ai dist-tags` confirmed the target is on `latest` (not beta/canary).
- [ ] CHANGELOG was read and a delta list was written before any code changed.
- [ ] The exact pin was updated in `package.json` (no caret).
- [ ] The RT-002 version-pin assertion in `regression.test.ts` was updated.
- [ ] `pnpm install` completed without error.
- [ ] All forbidden-name failures were resolved by fixing generators (not by removing the forbidden list entry).
- [ ] All snapshot diffs were reconciled against the CHANGELOG delta list.
- [ ] `pnpm test` is fully green.
- [ ] The commit message names the CHANGELOG reason for each snapshot change.

---

## Hints

- If `pnpm install` fails with an esbuild-blocked error, check `pnpm-workspace.yaml` for `onlyBuiltDependencies: [esbuild]`. See [Troubleshooting: pnpm Install Fails (esbuild blocked)](../troubleshooting/symptom-pnpm-install-fails-esbuild-blocked.md).
- The CHANGELOG is sometimes inaccurate about the *exact* name. Always probe the installed package to verify:
  ```bash
  node -e "const ai=require('ai'); console.log(Object.keys(ai).sort().join('\n'))"
  ```
- `@ai-sdk/openai@3.0.75` does not exist on npm. The valid pin is `3.0.64`. If a bump inadvertently pulls a non-existent provider version, `pnpm install` will fail at resolution time.
- If `MockLanguageModelV3` shape errors appear after a bump, they are almost always in `finishReason` (expect `{ unified: 'stop' }` not `'stop'`) or `usage` (expect `{ inputTokens: { total: N }, outputTokens: { total: N } }`). Probe with `node -e "console.log(require('ai/test'))"`.

---

## Links

- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
- [Recipe: Pinning AI SDK Exactly](../recipes/recipe-pinning-ai-sdk-exactly.md)
- [Recipe: Forbidden Name Grep Test](../recipes/recipe-forbidden-name-grep-test.md)
- [Reference: Package Pins](../reference/package-pins.md)
- [Troubleshooting: MockLanguageModel Shape Error](../troubleshooting/symptom-mocklanguagemodel-shape-error.md)
- [Troubleshooting: pnpm Install Fails (esbuild blocked)](../troubleshooting/symptom-pnpm-install-fails-esbuild-blocked.md)
