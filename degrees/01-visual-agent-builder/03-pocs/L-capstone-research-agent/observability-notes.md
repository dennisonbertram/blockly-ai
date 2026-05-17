# Observability Notes — L-capstone

## Token Usage

The Agent block uses `stopWhen: stepCountIs(5)` to cap the maximum number of LLM calls.
The `result.totalUsage.inputTokens` is available post-run for cost logging.

With the stubbed tools (canned data, no real API calls), all test runs cost $0.

In production with a real Anthropic key, expected token usage per capstone run:
- Agent loop: ~500-2000 input tokens / 200-500 output tokens (3-5 steps)
- GenerateObject: ~300-800 input tokens / 100-300 output tokens

## Streaming

The `__sink` callback pattern streams output as it becomes available.
The `OutputSink("summary")` block streams the structured JSON object.
The `OutputSink("agent_result")` block streams the agent's final text response.

## Error Handling

- `No output generated` — the GenerateObject call received a non-JSON response (mock order wrong)
- `No object generated: could not parse the response` — similar; JSON parse failure
- Stack traces are stripped from all error responses (security)

## Test Coverage

43 tests in 7 test files. No integration with real APIs in default test run.
Mock models are used throughout via `MockLanguageModelV3`.
