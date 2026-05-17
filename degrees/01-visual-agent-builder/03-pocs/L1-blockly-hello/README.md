# L1 — blockly-hello

POC 1 of the Visual Agent Builder degree. Validates that Blockly 12.5.1 builds
cleanly with Vite + React 18 + TypeScript, that React Strict Mode double-mount
is handled correctly, and that `javascriptGenerator.workspaceToCode` produces
correct output including operator precedence.

## What this is

A minimal Vite + React + TypeScript app that:
- Mounts a Blockly workspace with a category toolbox (Logic, Math, Text, Custom)
- Includes a custom "Greet (name)" block with a JavaScript code generator
- Renders generated JavaScript code in a side panel (live-updating on change)
- Has a "Run" button (`new Function` — **prototype-only, explicitly labeled unsafe**)
- Validates React 18 Strict Mode double-mount guard pattern

## How to run

```bash
cd source
pnpm install
pnpm dev        # starts Vite dev server at http://localhost:5173
```

## How to test

```bash
cd source
pnpm test           # run all tests once
pnpm test:watch     # watch mode
pnpm test:coverage  # with V8 coverage
```

## Tests

| File | Tests | Purpose |
|---|---|---|
| `test/codegen.test.ts` | 5 | BT-001–004, BT-006 — codegen golden-output |
| `test/greet-block.test.ts` | 4 | Greet block definition + generator |
| `test/workspace-mount.test.tsx` | 4 | BT-005 — Strict Mode double-mount guard |
| `test/snapshots.test.ts` | 7 | Regression snapshots + registration checks |

## Key design decisions

- **`field_input` → `input_value`**: The greet block uses an `input_value` connector
  (not `field_input`) so text blocks can be connected — matching the fixture format.
- **Blockly.inject mock**: happy-dom doesn't support Blockly's FocusManager event
  listeners. The workspace-mount test mocks `inject` via `vi.mock`+`vi.hoisted`.
- **BT-006 contract**: `Blockly.serialization.workspaces.load` throws for unknown
  block types. `generate()` itself must not throw; the test wraps load in try/catch.
