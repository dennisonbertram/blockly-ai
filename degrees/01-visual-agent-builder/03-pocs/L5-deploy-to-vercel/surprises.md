# Surprises — L5 deploy-to-vercel

## S1: next/dynamic({ ssr: false }) requires 'use client' in Next.js 15 App Router

Next.js 15.3.2 rejects `ssr: false` in Server Components at build time:

```
Error: `ssr: false` is not allowed with `next/dynamic` in Server Components.
Please move it into a client component.
```

The fix is simple: add `'use client'` to `app/page.tsx`. But this changes the
semantics — the page is now a Client Component, meaning it's hydrated on the client.
In practice this is fine for a Blockly app (the entire page is interactive anyway).

**Research gap**: The `integration-with-frameworks.md` showed `next/dynamic({ ssr: false })`
being used in a plain page component without `'use client'`. This worked in Pages Router
and older App Router versions but is broken in Next.js 15.

## S2: TypeScript strict mode catches more in next build than in vitest

Vitest uses esbuild to transform TypeScript — esbuild does NOT run type checking.
`noUnusedLocals: true` and `noUnusedParameters: true` in `tsconfig.json` are ignored
by esbuild. Next.js runs `tsc --noEmit` during build, which DOES enforce these rules.

Two violations found in L4-copied files:
- `lib/blocks/tool.ts`: `const name = ...` declared but never read in the generator.
- `lib/execute/run-emitted.ts`: `label` parameter passed to sink callback but not used.

Fix: removed unused `name`, renamed `label` to `_label` (TypeScript convention for
intentionally unused parameters).

**Lesson**: Add `tsc --noEmit` to the test pipeline in future POCs to catch type errors
before the build step.

## S3: toolbox `as const` is incompatible with Blockly's mutable type expectations

The toolbox defined with `as const` in TypeScript produces a `readonly` deep type.
Blockly's `inject()` accepts `ToolboxDefinition` which uses `ToolboxItemInfo[]` (mutable
array). TypeScript correctly rejects the assignment of a `readonly` array to a mutable array.

Fix: removed `as const` from the toolbox export. The toolbox object is still effectively
immutable at runtime — TypeScript just doesn't enforce it.

## S4: setLocale mock needed in e2e test to silence unhandled error

The `BlocklyWorkspace` component calls `Blockly.setLocale(En)` inside an async IIFE
inside `useEffect`. When `vi.mock('blockly/core')` is used, the mock must explicitly
include `setLocale: vi.fn()` even if it spreads `...actual` — the dynamic import path
inside the component hits the module mock and does not find `setLocale` if not explicitly mocked.

This causes a `Unhandled Rejection: [vitest] No "setLocale" export is defined on the "blockly/core" mock`
error that fires after the test completes (not a test failure, but noise).

Fix: added `setLocale: vi.fn()` to the mock definition.
