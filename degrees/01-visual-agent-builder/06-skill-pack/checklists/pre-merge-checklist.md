# Pre-Merge Checklist — Before Merging a PR

Run through this before merging any branch that adds or modifies block generators, recipe changes, or AI SDK usage.

---

## TDD Audit Trail

- [ ] New block has exactly three commits: RED (failing test), GREEN (implementation), REGRESSION (snapshot + forbidden-name entries)
- [ ] No block was merged without a regression commit

## Tests

- [ ] `pnpm test` fully green on the PR branch
- [ ] No snapshot accepted by running `pnpm test -u` without a corresponding code review of the diff
- [ ] Every snapshot diff has a named reason in the PR description

## Forbidden-Name Grep

- [ ] Forbidden-name list was updated if a new AI SDK call type was introduced (old name added to list)
- [ ] No forbidden name appears in any fixture's emitted code
- [ ] The forbidden-name list was not reduced (entries should only grow)

## Snapshot Review

- [ ] Reviewer examined the full snapshot diff in `test/__snapshots__/`
- [ ] Every changed snapshot line maps to an intentional code change
- [ ] No stale API names (`parameters:`, `maxSteps`, etc.) appear in the snapshot

## Version Pins

- [ ] If `package.json` pins were changed, the RT-002 version-pin test was updated to match
- [ ] If a pin was bumped, the upgrade playbook was followed (CHANGELOG read, forbidden-name check, smoke test)

## New Blocks

- [ ] Block definition file registers both the Blockly block definition AND the generator
- [ ] Block module is imported for side effects in the test file
- [ ] Block module is imported at module level in the route handler
- [ ] A fixture JSON was created and committed to `test/fixtures/`
- [ ] The fixture's `type` field matches the block's registered type exactly

---

## Links

- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
- [Recipe: Forbidden Name Grep Test](../recipes/recipe-forbidden-name-grep-test.md)
- [Back to Index](../index.md)
