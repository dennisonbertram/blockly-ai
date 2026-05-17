# Observability Notes — L1 blockly-hello

## How to inspect generated code

In the running app (`pnpm dev`), the right panel shows live-updated generated
JavaScript. It updates on every `Blockly.Events.CHANGE` event (excluding UI events
and events during drags).

For tests, `generate(workspace)` returns the code string directly — inspect it with:
```typescript
console.log(generate(workspace))
```

## How to inspect workspace state

Serialize the workspace to JSON in the browser console:
```javascript
// In the browser console while app is running:
const ws = /* get workspace ref — not directly accessible from console */
const state = Blockly.serialization.workspaces.save(ws)
console.log(JSON.stringify(state, null, 2))
```

Or from a test:
```typescript
const state = Blockly.serialization.workspaces.save(workspace)
console.log(JSON.stringify(state, null, 2))
```

## Snapshot location

Regression snapshots are at:
```
source/test/__snapshots__/snapshots.test.ts.snap
```

## Generated code format

Blockly's built-in JavaScript generator produces ES5 plain JavaScript. For this POC:
- `math_arithmetic` blocks produce infix expressions with appropriate parens
- `greet` custom block produces `console.log('Hello, ' + <name>);`
- Empty workspaces produce empty string `''`

No IIFE wrapper, no async wrapper — those are L2 concerns.
