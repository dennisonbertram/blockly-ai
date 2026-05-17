# Troubleshooting: `pnpm install` Fails — esbuild Binary Not Found

## Symptom

`pnpm install` exits 0 (appears to succeed) but subsequent `pnpm build`, `pnpm test`, or `pnpm dev` fail with:

```
Cannot find module 'esbuild'
```

or:

```
Ignored build scripts: esbuild@0.21.5. Run "pnpm approve-builds"
```

The "Ignored build scripts" line appears in the install log but is easy to miss among 200+ lines of output.

## Cause

pnpm 10.x ships with a security default that blocks package `postinstall` scripts. esbuild's `postinstall` downloads its platform-specific native binary. Without that binary, esbuild's JS shim can't execute. Next.js, Vite, and Vitest all depend on esbuild.

## Fix — Allowlist esbuild in `pnpm-workspace.yaml`

Create (or amend) `pnpm-workspace.yaml` at the project root:

```yaml
onlyBuiltDependencies:
  - esbuild
```

Then re-run:

```bash
pnpm install
```

The binary downloads and the error disappears.

## Alternative (One-Shot)

If you cannot modify `pnpm-workspace.yaml`:

```bash
pnpm approve-builds
pnpm install
```

`approve-builds` interactively permits the blocked scripts for this install only. The `pnpm-workspace.yaml` approach is preferred because it persists across fresh installs.

## Verification

After the fix:

```bash
pnpm exec esbuild --version
# Should print a version number like 0.21.5
```

---

## Links

- [Quickstart](../quickstart.md)
- [Reference: Package Pins](../reference/package-pins.md)
- [Back to Index](../index.md)
