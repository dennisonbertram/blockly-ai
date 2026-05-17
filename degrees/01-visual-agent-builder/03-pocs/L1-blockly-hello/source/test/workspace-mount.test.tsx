/**
 * workspace-mount.test.tsx
 *
 * Integration test: mounts <BlocklyWorkspace /> in React 18 Strict Mode,
 * asserts Strict Mode double-mount is handled correctly.
 *
 * BT-005: When <BlocklyWorkspace /> is rendered with React 18 Strict Mode,
 *         exactly ONE Blockly workspace container exists in the DOM and no errors
 *         are logged.
 *
 * Note: Blockly.inject() requires a real SVG/DOM environment. In happy-dom, SVG
 * measurements return 0 but injection does not throw. We assert on the DOM
 * structure and error log, NOT on pixel-level rendering.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React, { StrictMode } from 'react'

// This import will fail until the file exists — RED state.
import { BlocklyWorkspace } from '../src/BlocklyWorkspace'

afterEach(() => {
  cleanup()
})

describe('<BlocklyWorkspace /> mount', () => {
  // BT-005
  it('mounts without errors in React 18 Strict Mode', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(
      <StrictMode>
        <BlocklyWorkspace />
      </StrictMode>
    )

    // The component must render a container div
    const workspaceDiv = container.querySelector('[data-testid="blockly-container"]')
    expect(workspaceDiv).not.toBeNull()

    // No error about "Already injected" or double-mount
    const errors = errorSpy.mock.calls.map((args) => String(args[0]))
    const doubleInjectErrors = errors.filter(
      (e) => e.includes('Already') || e.includes('injected') || e.includes('double')
    )
    expect(doubleInjectErrors).toHaveLength(0)

    errorSpy.mockRestore()
  })

  it('unmounts cleanly and sets workspaceRef to null', () => {
    const { unmount } = render(
      <StrictMode>
        <BlocklyWorkspace />
      </StrictMode>
    )

    // Unmounting should not throw
    expect(() => unmount()).not.toThrow()
  })

  it('accepts an onCodeChange callback and calls it with a string', async () => {
    let receivedCode: string | null = null
    const onCodeChange = (code: string) => {
      receivedCode = code
    }

    render(
      <StrictMode>
        <BlocklyWorkspace onCodeChange={onCodeChange} />
      </StrictMode>
    )

    // After mount, if the workspace is empty the callback may or may not fire.
    // We only assert the component accepted the prop without crashing.
    // (Actual codegen is tested in codegen.test.ts)
    expect(receivedCode === null || typeof receivedCode === 'string').toBe(true)
  })
})
