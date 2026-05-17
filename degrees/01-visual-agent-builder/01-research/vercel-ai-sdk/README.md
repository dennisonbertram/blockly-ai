# Vercel AI SDK — Research Slice Index

**Pinned versions (as of 2026-05-16):**
- `ai`: 6.0.184 (stable/latest)
- `@ai-sdk/anthropic`: 3.0.78
- `@ai-sdk/openai`: 3.0.75 (note: package version ≠ API spec version)
- `@ai-sdk/google`: 2.x (see capability-map)
- Node.js: >= 18 required
- Zod peer dep: `^3.25.76 || ^4.1.8`

**CRITICAL — SDK is at v6, NOT v4 or v5.** Most tutorials online target v3/v4. All artifacts here reflect v6 stable.

## Files in this slice

| File | One-line summary |
|------|-----------------|
| `capability-map.md` | What the SDK can/cannot do; Core vs UI; all major exports |
| `mental-model.md` | How to think about models, tools, steps, and streaming as abstractions |
| `version-and-current-api.md` | **CRITICAL** — version pins, old-to-new API name mapping, do/don't table |
| `setup-and-installation.md` | Package install, env vars, TypeScript config, minimal working example |
| `generate-text-and-stream-text.md` | Full signatures, streaming iteration, Next.js response helpers |
| `tool-calling.md` | tool() helper, tools param, multi-step flow, weather tool example |
| `generate-object.md` | Structured output via Output.object/array/choice, errors, streaming |
| `multi-step-agents.md` | stopWhen, isStepCount, ToolLoopAgent, agent loop examples |
| `provider-abstraction.md` | Swapping providers, AI Gateway, providerOptions, incompatibilities |
| `nextjs-integration.md` | App Router route handlers, UIMessage, convertToModelMessages, useChat |
| `testing-model.md` | MockLanguageModelV3, test utilities from ai/test, assertion patterns |
| `observability-and-errors.md` | experimental_telemetry, OpenTelemetry spans, error classes |
| `security-model.md` | API key hygiene, prompt injection, tool sandboxing, rate limiting |
| `pricing-and-quotas.md` | Current token prices for Anthropic and OpenAI models (snapshot) |
| `known-failure-modes.md` | 12 gotchas: stale APIs, tool description quality, streaming pitfalls |
| `open-questions.md` | Unresolved items for POC validation |
