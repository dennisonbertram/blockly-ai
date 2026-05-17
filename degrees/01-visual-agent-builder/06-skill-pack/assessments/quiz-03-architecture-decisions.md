# Quiz 03 — Architecture Decisions

**Covers:** Lessons 05, 06 — deployment, sandboxing, injection patterns

---

## Questions

**Q1.** Why must the Next.js route handler for the AI agent use `runtime = 'nodejs'` instead of `runtime = 'edge'`?

<details>
<summary>Answer</summary>

Vercel Edge runtime has a 25-second maximum function duration. A multi-step agent with 5 steps × ~8 seconds/step = ~40 seconds, which exceeds the cap. Node.js runtime allows 60 seconds on Hobby plan and up to 800 seconds on Pro. Also, Blockly uses Node.js APIs at runtime and cannot run in the Edge runtime.

</details>

---

**Q2.** The `runEmitted` function uses `new Function(argList, body)` to execute generated code. What security property does this provide?

<details>
<summary>Answer</summary>

Generated code (user-authored Blockly programs) cannot access `require`, `process`, `fs`, or any global not explicitly passed as an argument. The function receives only the SDK modules, a `sink` callback, and a `tools` map — nothing else. This prevents Blockly programs from reading environment variables, accessing the filesystem, or making arbitrary network calls.

</details>

---

**Q3.** Why does the `buildImportHeader` function use body-substring scanning to decide which imports to emit, rather than emitting all possible imports unconditionally?

<details>
<summary>Answer</summary>

Emitting all imports unconditionally would cause import errors for provider modules not installed (e.g., importing `openai` when only `@ai-sdk/anthropic` is installed). Body-scanning emits only the imports for providers and SDK functions that the generated code actually uses, keeping the import header minimal and correct.

</details>

---

**Q4.** Block modules must be imported at the module level in the route handler, not inside the `POST` function. What breaks if they are imported inside the handler?

<details>
<summary>Answer</summary>

Blockly's block registry is a module-level singleton. If imports are inside the handler:
- The block registry is empty when the first request arrives before the dynamic imports resolve.
- On subsequent requests, the blocks are re-registered (potentially causing duplicate registration warnings).
- In some configurations, the dynamic import inside an async handler never resolves before `workspaceToCode` runs, producing empty code.

Module-level imports ensure registration happens once at server startup.

</details>

---

**Q5.** When swapping the Model block from `anthropic / claude-haiku-4-5` to `openai / gpt-4o-mini`, what changes in the emitted code besides the model name?

<details>
<summary>Answer</summary>

The import header changes. `buildImportHeader` scans the body for `anthropic(` vs `openai(` and emits the appropriate provider import:

- Before: `import { anthropic } from '@ai-sdk/anthropic';`
- After: `import { openai } from '@ai-sdk/openai';`

The model expression also changes from `(__model_provider ?? anthropic('claude-haiku-4-5'))` to `(__model_provider ?? openai('gpt-4o-mini'))`.

</details>

---

**Q6.** A Zod field uses `.optional()` instead of `.nullable()` for an optional field. With Anthropic, tests pass. With OpenAI, the test throws `AI_NoObjectGeneratedError`. Why?

<details>
<summary>Answer</summary>

OpenAI's structured output strict mode requires schemas to use `.nullable()` for optional-ish fields. `.optional()` (which makes the field possibly `undefined`) is not supported in strict mode and causes the output parsing to fail. The Zod-field block should default to emitting `.nullable()` from its optional checkbox, not `.optional()`.

</details>

---

## Links

- [Lesson 05: Deploy to Vercel](../lessons/05-deploy-to-vercel.md)
- [Lesson 06: The Capstone Research Agent](../lessons/06-the-capstone-research-agent.md)
- [Reference: Run Signature](../reference/run-signature.md)
- [Back to Index](../index.md)
