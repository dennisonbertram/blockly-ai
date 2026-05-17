'use client'
/**
 * page.tsx — L5
 *
 * Root page: 'use client' required for next/dynamic({ ssr: false }) in Next.js 15
 * App Router. The `ssr: false` option is only allowed in Client Components.
 *
 * R3 compliance: Blockly workspace component is never bundled for the server.
 * The dynamic() call with ssr: false excludes the entire WorkspacePage module
 * (and all its imports, including blockly) from the server bundle.
 *
 * API keys never reach this component — they are server-only in app/api/* and lib/execute/*.
 *
 * Note (expectation gap): In Next.js 15 App Router, ssr: false in next/dynamic
 * requires the importing file to be a Client Component ('use client').
 * This differs from Pages Router where the page itself could be a Server Component
 * and still use dynamic({ ssr: false }). See expectation-gap-log.md.
 */

import dynamic from 'next/dynamic'

// WorkspacePage and everything it imports (including Blockly) is excluded from SSR.
// This works because page.tsx is a Client Component ('use client').
const WorkspacePage = dynamic(
  () => import('../components/WorkspacePage').then((mod) => ({ default: mod.WorkspacePage })),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        Loading workspace...
      </div>
    ),
  }
)

export default function Page() {
  return <WorkspacePage />
}
