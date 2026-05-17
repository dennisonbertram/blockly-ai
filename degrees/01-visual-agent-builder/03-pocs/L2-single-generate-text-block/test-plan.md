# Test Plan — L2 single-generate-text-block

## Test Files

| File | Tests | Purpose |
|---|---|---|
| `test/block-defs.test.ts` | 6 | Block registration sanity |
| `test/codegen.test.ts` | 5 | BT-001–004, BT-008 — codegen golden-output + forbidden-name grep |
| `test/execute.test.ts` | 3 | BT-005–007 — execute with MockLanguageModelV3 |
| `test/workspace-mount.test.tsx` | 3 | Mount sanity — Strict Mode guard |
| `test/regression.test.ts` | 13 | RT-001–005 — snapshot lock, version pin, round-trip, SDK drift, sink safety |

Total: **30 tests**

## Execution

```bash
cd source
pnpm test           # run once
pnpm test:watch     # watch mode
pnpm test:coverage  # with V8 coverage
```

## Behavioral Tests

| ID | Description | File | Status |
|---|---|---|---|
| BT-001 | Empty workspace → import header + run() shell | codegen.test.ts | ✅ |
| BT-002 | single-generate-text → anthropic import + await generateText | codegen.test.ts | ✅ |
| BT-003 | generate-text-with-system → system: field present | codegen.test.ts | ✅ |
| BT-004 | generate-text-openai → openai import + constructor | codegen.test.ts | ✅ |
| BT-005 | Execute with MockLanguageModelV3 → sink receives correct value | execute.test.ts | ✅ |
| BT-006 | Execute with system prompt → model called with system message | execute.test.ts | ✅ |
| BT-007 | MockLanguageModelV3 import resolves from ai/test | execute.test.ts | ✅ |
| BT-008 | Forbidden-name grep → no deprecated API names | codegen.test.ts | ✅ |

## Regression Tests

| ID | Description | Catches |
|---|---|---|
| RT-001 | Snapshot lock for all 4 fixtures | Generator output change without review |
| RT-002 | Version pin assertion | Contributor unpins ai or blockly |
| RT-003 | Round-trip serialization | Block definition change breaks fixture loading |
| RT-004 | Forbidden-name grep per fixture | SDK API name drift after upgrade |
| RT-005 | __sink?. optional chaining | run() without sink throws TypeError |
