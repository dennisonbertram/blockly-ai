'use client'
/**
 * OutputPane.tsx — L5
 *
 * Displays streamed output from the /api/run route handler.
 * Consumes a ReadableStream<Uint8Array> via fetch + reader.
 */

import { useEffect, useRef } from 'react'

interface OutputPaneProps {
  output: string[]
  isRunning: boolean
}

export function OutputPane({ output, isRunning }: OutputPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  return (
    <div
      style={{
        minHeight: '200px',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '13px',
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        borderRadius: '4px',
        border: '1px solid #333',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {isRunning && output.length === 0 && (
        <span style={{ color: '#888' }}>Running...</span>
      )}
      {output.map((chunk, i) => (
        <span key={i}>{chunk}</span>
      ))}
      {isRunning && output.length > 0 && (
        <span style={{ color: '#888' }}>▋</span>
      )}
      {!isRunning && output.length === 0 && (
        <span style={{ color: '#555' }}>Output will appear here...</span>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
