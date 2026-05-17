# Anti-pattern: `.optional()` in Zod schemas used with OpenAI strict structured output

**Category:** anti-pattern — Vercel AI SDK + OpenAI provider parity

## Why it's tempting

Zod's `.optional()` reads exactly like what you want: "this field is optional." It's also the canonical way to mark optional fields in Zod schemas — the OpenAPI mapping, the form-validation mapping, everything assumes `.optional()`.

## Why it fails

OpenAI's structured-output "strict mode" — used by `generateText({ output: Output.object({ schema }) })` when the model is an OpenAI model — does not support optional fields. Its grammar requires every property to be present in the output. If your schema has `z.object({ middleName: z.string().optional() })`, OpenAI throws `AI_NoObjectGeneratedError` with a schema-validation message.

Anthropic models do not have this restriction. So a schema that "works" against an Anthropic model breaks the moment a user switches the Model block to OpenAI. Same visual program, opposite behavior. That's the worst kind of bug for a visual builder.

## What to do instead — default to `.nullable()`

```ts
// AVOID
z.object({ middleName: z.string().optional() })

// PREFER (for any schema used with structured output + OpenAI strict)
z.object({ middleName: z.string().nullable() })
```

Semantically these are different:
- `.optional()` allows the key to be missing entirely.
- `.nullable()` requires the key to be present with value `null`.

Code that consumes the result must handle `null`, not check for missing keys. This is a contract the visual builder enforces by labeling the field-optional checkbox "nullable" (not "optional").

The L3 `ai_zod_field` block emits `.nullable()` whenever the "nullable" checkbox is checked. The L3 regression `RT-007` permanently locks this.

## Evidence

- `01-research/vercel-ai-sdk/known-failure-modes.md` lines 161-176 (item 10): "OpenAI's structured output 'strict mode' doesn't support optional fields (only `nullable`). Fix: use `.nullable()` over `.optional()`. Evidence: `ai-sdk.dev/docs/ai-sdk-core/prompt-engineering`."
- `01-research/known-failure-modes.md` line 26: synthesis "OpenAI strict mode + `.optional()` in Zod schema. Symptom: structured output fails. Fix: use `.nullable()` for OpenAI strict mode."
- `02-planning/risk-register.md` lines 147-160 (R9 "Provider Parity"): full mitigation including "The `ZodObject` schema blocks default to `.nullable()` … 'Use nullable fields for OpenAI strict mode compatibility.'"
- `04-logs/decision-log.md` lines 92-99 (L3 decision ".nullable() over .optional() for ZodField"): "OpenAI's strict structured output mode fails schema validation when fields use `.optional()`. Since the primary use case for GenerateObject is OpenAI/Anthropic structured output, `.nullable()` is the safer default."
- `03-pocs/L3-tool-and-object-blocks/README.md` line 38: "`.nullable()` (not `.optional()`) — OpenAI strict mode compatibility."

## Related

- [`gotchas/generate-object-output-accessor.md`](../gotchas/generate-object-output-accessor.md)
