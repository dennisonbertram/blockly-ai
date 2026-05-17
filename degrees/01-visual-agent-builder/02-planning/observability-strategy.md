# Observability Strategy — Visual Agent Builder

Observability covers two planes: the **degree-building plane** (what gets logged as the POCs are built) and the **runtime plane** (what gets logged when the capstone executes). Both are specified here.

---

## Log Structure: Degree-Building Plane

All logs live under `degrees/01-visual-agent-builder/04-logs/`. Each POC has its own subdirectory.

```
04-logs/
  command-log.md        # top-level: POC-agnostic setup commands
  error-log.md          # top-level: shared errors
  decision-log.md       # top-level: architecture decisions
  l1-blockly-hello/
    command-log.md
    error-log.md
    decision-log.md
    coverage/           # vitest coverage reports
  l2-single-generate-text-block/
    command-log.md
    error-log.md
    decision-log.md
    coverage/
  l3-tool-and-object-blocks/
    ...
  l4-multi-step-agent-and-stream/
    ...
  l5-deploy-to-vercel/
    ...
  capstone/
    command-log.md
    error-log.md
    decision-log.md
    acceptance-results.md
    coverage/
```

### command-log.md

Every terminal command run during a POC is logged here. Format:

```markdown
## 2026-05-17 — L1 Setup

```bash
npm create vite@latest l1-blockly-hello -- --template react-ts
cd l1-blockly-hello
npm install blockly@12.5.1
npm install -D vitest @vitest/coverage-v8 playwright
```

**Result:** Success. Bundle size: 287KB gzipped (blockly/core + blockly/javascript + blockly/blocks).
```

Log: install commands, build commands, test runs, deploy commands, and their exit codes.

### error-log.md

Every error encountered during a POC is logged with: symptom, stack trace (truncated), cause identified, fix applied, and the research reference that predicted or explained the error.

Format:
```markdown
## E-L1-001: Vite default export error on Blockly import

**Symptom:** `SyntaxError: The requested module 'blockly/javascript' does not provide an export named 'default'`
**Context:** Running `npm run dev` in L1 for the first time.
**Cause:** Blockly's .mjs wrappers around UMD bundles; Vite's native ESM handling conflicts.
**Fix:** Added `optimizeDeps.include: ['blockly', 'blockly/core', 'blockly/blocks', 'blockly/javascript']` to vite.config.ts.
**Research reference:** `01-research/blockly/known-failure-modes.md` §10.
**Risk register:** R8 (Vite bundler quirks).
```

### decision-log.md

Architecture, design, or approach decisions made during a POC. Format:

```markdown
## D-L2-001: Async wrapper via finish() override

**Decision:** Override `finish()` in a custom `AsyncJavascriptGenerator` subclass to wrap generated code in `(async () => { ... })()`. Helper functions from `provideFunction_` appear INSIDE the IIFE (called from `super.finish(code)` which prepends them to the code string before the wrapper is applied).

**Alternatives considered:**
1. Generate `.then()` chains instead of `await` — rejected because the resulting code is harder to read and maintain.
2. Wrap at execution time (not codegen time) — rejected because the generated code would appear syntactically invalid in the preview panel.

**Evidence:** Validated in L2 acceptance test. `provideFunction_` helper appears correctly inside IIFE. See `01-research/blockly/code-generation.md` (Handling Async Code Generation).

**Risk:** R2 (async codegen fragile) — RESOLVED by this test.
```

---

## Runtime Plane: AI SDK Telemetry

### `experimental_telemetry` (enabled in dev and staging)

Per `01-research/vercel-ai-sdk/observability-and-errors.md`, the AI SDK wraps OpenTelemetry via `experimental_telemetry`. Enable it for all `generateText`/`streamText` calls in the POC server (not in generated code — in the executor).

```typescript
// In the executor (server-side), wrap every AI SDK call with telemetry:
const result = await generateText({
  model,
  prompt,
  experimental_telemetry: {
    isEnabled: process.env.NODE_ENV !== 'test',  // disable in unit tests for noise reduction
    functionId: `blockly-run-${workspaceHash}`,
    metadata: {
      workspaceHash,
      codegenVersion: CODEGEN_VERSION,
      sdkVersion: AI_SDK_VERSION,
      provider: modelId.split('/')[0],
    },
    recordInputs: true,
    recordOutputs: true,
  },
});
```

**Spans emitted per call:**
- `ai.generateText` — top-level span
- `ai.generateText.doGenerate` — one per step in the loop
- `ai.toolCall` — one per tool invocation

