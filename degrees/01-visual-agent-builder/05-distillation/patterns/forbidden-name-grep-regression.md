# Pattern: Forbidden-name grep regression test (the SDK-rename tripwire)

**Category:** pattern — defense against stale API names

## Problem it solves

Snapshots catch *all* changes, including intentional ones. A reviewer may approve a snapshot diff that quietly re-introduces a deprecated name (e.g., `maxSteps:` creeps back). What's needed is a permanent, name-by-name guard: "no matter what the snapshot says, the emitted code must never contain these forbidden tokens."

This is the second line of defense for [SDK API rename drift](../gotchas/ai-sdk-v6-api-renames.md).

## The pattern

A single regression test iterates fixtures × a hard-coded "do not emit" list, asserting `not.toContain`:

```ts
// 03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts (RT-L4-006)
const forbiddenNames = [
  'parameters:',                 // v4 tool() option name
  'generateObject(',             // deprecated in v6
  'toDataStreamResponse',        // renamed in v5
  'CoreMessage',                 // renamed to ModelMessage
  'experimental_streamText',     // v3 alpha names
  'experimental_output',
  'maxSteps:',                   // removed in v5
  'maxSteps',
]

for (const [fixtureName, fixture] of fixtureEntries) {
  it(`fixture "${fixtureName}" emits no forbidden/deprecated API names`, () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(fixture, workspace)
    Blockly.Events.enable()
    const code = generate(workspace)
    for (const forbidden of forbiddenNames) {
      expect(code, `Generated code from "${fixtureName}" uses deprecated/forbidden API name "${forbidden}" — fix src/blocks/ codegen`).not.toContain(forbidden)
    }
    workspace.clear()
  })
}
```

The error message names the offender and points the reader at the codegen module that needs fixing.

## How it grows

Every time a new v6 API surfaces in a new POC, you (a) add it positively in a snapshot, and (b) add the *old* name to this forbidden list. L3 introduced `parameters:` / `generateObject(` / `toDataStreamResponse` / `CoreMessage`. L4 added `maxSteps:` and `maxSteps`. L5 reused the L4 list unchanged.

## Why it pairs with — not replaces — snapshots

- Snapshots catch *unintended changes* (regression).
- Forbidden grep catches *intended changes that drift backward* (someone "fixed" a snapshot by accepting a stale name).

Together they are belt-and-braces.

## Evidence

- `03-pocs/L4-multi-step-agent-and-stream/source/test/regression.test.ts` lines 233-277 (RT-L4-006) — the canonical implementation. Forbidden list at lines 240-250.
- `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 19-22: "RT-006: Forbidden-name grep (L3 extended list). Permanent regression anchor for the forbidden API surface."
- `02-planning/risk-register.md` lines 105-107 (R6 mitigation #1): "Every worker task contract must include the 'Do This / Not That' table from `01-research/vercel-ai-sdk/version-and-current-api.md` as a forbidden-pattern list."
- `03-pocs/L3-tool-and-object-blocks/README.md` lines 35-37: "**inputSchema: (not parameters:)** — v6 tool API. Enforced by forbidden-name grep. **Output.object({ schema }) via generateText** — not deprecated `generateObject()`. Enforced by forbidden-name grep."

## Related

- [`patterns/golden-output-snapshots-as-sdk-drift-net.md`](golden-output-snapshots-as-sdk-drift-net.md)
- [`playbooks/adding-a-new-ai-sdk-call-type.md`](../playbooks/adding-a-new-ai-sdk-call-type.md)
