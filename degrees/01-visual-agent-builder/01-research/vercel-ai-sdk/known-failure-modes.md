# Known Failure Modes — Top Gotchas

## 1. Using `parameters` Instead of `inputSchema` in `tool()`

**Symptom:** TypeScript type error, or `execute` receives `any` typed args instead of typed args. At runtime, tool may silently fail validation.

**Cause:** v3/v4 used `parameters: z.object({...})`. v5/v6 renamed to `inputSchema`.

**Fix:** Replace `parameters` with `inputSchema` everywhere:
```ts
// WRONG (v4):
tool({ description: '...', parameters: z.object({ city: z.string() }), execute })
// RIGHT (v6):
tool({ description: '...', inputSchema: z.object({ city: z.string() }), execute })
```

**Evidence:** All v6 SDK docs and `examples/next-agent/tool/weather-tool.ts` use `inputSchema`.

---

## 2. Using `maxSteps: N` Instead of `stopWhen: stepCountIs(N)`

**Symptom:** TypeScript error `Property 'maxSteps' does not exist on type ...`. Or: agent only does one step.

**Cause:** `maxSteps` was removed in v5. Migration path was `maxSteps` → `continueUntil` → `stopWhen: stepCountIs(N)`.

**Fix:**
```ts
// WRONG:
generateText({ ..., maxSteps: 5 })
// RIGHT:
import { stepCountIs } from 'ai';
generateText({ ..., stopWhen: stepCountIs(5) })
```

**Evidence:** CHANGELOG v5.0.0: "rename continueUntil to stopWhen. Rename maxSteps stop condition to stepCountIs."

---

## 3. Tool Description Too Vague — Model Doesn't Call the Tool

**Symptom:** Agent returns a guess instead of calling the tool. Or calls the wrong tool. Or calls no tool and says "I don't have access to that information."

**Cause:** The model uses the `description` field to decide WHEN to call a tool. Vague descriptions ("do stuff", "helper function") don't help.

**Fix:**
```ts
// VAGUE (model may not call it):
description: 'Weather information'

// SPECIFIC (model knows exactly when to call):
description: 'Get the current real-time weather conditions for a city, including temperature in Fahrenheit, wind speed, and precipitation. Use this when the user asks about weather, temperature, or climate for a specific location.'
```

Also: Use `.describe()` on Zod fields, set `temperature: 0`, and verify with `result.toolCalls` to confirm the model called it.

---

## 4. generateObject / streamObject Still Called (Deprecated)

**Symptom:** TypeScript deprecation warning. Future breakage risk when removed.

**Cause:** v6 deprecated `generateObject`/`streamObject` in favor of `generateText({ output: Output.object({...}) })`.

**Fix:** Migrate to `Output.*` pattern. See `generate-object.md`. Both still function in v6 but are maintained minimally.

---

## 5. toDataStreamResponse() Not Found

**Symptom:** `TypeError: result.toDataStreamResponse is not a function`

**Cause:** v4/v5 tutorials use `toDataStreamResponse()`. This was renamed to `toUIMessageStreamResponse()` in v5/v6.

**Fix:**
```ts
// WRONG (v4/v5):
return result.toDataStreamResponse()
// RIGHT (v6):
return result.toUIMessageStreamResponse()
```

---

## 6. Double-Counting Tokens in Multi-Step Agents

**Symptom:** Token usage tracking shows much higher numbers than expected.

**Cause:** Using `result.usage` (last step only) instead of `result.totalUsage` (all steps summed). Also: each step sends the FULL growing conversation history as input, so input tokens compound.

**Fix:**
```ts
// WRONG: only counts last step's tokens
const tokens = result.usage.inputTokens + result.usage.outputTokens;

// RIGHT: counts all steps
const tokens = result.totalUsage.inputTokens + result.totalUsage.outputTokens;
```

For budget tracking in production, use `result.totalUsage`.

---

## 7. Infinite Agent Loop (stopWhen Not Set)

**Symptom:** Agent runs for many steps, billing accumulates, eventually hits rate limit or timeout.

**Cause:** `stopWhen` not set. Default is `isLoopFinished()` (never stops artificially). If the model keeps emitting tool calls (due to unclear stop condition or tool design), the loop never terminates naturally.

**Fix:** Always set a conservative `stopWhen: stepCountIs(N)`. For simple tools: N=3-5. For complex agents: N=10-15. For exploratory: N=20 max.

```ts
// RISKY (no cap):
generateText({ model, tools, prompt })
// SAFE:
generateText({ model, tools, stopWhen: stepCountIs(5), prompt })
```

---

## 8. useChat on Server Side (React Hook in Server Component)

**Symptom:** `Error: React hooks can only be called inside function components.` Or: hook doesn't update UI.

**Cause:** `useChat` from `@ai-sdk/react` is a React hook. React hooks cannot be used in Server Components, route handlers, or Node.js scripts.

**Fix:** `useChat` belongs in Client Components only (`'use client'` directive). Route handlers use `streamText`, not hooks.

---

## 9. Streaming Errors Silently Dropped

**Symptom:** Streaming appears to stop or produce incomplete output; no error in console.

**Cause:** When iterating `textStream` (not `fullStream`), stream errors are thrown. But if consuming `fullStream`, errors come as `{ type: 'error' }` chunks — NOT exceptions. If you don't check chunk types, errors pass silently.

**Fix:**
```ts
// For textStream:
try {
  for await (const chunk of result.textStream) { /* ... */ }
} catch (error) {
  console.error('Stream error:', error);
}

// For fullStream — MUST handle error chunks:
for await (const part of result.fullStream) {
  if (part.type === 'error') {
    console.error('Stream error:', part.error);
    break;
  }
  // ... handle other types
}
```

Also: use `onError` callback on `streamText` as a safety net.

---

## 10. generateObject Throws on Optional Fields with OpenAI Strict Mode

**Symptom:** `AI_NoObjectGeneratedError` when using OpenAI models with schemas containing `.optional()` fields.

**Cause:** OpenAI's structured output "strict mode" doesn't support optional fields (only `nullable`).

**Fix:**
```ts
// FAILS with OpenAI strict mode:
z.object({ middleName: z.string().optional() })

// WORKS:
z.object({ middleName: z.string().nullable() })
```

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/prompt-engineering` — "Optional fields can fail with strict schema validation. Use .nullable() over .optional() for OpenAI strict mode."

---

## 11. Messages Not Converted from UIMessage to ModelMessage

**Symptom:** `AI_InvalidPromptError` or model receives malformed messages. Or: tool call history lost between route handler calls.

**Cause:** v5+ requires explicit conversion. `UIMessage` (client format with `parts` array) must be converted to `ModelMessage` (provider format) before passing to `generateText`/`streamText`.

**Fix:**
```ts
import { convertToModelMessages } from 'ai';

// In route handler:
const { messages } = await req.json(); // UIMessage[]
const result = streamText({
  model,
  messages: await convertToModelMessages(messages),  // ModelMessage[]
});
```

---

## 12. CoreMessage Import Not Found

**Symptom:** TypeScript error `Module 'ai' has no exported member 'CoreMessage'`.

**Cause:** `CoreMessage` was renamed to `ModelMessage` in v5. Old tutorials, blog posts, and some older type definitions still reference `CoreMessage`.

**Fix:**
```ts
// WRONG (v4):
import type { CoreMessage } from 'ai';
// RIGHT (v6):
import type { ModelMessage } from 'ai';
```
