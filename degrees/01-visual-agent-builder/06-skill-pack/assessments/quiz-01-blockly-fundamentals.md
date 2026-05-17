# Quiz 01 — Blockly Fundamentals

**Covers:** Lessons 01 and 02, Labs 01

---

## Questions

**Q1.** What does a Blockly expression generator function return, and how does it differ from a statement generator?

<details>
<summary>Answer</summary>

An expression generator returns a **tuple** `[code, Order]` where `Order` is an `Order` constant from `blockly/javascript` indicating the expression's precedence. A statement generator returns a plain `string` (the statement code ending with `\n`). Returning a plain string from an expression generator causes the block to be silently ignored by parent blocks.

</details>

---

**Q2.** What are the two conditions that BOTH must be true for the React Strict Mode double-mount guard to work?

<details>
<summary>Answer</summary>

1. Early return in `useEffect` if `workspaceRef.current` is already non-null (prevents second inject).
2. Set `workspaceRef.current = null` in the cleanup function BEFORE calling `workspace.dispose()` (so the second mount sees null and runs the inject).

Missing either one breaks the guard.

</details>

---

**Q3.** Why must `Blockly.Events.disable()` / `Blockly.Events.enable()` wrap programmatic workspace loads in tests?

<details>
<summary>Answer</summary>

Loading a workspace programmatically fires change events that can trigger listeners assuming the workspace is in a post-user-edit state. In tests, this causes spurious listener calls, test interference, or infinite loops. Disabling events during load suppresses these.

</details>

---

**Q4.** A test logs "Block type 'ai_greet' not defined". What is the most likely cause?

<details>
<summary>Answer</summary>

The block module was not imported for side effects in the test file. Blockly's block registry is a module-level singleton. Adding `import '../src/blocks/greet'` at the top of the test file registers the block.

</details>

---

**Q5.** In Next.js 15 App Router, what happens if you call `next/dynamic({ ssr: false })` from a Server Component (no `'use client'`)?

<details>
<summary>Answer</summary>

The build fails with: `Error: ssr: false is not allowed with next/dynamic in Server Components. Please move it into a client component.`

The file calling `next/dynamic` must have `'use client'` at the top. This is a Next.js 15 change from earlier App Router versions.

</details>

---

## Links

- [Lesson 01: Mount Blockly Safely](../lessons/01-mount-blockly-safely.md)
- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Back to Index](../index.md)
