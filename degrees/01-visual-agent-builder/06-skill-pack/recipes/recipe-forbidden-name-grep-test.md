# Recipe: Forbidden-Name Grep Test

**Use when:** Setting up the permanent regression guard against deprecated AI SDK API names.

---

## Template

Copy this into `test/regression.test.ts`. Add new forbidden names as you add new features.

```ts
// test/regression.test.ts

import Blockly from 'blockly/core'
import { javascriptGenerator } from 'blockly/javascript'
import { generateAsyncModule } from '../src/codegen/async-generator'

// Import all block modules for side-effect registration
import '../src/blocks/generate-text'
import '../src/blocks/model'
import '../src/blocks/stream-text'
import '../src/blocks/agent'
import '../src/blocks/tool'
import '../src/blocks/zod'

// Load all fixtures as a map
import generateTextFixture from './fixtures/generate-text-basic.json'
import agentFixture        from './fixtures/agent-multi-step.json'
// ... add more as you create them

const fixtureEntries = Object.entries({
  'generate-text-basic': generateTextFixture,
  'agent-multi-step':    agentFixture,
  // ...
})

// RT-006: Forbidden-name grep — permanent SDK-rename tripwire
const forbiddenNames = [
  // v4 tool() option — use inputSchema: instead
  'parameters:',
  // deprecated v6 — use generateText + Output.object instead
  'generateObject(',
  // renamed v5 — use toUIMessageStreamResponse
  'toDataStreamResponse',
  // renamed v5 — use ModelMessage
  'CoreMessage',
  // v3 alpha names
  'experimental_streamText',
  'experimental_output',
  // removed v5 — use stopWhen: stepCountIs(N)
  'maxSteps:',
  'maxSteps',
]

const workspace = new Blockly.Workspace()

for (const [fixtureName, fixture] of fixtureEntries) {
  it(`fixture "${fixtureName}" emits no forbidden/deprecated API names`, () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(fixture, workspace)
    Blockly.Events.enable()

    const code = generateAsyncModule(workspace)

    for (const forbidden of forbiddenNames) {
      expect(
        code,
        `"${fixtureName}" uses deprecated name "${forbidden}" — fix src/blocks/ codegen`
      ).not.toContain(forbidden)
    }

    workspace.clear()
  })
}
```

---

## Growing the Forbidden List

Every time a new AI SDK call type is added:

1. Add it **positively** in a snapshot (confirm the new name appears correctly).
2. Add the **old name** to `forbiddenNames`.

| POC level | Names added to forbidden list |
|---|---|
| L3 | `parameters:`, `generateObject(`, `toDataStreamResponse`, `CoreMessage` |
| L4 | `maxSteps:`, `maxSteps` |
| Future | Add old names here when new call types are introduced |

## Why both forbidden grep AND snapshots

- Snapshots catch **unintended changes** — they fail when any string in the emitted code changes.
- Forbidden grep catches **intended changes that drift backward** — someone accepts a snapshot that quietly re-introduces a deprecated name.

Together they form a belt-and-braces defense.

---

## Links

- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
- [Recipe: Pinning AI SDK Exactly](recipe-pinning-ai-sdk-exactly.md)
- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [Back to Index](../index.md)
