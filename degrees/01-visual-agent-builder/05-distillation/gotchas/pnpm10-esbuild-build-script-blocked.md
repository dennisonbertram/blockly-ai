# Gotcha: pnpm 10 blocks build scripts by default — esbuild's binary won't download

**Category:** gotcha — package manager / installation

## Symptom

```
Ignored build scripts: esbuild@0.21.5. Run "pnpm approve-builds"
```

`pnpm install` "succeeds" with exit 0, but later commands fail because esbuild's native binary was never downloaded. This is opaque on the first try — the install logs are 200+ lines and the "Ignored build scripts" line is easy to miss.

## Root cause

pnpm 10.x ships with a security default that does not run package postinstall scripts. esbuild's postinstall downloads its platform-specific native binary; without it, the package's JS shim cannot execute.

## Fix — allowlist esbuild in `pnpm-workspace.yaml`

Create `pnpm-workspace.yaml` (or amend an existing one) at the project root:

```yaml
onlyBuiltDependencies:
  - esbuild
```

Re-run `pnpm install`. The binary downloads, tests run, life continues.

If you do not control pnpm config, the alternative is one-shot: `pnpm approve-builds`.

## Lesson — this is not in the research docs

The first L1 install hit this within minutes. The research docs treated pnpm as a known quantity; pnpm-10's security default is recent enough that the docs didn't carry the workaround.

## Evidence

- `04-logs/error-log.md` lines 19-25: verbatim error and fix; "Not in research docs. pnpm 10.x security default."
- `04-logs/decision-log.md` lines 20-27: decision to use pnpm despite the workaround.
- `04-logs/command-log.md` lines 19-25: L1 install transcript — "Installed 221 packages. esbuild@0.21.5 build script blocked; fixed with `pnpm-workspace.yaml` setting `onlyBuiltDependencies: [esbuild]`."
