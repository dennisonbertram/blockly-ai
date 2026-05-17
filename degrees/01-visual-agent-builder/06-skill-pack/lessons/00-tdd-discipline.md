# Lesson 00 — TDD Discipline: The Red/Green/Regression Audit Trail

**When to read:** Before writing your first block generator. Can be read any time after Lesson 02.
**Source:** `05-distillation/patterns/golden-output-snapshots-as-sdk-drift-net.md`, `05-distillation/patterns/forbidden-name-grep-regression.md`
**Theme:** The two-layer safety net that makes SDK API drift visible before it ships.

---

## Why Tests Carry More Weight Than Usual Here

The Vercel AI SDK ships frequent breaking renames. LLM coding assistants have training data skewed toward v3/v4 API names. A reviewer cannot eyeball every emitted string for `parameters:` vs `inputSchema:`. Without mechanical enforcement, stale API names slip into production silently.

This degree uses a two-layer safety net:
1. **Golden-output snapshots** — lock the exact string the code generator produces.
2. **Forbidden-name grep** — permanently reject deprecated API names regardless of what the snapshot says.

---

## Layer 1 — Golden-Output Snapshots

For every meaningful block (or block combination), commit three things:

1. A **fixture** — workspace JSON saved via `Blockly.serialization.workspaces.save(ws)`.
2. A **snapshot test** — load fixture → generate code → `expect(code).toMatchSnapshot()`.
3. The **snapshot file** — checked into `test/__snapshots__/` — the reviewer can `git diff` it.

```ts
// test/regression.test.ts
import fixture from './fixtures/generate-text-basic.json'

it('generate-text-basic fixture snapshot locked', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(fixture, workspace)
  Blockly.Events.enable()
  expect(generate(workspace)).toMatchSnapshot()
})
```

A failing snapshot means exactly one of two things:
- **(a) Intentional change** — the generator was updated. Accept with `pnpm test -u` after human review.
- **(b) Unintentional change** — the SDK drifted or a bug was introduced. Fix the generator first.

The human review of the snapshot diff is the audit trail. The capstone confirmed this: when the run signature changed intentionally to add `tools: __tools`, the snapshot diff was the record of that decision.

---

## Layer 2 — Forbidden-Name Grep

The forbidden-name grep is a permanent "never emit these" assertion:

```ts
// test/regression.test.ts (RT-006 pattern)
const forbiddenNames = [
  'parameters:',          // v4 tool() option — use inputSchema:
  'generateObject(',      // deprecated v6 — use generateText + Output.object
  'toDataStreamResponse', // renamed v5 — use toUIMessageStreamResponse
  'CoreMessage',          // renamed v5 — use ModelMessage
  'experimental_streamText',
  'experimental_output',
  'maxSteps:',            // removed v5 — use stopWhen: stepCountIs(N)
  'maxSteps',
]

for (const [fixtureName, fixture] of fixtureEntries) {
  it(`fixture "${fixtureName}" emits no forbidden API names`, () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(fixture, workspace)
    Blockly.Events.enable()
    const code = generate(workspace)
    for (const forbidden of forbiddenNames) {
      expect(code, `"${fixtureName}" uses deprecated name "${forbidden}" — fix codegen`).not.toContain(forbidden)
    }
    workspace.clear()
  })
}
```

**Why it exists alongside snapshots:** Snapshots catch unintended changes. The forbidden grep catches *intended changes that drift backward* — someone "fixed" a failing snapshot by accepting a stale name. Together they are belt-and-braces.

---

## The Commit Discipline — Red / Green / Regression

Every new block follows three commits:

```
Commit 1 (RED):    Write the fixture + failing test. Run pnpm test — confirm it fails for the intended reason.
Commit 2 (GREEN):  Implement the block definition + generator. Run pnpm test — all tests pass.
Commit 3 (REGRESSION): Add snapshot lock + forbidden-name entries. Run pnpm test — write snapshot file. Git add snapshot. Commit.
```

Do not merge a new block without the regression commit. The regression commit is the permanent anchor.

---

## Version-Pin Regression Test

In addition to code-generation tests, add a test that re-reads `package.json` and asserts the exact pin strings:

```ts
describe('RT-002: version-pin assertion', () => {
  it('pins ai@6.0.184', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    expect(pkg.dependencies['ai']).toBe('6.0.184')
  })
  it('pins blockly@12.5.1', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    expect(pkg.dependencies['blockly']).toBe('12.5.1')
  })
})
```

This test forces a human to update both the pin and the test when bumping a dependency — exactly the moment to verify the CHANGELOG for renames.

---

## Growing the Forbidden List

Every time a new POC level introduces a new v6 API call:
1. Add it positively in a snapshot (confirm it appears correctly).
2. Add the *old name* to the forbidden list.

L3 added: `parameters:`, `generateObject(`, `toDataStreamResponse`, `CoreMessage`
L4 added: `maxSteps:`, `maxSteps`

If you add a new AI SDK call type (e.g., `embed`), research its old names first (`createEmbedding`, `embedSync`, etc.) and add them to the forbidden list before writing the block.

---

## Probing the SDK Before Trusting Any Name

Run this before writing any forbidden-name or snapshot test — to confirm the names you're testing are what the installed package actually exports:

```bash
node -e "const ai=require('ai'); console.log(Object.keys(ai).sort().join('\n'))"
node -e "console.log(Object.keys(require('ai/test')).sort().join('\n'))"
```

The CHANGELOG is unreliable (it said `isStepCount`; the installed package exports `stepCountIs`). The installed package is authoritative.

Source: `05-distillation/patterns/probe-sdk-with-node-e.md`

---

## Links

- [Back to Curriculum](../curriculum.md)
- [Recipe: Forbidden Name Grep Test](../recipes/recipe-forbidden-name-grep-test.md)
- [Recipe: Pinning AI SDK Exactly](../recipes/recipe-pinning-ai-sdk-exactly.md)
- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [Assessment: Quiz 02 AI SDK v6 Naming](../assessments/quiz-02-ai-sdk-v6-naming.md)
