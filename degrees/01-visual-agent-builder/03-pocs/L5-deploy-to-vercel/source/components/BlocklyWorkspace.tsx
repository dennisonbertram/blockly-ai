'use client'
/**
 * BlocklyWorkspace.tsx — L5
 *
 * Client-only Blockly workspace component.
 * Carries forward the L1/L2/L3/L4 pattern with:
 * - workspaceRef guard for React 18 Strict Mode double-mount prevention
 * - Dynamic import of Blockly inside useEffect (never reachable from SSR)
 * - Cleanup: ws.dispose() + workspaceRef.current = null
 *
 * Must be loaded via next/dynamic({ ssr: false }) from page.tsx.
 */

import { useEffect, useRef } from 'react'
import type { WorkspaceSvg } from 'blockly/core'

// All block registrations — side-effect imports
// These are safe here because this file is only loaded client-side
// (protected by next/dynamic ssr:false from page.tsx)
import '../lib/blocks/model'
import '../lib/blocks/prompt'
import '../lib/blocks/generate-text'
import '../lib/blocks/output-sink'
import '../lib/blocks/tool'
import '../lib/blocks/zod-object'
import '../lib/blocks/zod-field'
import '../lib/blocks/use-tools'
import '../lib/blocks/generate-object'
import '../lib/blocks/stop-condition'
import '../lib/blocks/stream-text'
import '../lib/blocks/stream-sink'
import '../lib/blocks/agent'
import '../lib/blocks/for-each'

import { toolbox } from './toolbox'

interface BlocklyWorkspaceProps {
  onWorkspaceChange?: (workspaceJson: Record<string, unknown>) => void
}

export function BlocklyWorkspace({ onWorkspaceChange }: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<WorkspaceSvg | null>(null)

  useEffect(() => {
    // Guard: only inject once, even under React 18 Strict Mode double-mount
    if (!containerRef.current || workspaceRef.current) return

    let cleanup = () => {}

    ;(async () => {
      const Blockly = await import('blockly/core')
      await import('blockly/blocks')
      const En = await import('blockly/msg/en')
      Blockly.setLocale(En as unknown as Record<string, string>)

      if (!containerRef.current) return // component unmounted before import completed

      const ws = Blockly.inject(containerRef.current, {
        toolbox,
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        zoom: { controls: true, wheel: true, startScale: 1.0 },
        trashcan: true,
      })
      workspaceRef.current = ws

      const handleChange = () => {
        if (ws.isDragging()) return
        const json = Blockly.serialization.workspaces.save(ws)
        onWorkspaceChange?.(json)
      }

      ws.addChangeListener(handleChange)

      cleanup = () => {
        ws.removeChangeListener(handleChange)
        ws.dispose()
        workspaceRef.current = null
      }
    })()

    return () => cleanup()
  }, [onWorkspaceChange])

  return (
    <div
      ref={containerRef}
      style={{
        height: '480px',
        width: '100%',
        border: '1px solid #ddd',
        borderRadius: '4px',
      }}
    />
  )
}
