# Blockly Code Generation

## Overview

Code generation in Blockly is a two-step process:
1. Define a generator function per block type on the language generator instance.
2. Call `generator.workspaceToCode(workspace)` to traverse the block tree and accumulate the code string.

The generator does NOT run blocks — it only produces strings. Execution is entirely outside Blockly's scope.

**Evidence**: developers.google.com/blockly/guides/create-custom-blocks/code-generation/overview — "You can't 'run' blocks directly. Instead you generate code strings, and then execute those."

---

## Importing the JavaScript Generator

```typescript
import { javascriptGenerator, Order } from 'blockly/javascript';
```

`javascriptGenerator` is a singleton instance of `JavascriptGenerator`. `Order` is the operator precedence enum.

**Evidence**: `/tmp/package/generators/javascript.d.ts` — `export declare const javascriptGenerator: JavascriptGenerator;`, `/tmp/package/javascript.mjs` — exports `{ JavascriptGenerator, Order, javascriptGenerator }`.

---

## The `Order` Enum (Complete)

Lower value = stronger binding (like standard JS precedence):

```typescript
enum Order {
  ATOMIC         = 0,    // literals, parenthesized expressions
  NEW            = 1.1,  // new
  MEMBER         = 1.2,  // . []
  FUNCTION_CALL  = 2,    // ()
  INCREMENT      = 3,    // ++
  DECREMENT      = 3,    // --
  BITWISE_NOT    = 4.1,  // ~
  UNARY_PLUS     = 4.2,  // +
  UNARY_NEGATION = 4.3,  // -
  LOGICAL_NOT    = 4.4,  // !
  TYPEOF         = 4.5,  // typeof
  VOID           = 4.6,  // void
  DELETE         = 4.7,  // delete
  AWAIT          = 4.8,  // await
  EXPONENTIATION = 5,    // **
  MULTIPLICATION = 5.1,  // *
  DIVISION       = 5.2,  // /
  MODULUS        = 5.3,  // %
  SUBTRACTION    = 6.1,  // -
  ADDITION       = 6.2,  // +
  BITWISE_SHIFT  = 7,    // << >> >>>
  RELATIONAL     = 8,    // < <= > >=
  IN             = 8,    // in
  INSTANCEOF     = 8,    // instanceof
  EQUALITY       = 9,    // == != === !==
  BITWISE_AND    = 10,   // &
  BITWISE_XOR    = 11,   // ^
  BITWISE_OR     = 12,   // |
  LOGICAL_AND    = 13,   // &&
  LOGICAL_OR     = 14,   // ||
  CONDITIONAL    = 15,   // ?:
  ASSIGNMENT     = 16,   // = += -= etc.
  YIELD          = 17,   // yield
  COMMA          = 18,   // ,
  NONE           = 99    // weakest; always forces parens
}
```

**Evidence**: `/tmp/package/generators/javascript/javascript_generator.d.ts` — complete `Order` enum.

---

## Defining Block Code Generators

### Pattern for Value Blocks (return expression)

```typescript
import { javascriptGenerator, Order } from 'blockly/javascript';
import type { Block } from 'blockly/core';

// A block with a string value input and a number output
javascriptGenerator.forBlock['string_length'] = function(block: Block, generator) {
  // valueToCode: get code for connected child block, protecting against FUNCTION_CALL precedence
  const value = generator.valueToCode(block, 'VALUE', Order.FUNCTION_CALL) || "''";
  const code = `${value}.length`;
  // Return [code, weakest operator in this block's expression]
  // .length is property access = Order.MEMBER
  return [code, Order.MEMBER];
};
```

### Pattern for Statement Blocks (no return value)

```typescript
// A block that calls a function (statement, no return value)
javascriptGenerator.forBlock['console_log'] = function(block: Block, generator) {
  const message = generator.valueToCode(block, 'MESSAGE', Order.NONE) || "''";
  return `console.log(${message});\n`;  // statement: return string only, not tuple
};
```

### Pattern with Statement Input (nested code block)

```typescript
// An if-like block with a statement body
javascriptGenerator.forBlock['my_if'] = function(block: Block, generator) {
  const condition = generator.valueToCode(block, 'CONDITION', Order.NONE) || 'false';
  // statementToCode handles the attached stack of statement blocks
  const body = generator.statementToCode(block, 'BODY');
  return `if (${condition}) {\n${body}}\n`;
};
```

### Using `provideFunction_` for Helper Functions

When generated code needs a runtime helper that should appear once:

