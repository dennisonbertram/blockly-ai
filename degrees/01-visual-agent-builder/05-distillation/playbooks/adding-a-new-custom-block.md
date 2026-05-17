# Playbook: Add a new custom Blockly block (definition + generator + toolbox entry + test)

**Category:** playbook

## When to use

You need a new visual block: e.g., a new control-flow block, a new wrapper around an AI SDK call, a new tool stub. The block must show up in the toolbox, be insertable, serialize to/from JSON, generate JavaScript, and survive both `pnpm test` and the regression-snapshot fence.

## Pre-flight

- `package.json` is pinned (exact versions on `ai`, `@ai-sdk/*`, `blockly`). See [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md).
- The `Blockly.Events.disable()/enable()` discipline is in place for fixture loads.
- You know whether your block is **expression** (returns `[code, Order]`) or **statement** (returns `string`). See [`gotchas/blockly-expression-generator-must-return-tuple.md`](../gotchas/blockly-expression-generator-must-return-tuple.md).

## Steps

### 1. Write the RED fixture and test first

```ts
// test/fixtures/my-block-simple.json     ← workspace JSON with the new block
// test/codegen.test.ts
it('my_block emits the expected code', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(fixture, workspace)
  Blockly.Events.enable()
  const code = generate(workspace)
  expect(code).toContain('the API call you expect')
})
```

Run `pnpm test` and confirm it fails for the *intended* reason (missing block / generator). If it fails for an *infrastructure* reason (e.g., fixture references a block that doesn't yet exist), Blockly will throw `Error: The block "..." block is missing a(n) X connection` at load-time — that means your stub block definition is wrong. Fix the stub before declaring RED valid.

### 2. Define the block (JSON definition)

```ts
// src/blocks/my-block.ts
import * as Blockly from 'blockly/core'

Blockly.common.defineBlocksWithJsonArray([{
  type: 'ai_my_block',
  message0: 'My block %1',
  args0: [{ type: 'input_value', name: 'INPUT_NAME' }],
  output: 'AiMyBlock',          // expression — set output type
  // OR
  // previousStatement: null,
  // nextStatement: null,       // statement — chains in a vertical stack
  colour: 30,
  tooltip: 'What this block does',
}])
```

### 3. Register the generator

```ts
// Continuing src/blocks/my-block.ts
import { javascriptGenerator, Order } from 'blockly/javascript'

javascriptGenerator.forBlock['ai_my_block'] = (block, generator) => {
  const input = generator.valueToCode(block, 'INPUT_NAME', Order.NONE) || "''"
  const code  = `theFunction(${input})`
  return [code, Order.FUNCTION_CALL]   // expression
  // OR
  // return `theFunction(${input});\n`  // statement
}
```

### 4. Wire it into the toolbox

```ts
// src/toolbox.ts
export const toolbox = {
  kind: 'flyoutToolbox',
  contents: [
    /* ... existing categories ... */
    { kind: 'block', type: 'ai_my_block' },
  ],
}
```

### 5. Import for side effects in tests and route handler

```ts
// test/codegen.test.ts (top)
import '../src/blocks/my-block'

// app/api/run/route.ts (top)
import 'lib/blocks/my-block'
```

### 6. Update `buildImportHeader` if the new block needs new imports

If your block emits `embed(` or any other AI SDK name not yet detected, extend `buildImportHeader` in `src/codegen/async-generator.ts`. See [`patterns/selective-imports-by-body-scan.md`](../patterns/selective-imports-by-body-scan.md).

### 7. Run tests — GREEN — commit

```bash
pnpm test
git add . && git commit -m "feat(blocks): add ai_my_block — RED→GREEN"
```

### 8. Snapshot + regression — REGRESSION

```ts
// test/regression.test.ts
it('my-block-simple fixture snapshot locked', () => {
  Blockly.Events.disable()
  Blockly.serialization.workspaces.load(fixture, workspace)
  Blockly.Events.enable()
  expect(generate(workspace)).toMatchSnapshot()
})
```

Add any deprecated-API names to the forbidden-name grep. Run `pnpm test` once, commit the new snapshot file.

```bash
git add . && git commit -m "test(blocks): regression snapshot + forbidden-name grep for ai_my_block"
```

## Example commands

```bash
cd degrees/01-visual-agent-builder/03-pocs/<level>/source
pnpm test                             # red phase
# ... implement ...
pnpm test                             # green
pnpm test                             # regression (writes snapshot)
git diff -- test/__snapshots__/      # human review the snapshot
git add . && git commit
```

## Evidence

- `02-planning/test-strategy.md` lines 27-66 (Unit Tests: Block Definitions and Generators) — the canonical test shape.
- `02-planning/test-strategy.md` lines 302-316 (TDD Discipline) — red → green → regression mandatory for every new block generator.
- L3 README documents the L3 block-add cycle for 5 blocks in one POC: `03-pocs/L3-tool-and-object-blocks/README.md` lines 1-50.
- L-capstone adds one new block (`ai_tool_call`) using exactly this playbook: `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 60-71.

## Related

- [`patterns/golden-output-snapshots-as-sdk-drift-net.md`](../patterns/golden-output-snapshots-as-sdk-drift-net.md)
- [`patterns/forbidden-name-grep-regression.md`](../patterns/forbidden-name-grep-regression.md)
