import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blockly AI Builder — L5',
  description: 'Visual AI agent builder with server-side execution',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
