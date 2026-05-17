# Playbook: Probe the actual AI SDK API surface (do not trust docs or training data)

**Category:** playbook

## When to use

Before you copy any AI SDK code from a doc, blog, training-data-suggested snippet, prior research note, or task spec — *especially* code that:

- imports a name (`stepCountIs`? `isStepCount`? `maxSteps`?)
- accesses a result property (`.output`? `.object`? `.experimental_output`?)
- constructs a mock (`finishReason: 'stop'`? `{ unified: 'stop' }`?)
- pins a version (`@ai-sdk/openai@3.0.75`? Or is the highest published actually `3.0.64`?)

## Why

Every entry in `04-logs/expectation-gap-log.md` is a prior-version of you, who skipped this playbook and trusted a doc. The expectation-gap log is the cost of NOT running this playbook.

## Steps

### 1. Confirm what's installed

```bash
cd <project>
cat package.json | grep -E '"ai"|"@ai-sdk/|"blockly"|"zod"'
ls node_modules/ai/package.json | head -1
node -e "console.log(require('ai/package.json').version)"
```

### 2. List exports of the installed package

```bash
node -e "console.log(Object.keys(require('ai')).sort().join('\n'))"
```

Filter for the name you care about:

```bash
node -e "console.log(Object.keys(require('ai')).filter(k=>k.toLowerCase().includes('step')||k.toLowerCase().includes('loop')).sort().join('\n'))"
# stepCountIs    ← installed name
# hasToolCall
# isLoopFinished
# ToolLoopAgent
```

If the doc said `isStepCount` and probe returns `stepCountIs` — **trust the probe**.

### 3. Inspect a subpath export

```bash
node -e "console.log(Object.keys(require('ai/test')).sort().join('\n'))"
# MockEmbeddingModelV3, MockImageModelV3, MockLanguageModelV3, MockProviderV3,
# convertArrayToAsyncIterable, convertArrayToReadableStream, convertReadableStreamToArray,
# mockId, mockValues, simulateReadableStream
```

### 4. Read the published `.d.ts` for shape ground truth

```bash
cat node_modules/ai/dist/index.d.ts | grep -A 20 'type LanguageModelV3GenerateResult'
cat node_modules/ai/dist/index.d.ts | grep -A 10 'type LanguageModelV3Usage'
```

The `.d.ts` ships with the package and is *always* in sync with runtime — unlike CHANGELOG entries or docs that may describe future versions.

### 5. Trace what the SDK reads from your mock

```bash
grep -n 'finishReason' node_modules/ai/dist/index.js | head -20
# Look for lines like:
#   result.finishReason.unified  ← v3 access pattern
#   lastStep.finishReason === 'stop'  ← consumer pattern
```

This is how L3 discovered that `'stop'.unified === undefined` was silently breaking `Output.object` parsing.

### 6. Check the version distribution before pinning

```bash
npm view ai version              # current latest
npm view ai dist-tags --json     # latest / beta / canary / next
npm view ai@<target> versions    # what versions exist
npm view @ai-sdk/openai version
```

If you're considering pinning to a version the doc cites — verify the version exists before you write it into `package.json`.

### 7. Record the discovery

Every probe that contradicts a doc deserves an entry in `04-logs/expectation-gap-log.md` so the next worker knows. Format:

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>
- Expected: ...
- Actual: ...
- Source of expectation: ...
- Source of reality: ...
- Impact: ...
- Follow-up: ...
```

## Worked example — L3 finding `.output` not `.object`

```
1. cat package.json | grep '"ai"'        → "ai": "6.0.184"
2. node -e "const ai=require('ai'); ..."  → result prototype has output, experimental_output (no object)
3. Conclusion: emit .output, not .object
4. Update generate-object.ts, add expectation-gap-log entry
```

The whole loop is documented at `04-logs/debug-log.md` lines 50-72 (D1-D3).

## Evidence

- `01-research/vercel-ai-sdk/version-and-current-api.md` lines 27-49: the "RUNTIME-VERIFIED EXPORTS" section — the canonical example of this playbook applied to a research doc.
- `04-logs/debug-log.md` lines 50-83 (L3 D1-D4): four probes in succession; each fixed one bug.
- `04-logs/expectation-gap-log.md` lines 38-46 (L2 openai@3.0.75): the simplest possible application — `npm view @ai-sdk/openai version` is the entire playbook for version pins.
- `03-pocs/L4-multi-step-agent-and-stream/surprises.md` lines 17-23: the `dist/index.js:7492` source-read that found the `delta:` field name.

## Related

- [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md)
- [`anti-patterns/trusting-llm-from-memory-for-ai-sdk.md`](../anti-patterns/trusting-llm-from-memory-for-ai-sdk.md)
- [`anti-patterns/following-pre-2026-ai-sdk-tutorials.md`](../anti-patterns/following-pre-2026-ai-sdk-tutorials.md)
