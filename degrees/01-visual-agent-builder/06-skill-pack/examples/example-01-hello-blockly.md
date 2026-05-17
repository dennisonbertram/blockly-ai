# Example 01 — Hello Blockly

**What it demonstrates:** Mounting Blockly in a Next.js 15 App Router page, injecting a basic block, and generating code from the workspace.

**Complexity:** Minimal — no AI SDK calls. Pure Blockly.

---

## What You Will See

A Blockly workspace with a single "Hello World" block. Clicking "Generate" runs `workspaceToCode` and displays the emitted string.

---

## Workspace Fixture

```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "ai_greet",
        "fields": { "NAME": "World" }
      }
    ]
  }
}
```

## Expected Emitted Code

```ts
import { generateText } from 'ai';

export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {
  __sink?.('output', 'Hello, World!');
}
```

---

## Key Patterns Illustrated

- `next/dynamic({ ssr: false })` from a `'use client'` page
- React Strict Mode guard: `if (workspaceRef.current) return` + `workspaceRef.current = null` in cleanup
- `Blockly.Events.disable()` / `enable()` wrapping programmatic workspace load
- Side-effect import of block module: `import '../src/blocks/greet'`

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Lab 01: Write a Greet Block](../labs/lab-01-write-a-greet-block.md)
- [Back to Index](../index.md)
