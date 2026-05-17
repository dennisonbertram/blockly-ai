# Observability Notes — L2

## What is observable at L2

- Generated code is inspectable as a string (the `generate()` function returns it directly).
- `MockLanguageModelV3.doGenerateCalls[]` is the primary observability hook for verifying what the generated code passed to the language model.
- `__sink` callback provides runtime observability: the test captures all `(label, value)` pairs.

## What is NOT observable at L2

- No telemetry or tracing (`experimental_telemetry` not wired in generated code).
- No `onStepFinish` callback (no multi-step at L2).
- Token usage is available on `result` but not surfaced to the sink.

## Recommended additions for L3+

- Add `onFinish: (result) => __sink?.('__usage', result.usage)` to the generated code so token usage flows to the sink automatically.
- Add `experimental_telemetry: { isEnabled: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT }` so telemetry is opt-in via environment variable.
