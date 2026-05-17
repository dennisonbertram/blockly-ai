/**
 * BlocklyWorkspace.tsx — STUB (RED state)
 *
 * Will implement the full BlocklyWorkspace component with Strict Mode guard.
 * Minimal stub to satisfy workspace-mount.test.tsx imports.
 */

import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import * as En from 'blockly/msg/en'

void libraryBlocks
Blockly.setLocale(En)

export interface BlocklyWorkspaceProps {
  onCodeChange?: (code: string) => void
}

export function BlocklyWorkspace({ onCodeChange }: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return

    const ws = Blockly.inject(containerRef.current, {})
    workspaceRef.current = ws

    const handleChange = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return
      if (event.type === Blockly.Events.FINISHED_LOADING) return
      if (ws.isDragging()) return
      onCodeChange?.('')
    }

    ws.addChangeListener(handleChange)

    return () => {
      ws.removeChangeListener(handleChange)
      ws.dispose()
      workspaceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      data-testid="blockly-container"
      style={{ height: '480px', width: '100%' }}
    />
  )
}
