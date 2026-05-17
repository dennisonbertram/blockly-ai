'use client'
/**
 * WorkspacePage.tsx — L5
 *
 * Main client component: Blockly workspace + Run button + output pane.
 *
 * Architecture:
 * - BlocklyWorkspace is NOT imported via next/dynamic here because
 *   WorkspacePage itself is loaded via next/dynamic({ ssr: false }) from app/page.tsx.
 *   So all imports in this file are safe — they will never run on the server.
 *
 * Data flow:
 * 1. User arranges blocks in BlocklyWorkspace.
 * 2. onWorkspaceChange callback captures the workspaceJson state.
 * 3. User clicks "Run".
 * 4. POST to /api/run with { workspaceJson }.
 * 5. Response is streamed; each chunk is appended to outputChunks state.
 * 6. OutputPane renders the accumulated chunks.
 */

import { useState, useCallback } from 'react'
import { BlocklyWorkspace } from './BlocklyWorkspace'
import { OutputPane } from './OutputPane'

export function WorkspacePage() {
  const [workspaceJson, setWorkspaceJson] = useState<Record<string, unknown> | null>(null)
  const [outputChunks, setOutputChunks] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWorkspaceChange = useCallback((json: Record<string, unknown>) => {
    setWorkspaceJson(json)
  }, [])

  const handleRun = useCallback(async () => {
    if (!workspaceJson) {
      setError('No workspace loaded. Add some blocks first.')
      return
    }

    setOutputChunks([])
    setError(null)
    setIsRunning(true)

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceJson }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        let errMessage: string
        try {
          const parsed = JSON.parse(errBody) as { error?: string }
          errMessage = parsed.error ?? errBody
        } catch {
          errMessage = errBody
        }
        setError(`Server error (${response.status}): ${errMessage}`)
        return
      }

      // Stream the response body
      const reader = response.body?.getReader()
      if (!reader) {
        setError('No response body reader available')
        return
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setOutputChunks((prev) => [...prev, chunk])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Network error: ${message}`)
    } finally {
      setIsRunning(false)
    }
  }, [workspaceJson])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <header style={{ borderBottom: '1px solid #ddd', paddingBottom: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Blockly AI Builder</h1>
        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
          Arrange AI blocks to create programs. Click Run to execute server-side.
        </p>
      </header>

      <div style={{ flex: 1 }}>
        <BlocklyWorkspace onWorkspaceChange={handleWorkspaceChange} />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{
            padding: '10px 24px',
            backgroundColor: isRunning ? '#666' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
        {error && (
          <span style={{ color: '#e53e3e', fontSize: '14px' }}>{error}</span>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '16px', marginBottom: '8px', color: '#444' }}>Output</h2>
        <OutputPane output={outputChunks} isRunning={isRunning} />
      </div>
    </div>
  )
}
