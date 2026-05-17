/**
 * App.tsx
 *
 * L1 POC: Blockly workspace with generated-code side panel.
 *
 * Layout:
 *   Left side  — Blockly workspace (flexible width)
 *   Right side — Generated code panel (fixed 400px, scrollable)
 *
 * Security note: the "Run" button uses `new Function(code)()` which is
 * INTENTIONALLY UNSAFE. This is a prototype-only pattern, clearly labeled.
 * The comment in the handler must stay — it documents the conscious choice.
 */

import { useState } from 'react'
import { BlocklyWorkspace } from './BlocklyWorkspace'

export function App() {
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [runOutput, setRunOutput] = useState<string>('')
  const [runError, setRunError] = useState<string>('')

  const handleCodeChange = (code: string) => {
    setGeneratedCode(code)
    setRunOutput('')
    setRunError('')
  }

  const handleRun = () => {
    setRunOutput('')
    setRunError('')

    if (!generatedCode.trim()) {
      setRunError('No code to run. Add some blocks first.')
      return
    }

    // PROTOTYPE-ONLY: new Function() is intentionally used here.
    // This gives generated code access to the global scope.
    // DO NOT use this pattern in production — use JS-Interpreter or a sandbox.
    try {
      // Capture console.log output
      const logs: string[] = []
      const origLog = console.log
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '))
        origLog(...args)
      }
      // eslint-disable-next-line no-new-func
      new Function(generatedCode)()
      console.log = origLog
      setRunOutput(logs.join('\n') || '(no output)')
    } catch (err) {
      setRunError(String(err))
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace' }}>
      {/* Blockly workspace — takes all remaining space */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <BlocklyWorkspace onCodeChange={handleCodeChange} />
      </div>

      {/* Generated code panel */}
      <div
        style={{
          width: '400px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '2px solid #ccc',
          background: '#1e1e1e',
          color: '#d4d4d4',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            background: '#252526',
            borderBottom: '1px solid #3c3c3c',
            fontSize: '12px',
            color: '#cccccc',
          }}
        >
          Generated JavaScript
        </div>

        <pre
          data-testid="code-panel"
          style={{
            flex: 1,
            margin: 0,
            padding: '12px',
            overflow: 'auto',
            fontSize: '12px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {generatedCode || '// Drag blocks to generate code'}
        </pre>

        <div style={{ padding: '8px 12px', borderTop: '1px solid #3c3c3c' }}>
          <button
            onClick={handleRun}
            style={{
              padding: '6px 16px',
              background: '#0e7a0d',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ▶ Run (prototype-only: new Function)
          </button>
        </div>

        {(runOutput || runError) && (
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid #3c3c3c',
              background: runError ? '#3c1515' : '#1e1e1e',
              fontSize: '12px',
            }}
          >
            <div style={{ color: '#888', marginBottom: '4px' }}>Output:</div>
            <pre
              style={{
                margin: 0,
                color: runError ? '#f48771' : '#9cdcfe',
                whiteSpace: 'pre-wrap',
              }}
            >
              {runOutput || runError}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
