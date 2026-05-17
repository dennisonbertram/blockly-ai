# Surprises — L1 blockly-hello

## 1. Blockly.inject crashes in happy-dom (FocusManager)

**Expected**: `Blockly.inject()` would either work or silently fail in happy-dom
(similar to how jsdom 0s-out SVG measurements).

**Reality**: Blockly 12.5.1 added `FocusManager` which calls `addEventListener`
on `window` using an internal `EventTarget` wrapper. happy-dom's implementation
of that pattern has an incompatibility that causes:
```
TypeError: Cannot read properties of undefined (reading 'Symbol(listeners)')
```

**Impact**: Workspace-mount tests required mocking `Blockly.inject`. The research
docs noted this for jsdom but not specifically for happy-dom.

## 2. `vi.mock` spread doesn't capture runtime-mutated `Blockly.Blocks`

**Expected**: `{ ...actual }` in a vi.mock factory would preserve everything.

**Reality**: `Blockly.Blocks` is not a static named export but a runtime-mutated
property. The spread doesn't include it, causing:
```
Error: [vitest] No "Blocks" export is defined on the "blockly/core" mock.
```

**Fix**: Explicitly include `Blocks: actual.Blocks` in the mock return.

## 3. `vi.hoisted` required for variables in vi.mock factory

**Expected**: Variables declared at module scope could be used in `vi.mock` factories.

**Reality**: Vitest hoists `vi.mock` calls before variable declarations.
`ReferenceError: Cannot access 'mockInject' before initialization` without `vi.hoisted`.

## 4. `Blockly.serialization.workspaces.load` throws for unknown block types

**Expected**: Blockly would silently skip unknown block types (matching the
"no throw" spirit of BT-006).

**Reality**: It throws `TypeError: Invalid block definition for type: <name>`.
The `generate()` wrapper still doesn't throw — the contract is that `generate()`
is defensive, not that `load()` is defensive.

## 5. `deps.inline` deprecated in Vitest 3.x

**Expected**: `deps.inline: ['blockly']` from the research test-strategy doc.

**Reality**: Vitest 3.x deprecates it in favor of `deps.optimizer.web.include`.
Not a functional change — just a warning that was fixed.