These spans appear in any connected OTel backend (Vercel's built-in tracing, or a local Jaeger/Zipkin instance during development).

### Lifecycle Callbacks (No OTel required)

For quick local visibility without an OTel setup:

```typescript
onStepFinish: ({ steps, toolResults, text, usage }) => {
  console.log(`[STEP ${steps.length}] ${usage.outputTokens} output tokens`);
  if (toolResults.length) {
    toolResults.forEach(r =>
      console.log(`  [TOOL] ${r.toolName}(${JSON.stringify(r.input)}) → ${JSON.stringify(r.result).slice(0, 100)}`)
    );
  }
},
onFinish: ({ text, totalUsage, steps, finishReason }) => {
  console.log(`[DONE] steps=${steps.length} reason=${finishReason} totalIn=${totalUsage.inputTokens} totalOut=${totalUsage.outputTokens}`);
},
```

---

## OpenTelemetry via @vercel/otel (Production Capstone)

For the deployed capstone, enable production-grade OpenTelemetry via `@vercel/otel`:

```typescript
// instrumentation.ts (Next.js 15 instrumentation hook)
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'blockly-ai-capstone' });
}
```

This provides:
- Automatic trace propagation through Next.js route handlers.
- AI SDK span data appears in Vercel's observability dashboard.
- Token counts, latencies, and finish reasons are visible per request.

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/telemetry` — `@vercel/otel` is the recommended integration for Vercel deployments.

---

## Tool-Call Logging

Every tool invocation is logged with: tool name, sanitized args, duration, and result type. "Sanitized" means: string values are truncated at 100 chars; no raw URL contents; no user PII.

```typescript
experimental_telemetry: {
  isEnabled: true,
  integrations: [{
    onToolCallStart: ({ toolCall }) => {
      const sanitizedInput = sanitizeForLog(toolCall.input);
      console.log(`[TOOL_START] id=${toolCall.toolCallId} name=${toolCall.toolName} input=${JSON.stringify(sanitizedInput)}`);
      // Attach timestamp for duration calculation in onToolCallFinish:
      (toolCall as Record<string, unknown>)['_startMs'] = Date.now();
    },
    onToolCallFinish: ({ toolCall, result }) => {
      const durationMs = Date.now() - ((toolCall as Record<string, unknown>)['_startMs'] as number ?? Date.now());
      const resultType = result !== null && typeof result === 'object' ? 'object' : typeof result;
      console.log(`[TOOL_DONE] id=${toolCall.toolCallId} name=${toolCall.toolName} durationMs=${durationMs} resultType=${resultType}`);
    },
  }],
},

function sanitizeForLog(input: unknown): unknown {
  if (typeof input === 'string') return input.slice(0, 100);
  if (Array.isArray(input)) return input.map(sanitizeForLog);
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, sanitizeForLog(v)])
    );
  }
  return input;
}
```

---

## Cost Tracking

### Per-Run Token Logging

After every `generateText` or `streamText` call in the executor, log `result.totalUsage`:

```typescript
// After generateText completes:
const usage = result.totalUsage;
console.log(JSON.stringify({
  event: 'agent_run_complete',
  workspaceHash,
  provider: modelId.split('/')[0],
  model: modelId,
  steps: result.steps.length,
  inputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  finishReason: result.finishReason,
  timestamp: new Date().toISOString(),
}));
```

**Critical:** Use `result.totalUsage` (all steps summed), NOT `result.usage` (last step only). Per `01-research/vercel-ai-sdk/known-failure-modes.md` §6.

### Session Budget Cap

In the executor, accumulate token usage across a session. If a single session exceeds a hard cap, abort:

```typescript
const SESSION_TOKEN_BUDGET = 50_000;  // input tokens per session

let sessionTokens = 0;

// Before each generateText call:
if (sessionTokens > SESSION_TOKEN_BUDGET) {
  throw new Error(`Session token budget exceeded (${sessionTokens} input tokens). Reset the session to continue.`);
}

// After each call:
sessionTokens += result.totalUsage.inputTokens;
```

Session state is reset on each page load (browser-side session, not persisted).

### Cost Logging to `04-logs/capstone/acceptance-results.md`

For each acceptance test run of the capstone, record:

```markdown
## Acceptance Run — 2026-05-17

**Query:** "Summarize transformer attention mechanisms"
**Provider:** anthropic/claude-haiku-4-5
**Steps:** 4
**Input tokens:** 8,241
**Output tokens:** 612
**Duration:** 18.4s
**Result:** schema-valid ResearchSummary, keyFindings.length=5, confidenceScore=0.82
```

---

## Error Categorization

All errors surfaced in the executor are categorized before being returned to the browser. This prevents raw provider error messages (which may contain sensitive internal details) from reaching the client.

```typescript
type ErrorCategory =
  | 'rate-limited'      // HTTP 429
  | 'context-length'    // HTTP 400 with context_length_exceeded
  | 'invalid-output'    // NoObjectGeneratedError, TypeValidationError
  | 'tool-exec-failure' // Error thrown inside a tool's execute()
  | 'timeout'           // Request exceeded timeout
  | 'unknown';          // Anything else

