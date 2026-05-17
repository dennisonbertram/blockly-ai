/**
 * page.tsx — L5
 *
 * Root page: loads WorkspacePage via next/dynamic({ ssr: false }).
 *
 * R3 compliance: Blockly workspace component is never imported during SSR.
 * The dynamic() call with ssr: false excludes the entire WorkspacePage module
 * (and all its imports, including blockly) from the server bundle.
 *
 * API keys never reach this component — they are server-only in app/api/* and lib/execute/*.
 */

import dynamic from 'next/dynamic'

// WorkspacePage and everything it imports (including Blockly) is excluded from SSR
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
