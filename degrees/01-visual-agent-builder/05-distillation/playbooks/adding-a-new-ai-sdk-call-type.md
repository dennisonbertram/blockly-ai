# Playbook: Add a new AI SDK call type (e.g., `embed`) with v6-correct emission

**Category:** playbook

## When to use

The visual builder needs a new SDK function — `embed`, `embedMany`, `generateImage`, a new `Output.array(...)` accessor — and you need to integrate it without re-introducing v3/v4 names.

## Pre-flight

- `ai@6.0.184` pinned exactly (see [pattern](../patterns/exact-version-pins-on-ai-sdk.md)).
- Forbidden-name grep regression already present (see [pattern](../patterns/forbidden-name-grep-regression.md)).

## Steps

### 1. Probe the SDK first — never trust docs

Run `npm view ai version` to confirm your pinned version is the published one, then probe exports:

```bash
node -e "const ai=require('ai'); console.log(Object.keys(ai).filter(k=>k.toLowerCase().includes('embed')).sort().join('\n'))"
# Expected: 'embed', 'embedMany' (or whatever the v6 name is)
```

Read the published TypeScript types in `node_modules/ai/dist/index.d.ts` for the exact option keys (`model`, `value`, `values`, `maxConcurrency`, etc.). This is the *only* authoritative source. See [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md).

### 2. Identify the old-name pitfalls

Search the SDK CHANGELOG (in `node_modules/ai/CHANGELOG.md`) for renames touching the new function. If anything in v3/v4 had a different name (`createEmbedding`, `embedSync`, etc.), note it.

### 3. Add a new block via [the custom-block playbook](adding-a-new-custom-block.md)

Emit the v6-correct call. For `embed`:

```ts
javascriptGenerator.forBlock['ai_embed'] = (block, generator) => {
  const value = generator.valueToCode(block, 'VALUE', Order.NONE) || "''"
  const code = `await embed({ model: __embedding_model, value: ${value} })`
  return [code, Order.AWAIT]
}
```

### 4. Extend the import header

In `src/codegen/async-generator.ts`'s `buildImportHeader`:

```ts
const aiNames = [
  /* existing */,
  ...(body.includes('embed(')      ? ['embed']     : []),
  ...(body.includes('embedMany(')  ? ['embedMany'] : []),
]
```

If the new function takes a different provider entry point (e.g., `openai.embedding('text-embedding-3-small')`), document the provider-construction form and let the Model block emit it.

### 5. Add a forbidden-name regression entry for the old name(s)

```ts
// test/regression.test.ts
const forbiddenNames = [
  /* existing */,
  'createEmbedding(',   // hypothetical v4 name
]
```

### 6. RED → GREEN → REGRESSION

1. Write the failing fixture+test (RED).
2. Implement the block + generator + import detection (GREEN).
3. Add the snapshot + forbidden-name entry (REGRESSION). Commit snapshot.

### 7. If the test layer needs a new mock shape

E.g., for `embed` you may need a `MockEmbeddingModelV3` shape. Probe it (`require('ai/test')`) for the right field names. See [`gotchas/mock-language-model-v3-stream-shape.md`](../gotchas/mock-language-model-v3-stream-shape.md) — the same kind of shape mismatches happen on the embedding mock.

## Example commands

```bash
cd degrees/01-visual-agent-builder/03-pocs/<level>/source
node -e "console.log(Object.keys(require('ai')).sort().join('\n'))" | grep -i embed
node -e "console.log(Object.keys(require('ai/test')).join('\n'))" | grep -i embed
pnpm test                             # red
# ... implement ...
pnpm test                             # green
pnpm test                             # regression
git add . && git commit -m "feat(L?): ai_embed block (v6 embed API)"
```

## Evidence

- L3 followed exactly this shape when adding `Output.object` and `tool({ inputSchema })`: `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 28-34 (import detection extension), `03-pocs/L3-tool-and-object-blocks/source/test/regression.test.ts` lines 19-21 (forbidden-name addition).
- L4 followed it for `streamText`, `hasToolCall`, `stepCountIs`: `03-pocs/L4-multi-step-agent-and-stream/implementation-notes.md` lines 22-30 + regression file lines 240-250.
- `04-logs/debug-log.md` lines 50-83 (D1-D4): the probe pattern for L3.

## Related

- [`patterns/probe-sdk-with-node-e.md`](../patterns/probe-sdk-with-node-e.md)
- [`patterns/selective-imports-by-body-scan.md`](../patterns/selective-imports-by-body-scan.md)
- [`playbooks/upgrading-the-ai-sdk-pin.md`](upgrading-the-ai-sdk-pin.md)