function categorizeError(err: unknown): { category: ErrorCategory; message: string } {
  if (APICallError.isInstance(err)) {
    if (err.statusCode === 429) return { category: 'rate-limited', message: 'Rate limit exceeded. Wait a moment and try again.' };
    if (err.statusCode === 400) {
      const body = JSON.parse(err.responseBody ?? '{}');
      if (body?.error?.code === 'context_length_exceeded') {
        return { category: 'context-length', message: 'The program is too large for this model context. Reduce the number of agent steps or shorten prompts.' };
      }
    }
  }
  if (NoObjectGeneratedError.isInstance(err)) {
    return { category: 'invalid-output', message: `The model did not produce valid structured output. Raw: ${(err as NoObjectGeneratedError).text?.slice(0, 200)}` };
  }
  if (TypeValidationError.isInstance(err)) {
    return { category: 'invalid-output', message: 'The model output did not match the expected schema.' };
  }
  // Tool execution failures are thrown from execute(); they appear as the error property of a tool result
  return { category: 'unknown', message: 'An unexpected error occurred.' };
}
```

Per `01-research/vercel-ai-sdk/observability-and-errors.md` — error classes, their properties, and trigger conditions.

---

## Generated-Code Provenance

Every program executed by the server is tagged with a provenance record. This lets the observability layer trace which workspace state produced which execution, which AI SDK version was in use, and which codegen logic version was applied.

### Provenance Record Shape

```typescript
interface ProvenanceRecord {
  workspaceHash: string;    // SHA-256 of workspace JSON (canonical key-sorted JSON)
  codegenVersion: string;   // semver of the codegen package (e.g., "1.0.0-l2")
  sdkVersion: string;       // ai@6.0.184
  blocklyVersion: string;   // blockly@12.5.1
  timestamp: string;        // ISO 8601
  provider: string;         // "anthropic" | "openai"
  model: string;            // "claude-haiku-4-5" | "gpt-4o-mini"
}
```

### Workspace State Hashing

```typescript
async function hashWorkspaceState(workspaceJson: object): Promise<string> {
  // Stable serialization: sort keys at all levels
  const stableJson = JSON.stringify(sortObjectKeys(workspaceJson));
  const encoder = new TextEncoder();
  const data = encoder.encode(stableJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortObjectKeys(v)])
    );
  }
  return obj;
}
```

The hash is logged alongside every `agent_run_complete` event and included in `experimental_telemetry.metadata.workspaceHash`.

---

## Streaming UI Progress Indicators

In the browser output pane, show real-time progress during execution:

### Events to Surface

| Event | UI Action |
|---|---|
| POST sent to `/api/run` | Show spinner: "Running program..." |
| First text delta received | Hide spinner; begin appending text to output pane |
| Tool-call chunk in `fullStream` | Show tool badge: "Calling getWeather..." |
| Tool-result chunk in `fullStream` | Update tool badge: "getWeather: done" |
| `finish-reason: stop` chunk | Show "Complete" badge; stop appending |
| HTTP error (4xx/5xx) | Show categorized error message from `categorizeError()` |
| Stream error chunk | Same as HTTP error |

### Implementation Pattern (using `fullStream`)

```typescript
// Browser-side output pane logic:
const response = await fetch('/api/run', { method: 'POST', body: JSON.stringify({ source, workspaceHash }) });

if (!response.ok) {
  const err = await response.json();
  setError(err.message);
  return;
}

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Parse SSE chunks from toUIMessageStreamResponse():
  const lines = chunk.split('\n').filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.type === 'text-delta') appendText(data.text);
      if (data.type === 'tool-call') showToolBadge(data.toolName, 'calling');
      if (data.type === 'tool-result') updateToolBadge(data.toolName, 'done');
      if (data.type === 'finish') setStatus('complete');
    }
  }
}
```

**Note:** The exact SSE format emitted by `toUIMessageStreamResponse()` may vary from the above pseudocode. Validate the actual chunk format during L4 implementation and update this pattern in `05-distillation/patterns.md`.

---

## Observability Checklist (Per POC)

Before each POC is marked done, verify:

- [ ] All commands logged to `04-logs/<level>/command-log.md`.
- [ ] All errors encountered logged to `04-logs/<level>/error-log.md` with root cause and fix.
- [ ] Any architecture decision logged to `04-logs/<level>/decision-log.md`.
- [ ] Coverage report generated and committed to `04-logs/<level>/coverage/`.
- [ ] For L4+: `totalUsage` logging is present in the executor.
- [ ] For L4+: tool-call log entries appear in the server console during the acceptance test.
- [ ] For capstone: `acceptance-results.md` populated with token counts and durations.
- [ ] For capstone: `@vercel/otel` instrumentation is active and traces appear in Vercel dashboard.
