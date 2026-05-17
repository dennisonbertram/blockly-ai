# Blockly Testing Model

## How Blockly's Own Tests Are Structured

The Blockly source repo uses **Mocha** as the test runner and **Chai** as the assertion library. Puppeteer is used for browser-based integration tests.

**Evidence**: `/tmp/package/package.json` `devDependencies` — `mocha@^11.3.0`, `chai@^6.0.1`, `puppeteer-core@^24.17.0`.

The `@blockly/dev-tools` package (also in devDependencies) provides testing utilities for Blockly itself. The `@blockly/block-test` package provides test helpers for block definitions.

---

## Testing Custom Block Definitions

### Strategy: Headless Workspace + Code Generation Assert

The most reliable test for custom blocks is:
1. Create a headless workspace (no DOM needed for `Workspace`, but `WorkspaceSvg` needs DOM or jsdom).
2. Load a serialized workspace state (JSON) that places your custom blocks.
3. Call `javascriptGenerator.workspaceToCode(workspace)`.
4. Assert the output string matches expected code.

### Option A: Node.js with `blockly/core` (Headless)

Works in Node.js 18+ without jsdom setup (jsdom is auto-bootstrapped via `core-node.js`).

```typescript
// test/greet.test.ts — using Mocha + Chai
import { expect } from 'chai';
import * as Blockly from 'blockly/core';      // triggers core-node.js -> jsdom
import * as libraryBlocks from 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import { blocks } from '../src/blocks/greet';
import { forBlock } from '../src/generators/javascript';

// Register once per test file
Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

describe('greet block', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    workspace = new Blockly.Workspace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  it('generates greeting code with literal string inputs', () => {
    // Load a saved workspace state containing a greet block
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'greet',
            id: 'test1',
            x: 0,
            y: 0,
            inputs: {
              NAME: {
                block: { type: 'text', id: 'text1', fields: { TEXT: 'Alice' } },
              },
              MESSAGE: {
                block: { type: 'text', id: 'text2', fields: { TEXT: 'Hello' } },
              },
            },
          },
        ],
      },
    };

    Blockly.Events.disable();
    Blockly.serialization.workspaces.load(state, workspace);
    Blockly.Events.enable();

    const code = javascriptGenerator.workspaceToCode(workspace);
    expect(code).to.include("console.log('Hello' + ', ' + 'Alice' + '!');");
  });

  it('uses defaults when inputs are empty', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'greet', id: 'test2', x: 0, y: 0 }],
      },
    };

    Blockly.Events.disable();
    Blockly.serialization.workspaces.load(state, workspace);
    Blockly.Events.enable();

    const code = javascriptGenerator.workspaceToCode(workspace);
    expect(code).to.include("console.log('Hello' + ', ' + 'World' + '!');");
  });
});
```

### Option B: jsdom in Jest

If your team uses Jest, configure jsdom as the test environment. Blockly's DOM dependencies will be satisfied by Jest's built-in jsdom.

```js
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
};
```

**Caveats with Jest + jsdom**:
- Blockly's SVG rendering (`WorkspaceSvg`) requires a full SVG DOM that jsdom provides imperfectly. Stick to `Workspace` (headless) in unit tests.
- `Blockly.inject` WILL throw in jsdom because it tries to measure SVG elements — measurements return 0.
- If you must test `WorkspaceSvg` rendering, use Puppeteer or Playwright with a real browser.

**Evidence**: Blockly's own tests use Puppeteer for UI tests (from devDependencies). The `Workspace` base class works headlessly without full SVG. Inferred from `core-node.js` jsdom bootstrap pattern.

---

## Testing Mutator State

To test that mutator state round-trips correctly through serialization:

```typescript
it('serializes and restores mutator state', () => {
  const workspace = new Blockly.Workspace();

  // Load a state with extraState
  const stateWithMutator = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'my_list',
          id: 'list1',
          x: 0, y: 0,
          extraState: { itemCount: 5 },
        },
      ],
    },
  };

  Blockly.Events.disable();
  Blockly.serialization.workspaces.load(stateWithMutator, workspace);
  Blockly.Events.enable();

  const block = workspace.getBlockById('list1');
  expect(block.itemCount_).to.equal(5);

  // Also verify round-trip
  const savedState = Blockly.serialization.workspaces.save(workspace);
  expect(savedState.blocks.blocks[0].extraState.itemCount).to.equal(5);

  workspace.dispose();
});
```

---

## Testing Field Validators

Field validators are tricky to test because they are closures attached to field instances. Test them by:
1. Creating a block with the field.
2. Setting the field value programmatically.
3. Reading it back to confirm rejection or transformation.

```typescript
it('rejects negative numbers', () => {
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('positive_number');
  const field = block.getField('NUM');

  field.setValue(-5);
  // After validator runs, value should remain unchanged (or at the validator's fallback)
  expect(field.getValue()).to.be.above(0);

  workspace.dispose();
});
```

---

## Fixture-Based Testing Pattern

For larger block graphs, maintain JSON fixture files:

```
tests/
  fixtures/
    simple_if.json      # workspace state with an if block
    nested_loops.json   # workspace state with nested loops
  generators/
    javascript.test.ts
```

```typescript
// Load fixture, generate code, assert against snapshot
import simpleIfFixture from '../fixtures/simple_if.json';

it('generates if statement code', () => {
  Blockly.Events.disable();
  Blockly.serialization.workspaces.load(simpleIfFixture, workspace);
  Blockly.Events.enable();

  const code = javascriptGenerator.workspaceToCode(workspace);
  expect(code).to.equal(`if (true) {\n  console.log('yes');\n}\n`);
});
```

---

## Summary: Test Configuration Recommendations

| Test type | Runner | Environment | Notes |
|---|---|---|---|
| Block definition + generator unit tests | Mocha | Node.js | Use `Workspace`, not `WorkspaceSvg` |
| Mutator state round-trip | Mocha | Node.js | Use JSON serialization fixtures |
| Field validator tests | Mocha | Node.js | Instantiate blocks directly |
| UI / drag-and-drop tests | Puppeteer/Playwright | Real browser | Required for `WorkspaceSvg` measurements |
| Integration tests (React mount) | Playwright | Real browser | SSR testing requires actual Next.js build |

Use `Blockly.Events.disable()` around all programmatic workspace loads in tests to prevent listener side effects. Dispose workspaces in `afterEach` to avoid state leaking between tests.
