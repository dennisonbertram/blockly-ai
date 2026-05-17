# Test Plan — L1 blockly-hello

## Behavioral Tests

| ID | When | Then | File | Status |
|---|---|---|---|---|
| BT-001 | workspace is empty | `generate(workspace)` returns `''` | `codegen.test.ts` | PASS |
| BT-002 | workspace contains `1 + 2 * 3` | output contains `1 + 2 * 3`, NOT `1 + (2 * 3)` | `codegen.test.ts` | PASS |
| BT-003 | workspace contains `(1 + 2) * 3` | output contains `(1 + 2) * 3` | `codegen.test.ts` | PASS |
| BT-004 | workspace contains `Greet('Alice')` | output contains `console.log('Hello, ' + 'Alice')` | `codegen.test.ts` | PASS |
| BT-005 | `<BlocklyWorkspace />` mounts in React 18 StrictMode | no "Already injected" errors, container div present | `workspace-mount.test.tsx` | PASS |
| BT-006 | workspace loaded with malformed fixture | `generate()` does NOT throw, returns string | `codegen.test.ts` | PASS |

## Precedence Test Logic (BT-002, BT-003)

Blockly uses the `[code, Order]` tuple pattern for value blocks. The `math_arithmetic`
generator uses:

- `ADD` → `Order.ADDITION` (6.2)
- `MULTIPLY` → `Order.MULTIPLICATION` (5.1)

When requesting an operand at `Order.MULTIPLICATION`, an addition expression
(Order.ADDITION = 6.2 > 5.1) gets wrapped in parens. This is the standard Blockly
precedence system. The fixture design tests this:

- `single-math.json`: `ADD(1, MUL(2,3))` → `1 + 2 * 3` (no parens, because MUL has
  stronger binding and is already correctly nested as right operand)
- `nested-math.json`: `MUL(ADD(1,2), 3)` → `(1 + 2) * 3` (ADD is weaker than MUL,
  needs parens when used as left operand of MUL)

## Regression Test Coverage

| Scenario | What it catches |
|---|---|
| Snapshot: empty → `''` | Future Blockly adding boilerplate for empty workspaces |
| Snapshot: `1 + 2 * 3` | Precedence regression in built-in `math_arithmetic` generator |
| Snapshot: `(1 + 2) * 3` | Paren-insertion regression in Blockly precedence system |
| Snapshot: Greet block | Custom block generator output drift |
| `Blockly.Blocks['greet']` check | greet.ts block definition being dropped |
| `forBlock['greet']` check | greet.ts generator registration being dropped |
| Strict Mode guard unit test | Double-inject guard logic being removed from BlocklyWorkspace |
