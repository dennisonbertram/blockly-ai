# Pattern: Probe the installed SDK with `node -e` before trusting any doc

**Category:** pattern — research-vs-reality verification

## Problem it solves

Research documents, blog posts, task contracts, and even the SDK's own CHANGELOG can lie about the exact shape of the API in the version you have installed. Examples from this degree:

- CHANGELOG promised `isStepCount`. Installed `ai@6.0.184` exports `stepCountIs`.
- Research doc promised `result.object`. Reality: `result.output`.
- Research doc promised `finishReason: 'stop'`. Reality: `finishReason: { unified: 'stop' }`.
- Research doc promised `usage: { inputTokens: 10 }`. Reality: `usage: { inputTokens: { total: 10, ... } }`.
- Research doc promised `mockValues([...])`. Reality: `mockValues(...spread)`.
- Task contract promised `@ai-sdk/openai@3.0.75`. Reality: latest is `3.0.64`.

The pattern is: when reality and a doc disagree, **reality wins**. The fastest way to consult reality is `node -e`.

## The pattern

```bash
# List exports of a package
node -e "const ai=require('ai'); console.log(Object.keys(ai).sort().join('\n'))"

# Filter to names matching a keyword
node -e "const ai=require('ai'); console.log(Object.keys(ai).filter(k=>k.toLowerCase().includes('step')||k.toLowerCase().includes('loop')).sort().join('\n'))"
# Output:
#   ToolLoopAgent
#   isLoopFinished
#   stepCountIs
#   hasToolCall

# Check a specific version
npm view @ai-sdk/openai version
# 3.0.64
npm view ai dist-tags --json
# {"latest":"6.0.184","ai-v5":"5.0.188","canary":"7.0.0-canary.142","beta":"7.0.0-beta.116"}

# Read the source for what a function actually reads
node -e "const t=require('/abs/path/node_modules/ai/dist/test/index.js'); console.log(Object.keys(t).join('\n'))"

# Inspect prototype keys of a result object
node -e "const { generateText } = require('ai'); ..."
# prototype keys: ... output, experimental_output  (no .object)
```

## When to use it

Run a probe before:

1. Writing any forbidden-name list (the names must match installed exports).
2. Pinning any version that came from a doc.
3. Constructing any `MockLanguageModelV3` shape (finishReason, usage, chunk types).
4. Adding any positive-assertion test for emitted code (verify the API surface exists).

## Evidence

- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 27-49: the version doc itself contains four `node -e` probe transcripts.
- `04-logs/debug-log.md` lines 50-83 (D1-D4): L3's investigation — probed `Output` export path, probed `LanguageModelV3GenerateResult` shape, traced `NoOutputGeneratedError` cause, probed `mockValues()` source. Each is a `node -e` invocation.
- `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 18-22: "actual `ai@6.0.184` LanguageModelV3 stream part shape (verified via runtime probe of `dist/index.js`)."
- `04-logs/expectation-gap-log.md`: every entry in this log is in effect a "doc said X, probe found Y" anecdote.

## Related

- [`gotchas/mock-language-model-v3-stream-shape.md`](../gotchas/mock-language-model-v3-stream-shape.md) — what probes found.
- [`gotchas/ai-sdk-openai-version-3075-does-not-exist.md`](../gotchas/ai-sdk-openai-version-3075-does-not-exist.md) — what `npm view` found.
- [`playbooks/probing-the-actual-ai-sdk-api-surface.md`](../playbooks/probing-the-actual-ai-sdk-api-surface.md)
