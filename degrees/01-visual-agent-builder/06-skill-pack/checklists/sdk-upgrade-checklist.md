# SDK Upgrade Checklist — When Bumping `ai` or Provider Packages

Follow this checklist every time you change the version of `ai`, `@ai-sdk/anthropic`, or `@ai-sdk/openai`. Steps are in order; do not skip ahead.

---

## Before Touching Code

- [ ] Confirm target version is on the `latest` dist-tag (not `beta` or `canary`):
  ```bash
  npm view ai dist-tags --json
  npm view @ai-sdk/anthropic dist-tags --json
  npm view @ai-sdk/openai dist-tags --json
  ```
- [ ] Read the CHANGELOG from the current pin to the target version:
  ```bash
  cat node_modules/ai/CHANGELOG.md | head -300
  ```
- [ ] Build a delta list: every `rename`, `deprecate`, `remove`, `breaking` entry between the two versions. Write it in the PR description.

## Making the Bump

- [ ] Create a branch: `git checkout -b chore/bump-ai-sdk-<from>-<to>`
- [ ] Edit `package.json` — exact pin (no caret) for all three packages in sync
- [ ] Edit `test/regression.test.ts` RT-002 — update assertion strings to new version values
- [ ] Run `pnpm install` (not npm)

## First Test Run

- [ ] Run `pnpm test` — observe failures
- [ ] Categorize each failure:
  - **Forbidden-name grep fires** → fix the generator to use the new name, then add the old name to the forbidden list
  - **Snapshot mismatch** → investigate whether it maps to a CHANGELOG entry; if yes, it is expected; if no, the SDK changed a default silently
  - **Execute-test TypeError** → probe the new SDK shapes with `node -e`

## Forbidden-Name Resolution

- [ ] For each deprecated name the new version obsoletes: add it to `forbiddenNames` in `test/regression.test.ts`
- [ ] Fix the generator that emits it to use the new name
- [ ] Do NOT remove existing forbidden-name entries

## Snapshot Resolution

- [ ] Accept snapshots only after the full CHANGELOG reconciliation is done
- [ ] Run `pnpm test -u` to write new snapshots
- [ ] Review every line of the diff in `test/__snapshots__/`
- [ ] Confirm every diff maps to a CHANGELOG entry in your delta list

## Optional: Live Smoke Test

- [ ] If real API keys are available:
  ```bash
  RUN_LIVE_MODEL_TESTS=1 ANTHROPIC_API_KEY=... OPENAI_API_KEY=... pnpm test
  ```
- [ ] Check for behavior changes the mock cannot model (e.g., `result.output` accessor shape)

## Documentation Update

- [ ] If any `MockLanguageModelV3` shape changed: update [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [ ] Update [Reference: Package Pins](../reference/package-pins.md) with new pin values and dates

## Commit

- [ ] `pnpm test` fully green
- [ ] `git add . && git commit -m "chore: bump ai X → Y — <reason for each snapshot change>"`
- [ ] PR description lists every snapshot diff mapped to a CHANGELOG entry

---

## Links

- [Lab 05: Upgrade the AI SDK Pin](../labs/lab-05-upgrade-the-ai-sdk-pin.md)
- [Recipe: Pinning AI SDK Exactly](../recipes/recipe-pinning-ai-sdk-exactly.md)
- [Recipe: Forbidden Name Grep Test](../recipes/recipe-forbidden-name-grep-test.md)
- [Back to Index](../index.md)
