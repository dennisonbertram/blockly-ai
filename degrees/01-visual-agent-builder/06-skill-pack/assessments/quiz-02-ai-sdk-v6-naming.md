# Quiz 02 — AI SDK v6 Naming

**Covers:** Lessons 02, 03, 04 — The Old → New rename table

---

## Questions

**Q1.** A colleague writes `tool({ description: '...', parameters: z.object({...}), execute })`. What is wrong and what is correct?

<details>
<summary>Answer</summary>

`parameters:` is the v4 option name. In v6, the correct field is `inputSchema:`. The forbidden-name grep regression should catch `parameters:` and fail the test suite.

```ts
// Wrong (v4)
tool({ parameters: z.object({...}), ... })

// Correct (v6)
tool({ inputSchema: z.object({...}), ... })
```

</details>

---

**Q2.** Code reads `(await generateText({ output: Output.object({ schema }), ... })).object`. What will this return?

<details>
<summary>Answer</summary>

`undefined`. The accessor on the `generateText` result when using `Output.object` is `.output`, not `.object`. The `.object` accessor belonged to the now-deprecated `generateObject` function. The fix: use `result.output`.

</details>

---

**Q3.** An agent loop uses `stopWhen: maxSteps(5)`. What error will occur and what is the fix?

<details>
<summary>Answer</summary>

`maxSteps` does not exist in v6. It was removed in v5. The TypeError at runtime will be something like "maxSteps is not a function". The fix: `stopWhen: stepCountIs(5)`.

</details>

---

**Q4.** What is the difference in behavior between `stopWhen: stepCountIs(3)` and `stopWhen: hasToolCall('finalAnswer')`?

<details>
<summary>Answer</summary>

- `stepCountIs(3)`: stops after 3 complete steps. If step 3 is a tool call, step 4 (model using the tool result) still runs if 4 ≤ bound.
- `hasToolCall('finalAnswer')`: stops as soon as the model emits the `finalAnswer` tool call. The tool DOES execute, but the model is NOT called again to post-process the result. `result.text` will be `''`; the answer is in `result.toolResults`.

</details>

---

**Q5.** Code tracks token usage with `result.usage.inputTokens.total`. For a multi-step agent, this returns `NaN`. What is the correct accessor?

<details>
<summary>Answer</summary>

`result.totalUsage.inputTokens.total`. For multi-step agents, `result.usage` reflects only the last step's usage. `result.totalUsage` accumulates across all steps. Using `result.usage` on a multi-step run gives the last step's totals only, and if the last step's usage is not set, arithmetic produces `NaN`.

</details>

---

**Q6.** The v6 CHANGELOG says the stop condition function is `isStepCount`. When you `node -e "const {isStepCount}=require('ai'); console.log(isStepCount)"`, you get `undefined`. What is the actual export name?

<details>
<summary>Answer</summary>

`stepCountIs`. The CHANGELOG entry was written during development of v5→v6 and used the tentative name `isStepCount`. The published `ai@6.0.184` package exports `stepCountIs`. Always probe the installed package; the CHANGELOG is unreliable for exact names.

</details>

---

## Links

- [Lesson 03: Tools and Structured Output](../lessons/03-tools-and-structured-output.md)
- [Lesson 04: Multi-Step and Streaming](../lessons/04-multi-step-and-streaming.md)
- [Reference: v6 API Cheatsheet](../reference/v6-api-cheatsheet.md)
- [Back to Index](../index.md)
