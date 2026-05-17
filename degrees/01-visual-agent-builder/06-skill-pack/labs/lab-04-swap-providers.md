# Lab 04 — Swap Providers: Anthropic to OpenAI and Back

**Goal:** Change the Model block from `anthropic / claude-haiku-4-5` to `openai / gpt-4o-mini` and verify equivalent output.

**Prerequisites:** [Lesson 03](../lessons/03-tools-and-structured-output.md), [Lesson 05](../lessons/05-deploy-to-vercel.md)

**Time estimate:** 15–25 minutes

---

## Why This Matters

The visual builder supports multiple providers through the same block library. A user should be able to change the Model block dropdown and get equivalent behavior. Provider parity issues (like the `.optional()` / `.nullable()` difference) must be discovered and handled.

---

## Steps

### Step 1 — Change the workspace fixture

In the `generate-text-basic.json` (or equivalent) fixture, find the `ai_model` block. Change:
- `PROVIDER` field: `openai`
- `NAME` field: `gpt-4o-mini`

Save the updated fixture.

### Step 2 — Observe the snapshot diff

Run `pnpm test`. The snapshot should fail because the emitted code changed from:
```ts
model: (__model_provider ?? anthropic('claude-haiku-4-5'))
```
to:
```ts
model: (__model_provider ?? openai('gpt-4o-mini'))
```

Review the diff. If this is the only change, update the snapshot:

```bash
pnpm test -u
```

### Step 3 — Verify the import header changed

The `buildImportHeader` function detects `anthropic(` vs `openai(` in the body and emits the appropriate import:

```ts
// Before (Anthropic)
import { anthropic } from '@ai-sdk/anthropic';

// After (OpenAI)
import { openai } from '@ai-sdk/openai';
```

Confirm the updated snapshot shows `@ai-sdk/openai` (not both, not neither).

### Step 4 — Run a live provider test (optional, requires API keys)

If you have both `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` set:

```bash
# Test Anthropic version
ANTHROPIC_API_KEY=... pnpm test

# Change fixture to OpenAI, then
OPENAI_API_KEY=... pnpm test
```

For the `RUN_LIVE_MODEL_TESTS=1` gate:
```bash
RUN_LIVE_MODEL_TESTS=1 ANTHROPIC_API_KEY=... OPENAI_API_KEY=... pnpm test
```

### Step 5 — Check for `.optional()` incompatibility

If the program uses a `GenerateObject` block with structured output, and any ZodField has the nullable checkbox checked:
- With Anthropic: works (`.nullable()` is accepted).
- With OpenAI: also works (`.nullable()` is supported in strict mode).

If you accidentally used `.optional()` somewhere:
- With Anthropic: may work.
- With OpenAI: throws `AI_NoObjectGeneratedError`.

The ZodField block's optional checkbox emits `.nullable()` by default — verify this in the emitted code.

### Step 6 — Swap back to Anthropic

Change the fixture back to `anthropic / claude-haiku-4-5` and update the snapshot again. The round-trip should leave all tests green.

---

## Acceptance Criteria

- [ ] Provider swap from Anthropic to OpenAI produces only the expected import/model changes in the snapshot diff.
- [ ] All tests pass with OpenAI fixture.
- [ ] Swap back to Anthropic — all tests pass again.
- [ ] No `.optional()` appears in any structured output schema (use `.nullable()` instead).

---

## Hints

- If the snapshot diff shows more than just the model/import lines changed, an unrelated block definition was probably modified. Revert and check.
- The `OPENAI_API_KEY` env var is automatically read by `openai('gpt-4o-mini')` — no explicit `apiKey` option needed.
- `@ai-sdk/openai@3.0.64` is the correct pin — `3.0.75` does not exist on npm.

---

## Links

- [Reference: Package Pins](../reference/package-pins.md)
- [Anti-pattern: `.optional()` with OpenAI strict mode](../lessons/03-tools-and-structured-output.md#nullable-vs-optional--the-openai-strict-mode-trap)
- [Lesson 00: TDD Discipline](../lessons/00-tdd-discipline.md)
