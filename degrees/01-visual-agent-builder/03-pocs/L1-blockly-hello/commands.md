# Commands — L1 blockly-hello

Copy-pasteable commands for reproducing the L1 POC build.

```bash
# Navigate to the source directory
cd degrees/01-visual-agent-builder/03-pocs/L1-blockly-hello/source

# Install dependencies (pnpm)
pnpm install

# Run dev server
pnpm dev

# Run tests (all)
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build for production
pnpm build
```

## Git audit trail

```bash
git log --oneline | head -5
# a6e56ec test(L1): regression snapshots and Strict Mode guard — REGRESSION
# 540397e feat(L1): implement blockly hello — GREEN
# bd36b5f test(L1): add failing tests for blockly hello — RED
```

## Verify snapshot correctness

```bash
cat source/test/__snapshots__/snapshots.test.ts.snap
```

Expected snapshot values:
- `1 + 2 * 3;\n` (no unnecessary parens)
- `(1 + 2) * 3;\n` (grouping parens emitted)
- `console.log('Hello, ' + 'Alice');\n`
- `""` (empty workspace)
