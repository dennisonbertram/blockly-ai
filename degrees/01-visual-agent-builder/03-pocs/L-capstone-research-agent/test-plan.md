# Test Plan — L-capstone

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `test/tool-stubs.test.ts` | 5 | Unit tests for search/fetch stubs |
| `test/codegen-capstone.test.ts` | 6 | Codegen behavioral + snapshot tests |
| `test/capstone-e2e.test.ts` | 2 | End-to-end with mock model |
| `test/regression.test.ts` | 16 | Pin guards, forbidden names, schema checks |
| `test/codegen.test.ts` | 6 | L5 codegen parity (carried forward) |
| `test/route-handler.test.ts` | 4 | Route handler (L5 carried forward) |
| `test/e2e-handler.test.tsx` | 4 | E2E handler (L5 carried forward) |

**Total: 43 tests**

## Behavioral Tests

| ID | File | Description |
|----|------|-------------|
| BT-capstone-001 | tool-stubs | searchStub returns 2 canned results for known query |
| BT-capstone-002 | tool-stubs | fetchStub returns default string for unknown URL |
| BT-capstone-003 | tool-stubs | fetchStub returns canned content for known URL |
| BT-capstone-004 | tool-stubs | searchStub returns 2 default results for unknown query |
| BT-capstone-005 | codegen-capstone | Emitted source has correct AI SDK imports |
| BT-capstone-005b | codegen-capstone | Emitted source has 2 tool() definitions |
| BT-capstone-005c | codegen-capstone | Emitted source has stopWhen: stepCountIs(5) |
| BT-capstone-005d | codegen-capstone | Emitted source has Output.object with title/key_points/sources |
| BT-capstone-006 | capstone-e2e | Full pipeline: generateObject → agent → sink |
| BT-capstone-007 | codegen-capstone | Emitted code references __tools.search( and __tools.fetch( |
| BT-capstone-008 | capstone-e2e | Route handler returns structured summary |

## Regression Tests

| ID | File | Description |
|----|------|-------------|
| RT-capstone-001 | regression | Capstone codegen snapshot locked |
| RT-capstone-004 | regression | demo-program.json loads cleanly |
| RT-capstone-005 | regression | Schema has title, key_points, sources |
| RT-capstone-006 | regression | stepCountIs(5) explicitly present |

## Running Tests

```bash
cd source/
npm test               # all 43 tests
npm run test:coverage  # with coverage report
```
