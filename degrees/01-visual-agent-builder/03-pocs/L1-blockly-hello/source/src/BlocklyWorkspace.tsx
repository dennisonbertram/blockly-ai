/**
 * BlocklyWorkspace.tsx
 *
 * React component that mounts a Blockly workspace using useEffect.
 *
 * React 18 Strict Mode double-mount guard:
 *   The useEffect guard checks workspaceRef.current before calling inject.
 *   The cleanup function disposes the workspace AND sets workspaceRef.current = null
 *   so the second Strict Mode mount creates a fresh workspace.
 *
 * Props:
 *   onCodeChange?: (code: string) => void
 *     Called with the generated JS whenever the workspace changes (not during drag).
 *
 * Known limits for this POC:
 *   - Blockly.inject() in happy-dom/jsdom returns a WorkspaceSvg but SVG measurements
 *     are 0. The workspace renders but may not be fully interactive in the test env.
 *   - ResizeObserver is intentionally kept simple for L1. L2+ will add proper
 *     ResizeObserver-based resize handling.
 */

import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import * as En from 'blockly/msg/en'
import { generate } from './codegen/generate'
import { toolboxConfig } from './toolbox'

// Register library blocks and locale once at module load (safe to call multiple times)
void libraryBlocks
Blockly.setLocale(En)

// Register the custom greet block + generator (side effects only)
import './blocks/greet'

export interface BlocklyWorkspaceProps {
  onCodeChange?: (code: string) => void
}

/**
 * BlocklyWorkspace mounts a full Blockly editor in a div.
 */
export function BlocklyWorkspace({ onCodeChange }: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  useEffect(() => {
    // Strict Mode double-mount guard: if workspace is already injected, skip.
    if (!containerRef.current || workspaceRef.current) return

    const ws = Blockly.inject(containerRef.current, {
      toolbox: toolboxConfig,
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3 },
      trashcan: true,
    })

    workspaceRef.current = ws

    // Change listener: regenerate code on every non-UI, non-drag event
    const handleChange = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return
      if (event.type === Blockly.Events.FINISHED_LOADING) return
      if (ws.isDragging()) return
      const code = generate(ws)
      onCodeChange?.(code)
    }

    ws.addChangeListener(handleChange)

    // Cleanup: dispose workspace and null the ref so Strict Mode second mount works
    return () => {
      ws.removeChangeListener(handleChange)
      ws.dispose()
      workspaceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps: mount once. onCodeChange prop changes are intentionally ignored
  // to keep inject logic stable. Use a ref for the callback if needed.

  return (
    <div
      ref={containerRef}
      data-testid="blockly-container"
      style={{ height: '480px', width: '100%' }}
    />
  )
}