```typescript
javascriptGenerator.forBlock['add_text'] = function(block: Block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
  // provideFunction_ generates the helper once, returns the actual function name
  const addText = generator.provideFunction_(
    'addText',          // desired name (may be renamed to avoid collisions)
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(text) {
  const outputDiv = document.getElementById('output');
  const textEl = document.createElement('p');
  textEl.innerText = text;
  outputDiv.appendChild(textEl);
}`
  );
  return `${addText}(${text});\n`;
};
```

`FUNCTION_NAME_PLACEHOLDER_` is replaced with the actual (collision-free) name. The helper definition is prepended to the generated code automatically by `finish()`.

**Evidence**: `google/blockly-samples/examples/sample-app-ts/src/generators/javascript.ts` (actual official sample code), `/tmp/package/core/generator.d.ts` — `provideFunction_`, `FUNCTION_NAME_PLACEHOLDER_`.

---

## Running Code Generation

```typescript
// Generate code for the entire workspace
const code = javascriptGenerator.workspaceToCode(workspace);
// or for a single block:
const singleBlock = javascriptGenerator.blockToCode(block);
```

Guard against running during drags:

```typescript
ws.addChangeListener((event) => {
  if (event.isUiEvent) return;
  if (event.type === Blockly.Events.FINISHED_LOADING) return;
  if (ws.isDragging()) return;
  const code = javascriptGenerator.workspaceToCode(ws);
  // ... use code
});
```

---

## Producing ES Modules vs IIFEs

Blockly's built-in JavaScript generator produces **ES5 plain JavaScript** — neither ESM nor IIFE by default. Output looks like:

```js
var x = 5;
var y = x + 3;
console.log(y);
```

If you need module output:
- **IIFE**: wrap with `(function() { ... })();` after generation.
- **ESM**: write a custom generator that produces `export` statements, or wrap the output.
- The generator's `finish(code)` method is the hook for prepending variable declarations; you can override it in a subclass to add wrapper.

---

## Handling Async Code Generation

Blockly does NOT natively support `async`/`await` in code generators. However, you CAN write generators that emit async code strings:

```typescript
javascriptGenerator.forBlock['fetch_data'] = function(block: Block, generator) {
  const url = generator.valueToCode(block, 'URL', Order.NONE) || "''";
  return `await fetch(${url}).then(r => r.json());\n`;
};
```

The problem: `workspaceToCode` cannot know that the top-level code will contain `await`, so the output will be raw `await` statements outside an async function — a syntax error if executed directly.

**Workaround options**:
1. Wrap all generated code in `(async () => { ... })()` after generation.
2. Generate code that uses `.then()` chains instead of `await`.
3. Use the JS-Interpreter (which doesn't support async/await anyway).
4. Define a custom entry-point block type that acts as `async function main() {...}` and ensures all other blocks are nested inside it.

**This is an open area** — there is no official Blockly pattern for async code generation. See `open-questions.md`.

---

## Safe Execution of Generated Code

### Option 1: `eval` (prototype only)

```javascript
try {
  eval(code);
} catch (e) {
  console.error('Generated code error:', e);
}
// Add reserved word to prevent collision:
javascriptGenerator.addReservedWords('code');
```

**WARNING**: `eval` gives generated code full access to the host page's scope, DOM, cookies, localStorage, and global objects. The Blockly docs explicitly state: "Executing JavaScript with eval is a serious security risk and should be done only during prototyping."

**Evidence**: developers.google.com/blockly/guides/app-integration/running-javascript.

### Option 2: `new Function(...)` (slightly safer than eval)

```javascript
try {
  const fn = new Function(code);
  fn();
} catch (e) {
  console.error(e);
}
```

`new Function` evaluates in the global scope (not the local scope of the calling function), so local variables are not accessible. Still has access to `window`, `document`, etc. — not truly sandboxed.

### Option 3: JS-Interpreter (recommended for production)

```javascript
import { Interpreter } from 'js-interpreter';

const code = javascriptGenerator.workspaceToCode(workspace);
const initApi = (interpreter, globalObject) => {
  // Expose only the APIs you want generated code to access:
  interpreter.setProperty(globalObject, 'alert',
    interpreter.createNativeFunction((text) => alert(String(text))));
};
const myInterpreter = new Interpreter(code, initApi);
myInterpreter.run();
```

JS-Interpreter provides:
- Complete isolation from the host page's JS environment.
- Step-through execution (call `.step()` instead of `.run()`).
- Block highlighting while executing.
- Infinite loop protection.

**Limitation**: JS-Interpreter runs a JavaScript-in-JavaScript interpreter; it is slower and only supports ES5. No native `Promise`, `async/await`, `fetch`, or Web APIs unless explicitly bridged.

**Evidence**: developers.google.com/blockly/guides/app-integration/running-javascript — "JS-Interpreter, which the Blockly team recommends as a way to safely execute JavaScript."

### Option 4: Web Worker

```javascript
const blob = new Blob([code], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
const worker = new Worker(url);
// Worker has no access to DOM, only postMessage API
worker.onmessage = (e) => console.log('result:', e.data);
```

The Worker has no access to the DOM or `document`. It can use `postMessage`. This is an intermediate option between `eval` (unsafe) and JS-Interpreter (no Web APIs).

### Infinite Loop Protection

For any execution method:

```javascript
window.LoopTrap = 1000;
javascriptGenerator.INFINITE_LOOP_TRAP =
  'if(--window.LoopTrap == 0) throw "Infinite loop.";\n';
```

This string is injected at the start of every loop and function in the generated code.

**Evidence**: developers.google.com/blockly/guides/app-integration/running-javascript.

---

## Complete Example: Custom "Greet" Block + Generator

See `custom-blocks.md` for the full example including block definition, generator, and toolbox entry.
