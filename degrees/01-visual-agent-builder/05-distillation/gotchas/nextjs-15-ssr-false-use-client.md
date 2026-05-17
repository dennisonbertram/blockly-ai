# Gotcha: In Next.js 15 App Router, `next/dynamic({ ssr: false })` requires `'use client'` on the importing file

**Category:** gotcha — Next.js 15 + Blockly

## Symptom

`npm run build` (or `next build`) fails:

```
Error: `ssr: false` is not allowed with `next/dynamic` in Server Components.
Please move it into a client component.
```

Build error in `app/page.tsx` (or wherever the dynamic import lives).

## Root cause

Next.js 15's App Router treats every file under `app/` as a Server Component by default. The `ssr: false` option is meaningful only in a Client Component context. Earlier App Router minor versions and the Pages Router allowed `ssr: false` from a Server Component; 15.x does not.

Research notes that referenced `next/dynamic({ ssr: false })` were written under earlier assumptions and did not flag this. The pattern is unchanged conceptually — only the placement of `'use client'` is new.

## Fix — add `'use client'` to the file calling `next/dynamic`

```tsx
// app/page.tsx
'use client'                                       // ← required in Next.js 15 App Router

import dynamic from 'next/dynamic'

const BlocklyWorkspace = dynamic(
  () => import('../components/BlocklyWorkspace'),
  { ssr: false },
)
```

Functionally this is fine: the page becomes a Client Component, but because the page already hosts an interactive workspace, server-rendering nothing useful for it was the implicit outcome anyway.

## Evidence

- `04-logs/error-log.md` (indirect via `04-logs/command-log.md`) — see below.
- `04-logs/command-log.md` lines 143-147 (L5 first build attempt): "Error: `ssr: false` is not allowed with `next/dynamic` in Server Components. Required `'use client'` on page.tsx. … Next.js 15 App Router breaking change. Fixed by adding `'use client'` to app/page.tsx."
- `04-logs/expectation-gap-log.md` lines 90-97: "next/dynamic({ ssr: false }) requires 'use client' in Next.js 15 App Router … This worked in Pages Router and older App Router versions but is broken in Next.js 15."
- `03-pocs/L5-deploy-to-vercel/surprises.md` lines 3-17 (S1): identical, with the explicit research-gap call-out.
- `03-pocs/L5-deploy-to-vercel/implementation-notes.md` lines 47-51: design decision recorded — "`'use client'` is required … This was an expectation gap from research (the Pages Router allows it in Server Components)."

## Related

- [`gotchas/blockly-ssr-crash.md`](blockly-ssr-crash.md)
- [`playbooks/deploy-to-vercel.md`](../playbooks/deploy-to-vercel.md)
