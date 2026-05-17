# Lab 03 — Extend the Capstone Schema: Add a `tags` Field

**Goal:** Add a `tags: z.array(z.string())` field to the `ResearchSummary` schema in the capstone and verify the change end-to-end.

**Prerequisites:** [Lesson 06](../lessons/06-the-capstone-research-agent.md)

**Time estimate:** 20–30 minutes

---

## Specification

Extend the existing schema:

```ts
// Before
z.object({
  title: z.string(),
  keyFindings: z.array(z.string()),
  confidenceScore: z.number(),
  limitations: z.string(),
  suggestedNextSteps: z.array(z.string()),
})

// After — add tags field
z.object({
  title: z.string(),
  keyFindings: z.array(z.string()),
  confidenceScore: z.number(),
  limitations: z.string(),
  suggestedNextSteps: z.array(z.string()),
  tags: z.array(z.string()),   // new
})
```

---

## Steps

### Step 1 — Update the workspace fixture

In the capstone workspace JSON (`test/fixtures/research-summary.json` or equivalent), add a new `ai_zod_field` block for `tags` with type `z.array(z.string())` to the schema's `ZodObject` block.

Or, if working in the live editor:
1. Open the workspace in the browser.
2. Find the `ZodObject` block inside the `GenerateObject` block.
3. Add a new `ZodField` block: name = `tags`, type = `ZodArray` containing `ZodString`.

### Step 2 — Update the golden-output snapshot

After modifying the fixture, the snapshot will fail. Review the diff — confirm the only change is the addition of `tags: z.array(z.string())`. Update:

```bash
pnpm test -u   # update snapshots
```

**Review the diff before committing.** The snapshot diff is the audit trail.

### Step 3 — Update the mock return value

In the execution test, add `tags` to the mock response:

```ts
const mockModel = new MockLanguageModelV3({
  doGenerate: mockValues({
    content: [{ type: 'text', text: JSON.stringify({
      title: 'Transformers',
      keyFindings: ['Finding 1'],
      confidenceScore: 0.8,
      limitations: 'Limited data',
      suggestedNextSteps: ['Further research'],
      tags: ['AI', 'transformers'],   // new
    }) }],
    finishReason: { unified: 'stop' },
    usage: { inputTokens: { total: 100 }, outputTokens: { total: 50 } },
  }),
})
```

### Step 4 — Write a new assertion

```ts
expect(output.tags).toEqual(['AI', 'transformers'])
expect(output.tags).toHaveLength(2)
```

### Step 5 — Verify the live demo (optional)

If running with a real Anthropic key:
1. Reload the updated workspace in the browser.
2. Run the program with query "Summarize transformer attention mechanisms".
3. Verify the output JSON includes a `tags` array.

---

## Acceptance Criteria

- [ ] `workspaceToCode` emits `tags: z.array(z.string())` in the schema.
- [ ] The snapshot diff shows only the `tags` addition — nothing else changed.
- [ ] The mock execution test passes with `output.tags` validated.
- [ ] `pnpm test` is fully green.

---

## Hints

- The `ZodArray` block emits `z.array(innerType)`. The inner type is connected as a value input.
- If the snapshot update looks wrong (more lines changed than expected), check whether any other block definition or code path was accidentally modified.
- OpenAI strict mode compatibility: `z.array(z.string())` does not use `.optional()`, so no `.nullable()` concern here.

---

## Links

- [Lesson 06: The Capstone Research Agent](../lessons/06-the-capstone-research-agent.md)
- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
- [Troubleshooting: Generated Code Throws TypeError](../troubleshooting/symptom-generated-code-throws-typeerror.md)
