# Quiz 04 — Debugging

**Covers:** All troubleshooting scenarios from the POC ladder

---

## Questions

**Q1.** A test uses `MockLanguageModelV3` and the tool mock is never called. `mockModel.doGenerateCalls.length` is 1. What is the most likely cause?

<details>
<summary>Answer</summary>

The `input` field on the tool-call content item is a JavaScript object instead of a JSON string. The SDK calls `toolCall.input.trim()`, which fails silently when `input` is an object, producing `{ invalid: true }`. The tool's `execute` function is never called.

Fix: `input: JSON.stringify({ key: value })`.

</details>

---

**Q2.** After running `pnpm install`, the command exits 0 but `pnpm build` fails with "Cannot find module 'esbuild'". What happened?

<details>
<summary>Answer</summary>

pnpm 10 blocked esbuild's build script (postinstall) by default. The "Ignored build scripts: esbuild@0.21.5" warning appeared in the install log but was missed. esbuild's native binary was never downloaded.

Fix: Add `pnpm-workspace.yaml` with `onlyBuiltDependencies: [esbuild]` and re-run `pnpm install`.

</details>

---

**Q3.** A streaming test collects chunks from `result.textStream` but gets zero chunks. The mock's `doStream` is called. What is wrong with this mock?

```ts
const mockModel = new MockLanguageModelV3({
  doStream: mockValues({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', delta: 'Hello' })
        controller.close()
      }
    })
  })
})
```

<details>
<summary>Answer</summary>

The `text-delta` chunk is missing an `id:` field, and there is no `text-start` or `text-end` event. The stream transform requires matching `id:` on start/delta/end to correlate chunks. Without a `text-start` with a matching `id:`, the delta is silently dropped.

Fix:
```ts
controller.enqueue({ type: 'text-start', id: 'ts_1' })
controller.enqueue({ type: 'text-delta', id: 'ts_1', delta: 'Hello' })
controller.enqueue({ type: 'text-end',   id: 'ts_1' })
```

</details>

---

**Q4.** The snapshot test fails after a colleague ran `pnpm test -u` to "fix" a failing test. The diff shows `parameters:` replacing `inputSchema:` in the snapshot. What went wrong and how do you fix it?

<details>
<summary>Answer</summary>

The colleague accepted a snapshot that introduced a deprecated API name. The forbidden-name grep should have caught `parameters:` and rejected it — but if the grep was not run (or the test was bypassed), the bad snapshot was committed.

Fix:
1. Revert the snapshot to the last known-good state.
2. Find the block generator that is now emitting `parameters:` and fix it to emit `inputSchema:`.
3. Run `pnpm test` — forbidden-name grep should now pass.
4. Only then run `pnpm test -u` if there are legitimate snapshot changes.

This is exactly why the forbidden-name grep exists alongside snapshots: to catch "intentional" changes that drift backward.

</details>

---

**Q5.** The Vercel deployment returns 504 for agent requests. Local tests pass. What should you check first?

<details>
<summary>Answer</summary>

1. Check that `export const maxDuration = 60` is in the route handler (default is 10s on Hobby plan).
2. Check that `export const runtime = 'nodejs'` is set (Edge runtime has a 25s cap).
3. Check the Vercel function logs for the actual timeout duration.
4. If still timing out at 60s, consider reducing `stopWhen: stepCountIs(N)` to a smaller N, or upgrade to Pro plan.

</details>

---

**Q6.** `workspaceToCode` returns an empty string. The workspace was loaded from a fixture JSON. What are two possible causes?

<details>
<summary>Answer</summary>

1. The block module was not imported for side effects before `workspaceToCode` was called. The block type is unregistered, so codegen silently returns empty string.

2. The `type` field in the fixture JSON does not match the block's registered type exactly (case-sensitive). Blockly cannot find the generator for an unknown type and emits nothing.

</details>

---

## Links

- [Troubleshooting index](../troubleshooting/symptom-generated-code-throws-typeerror.md)
- [Recipe: Forbidden Name Grep Test](../recipes/recipe-forbidden-name-grep-test.md)
- [Back to Index](../index.md)
