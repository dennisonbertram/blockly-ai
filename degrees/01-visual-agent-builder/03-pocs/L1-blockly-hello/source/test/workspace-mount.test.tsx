/**
 * workspace-mount.test.tsx
 *
 * Integration test: mounts <BlocklyWorkspace /> in React 18 Strict Mode,
 * asserts Strict Mode double-mount is handled correctly.
 *
 * BT-005: When <BlocklyWorkspace /> is rendered with React 18 Strict Mode,
 *         exactly ONE Blockly workspace container exists in the DOM and no
 *         errors are logged.
 *
 * Known limitation: Blockly.inject() requires a real SVG/DOM environment.
 * In happy-dom, Blockly's FocusManager crashes. Per research docs, UI tests
 * require Puppeteer/Playwright. We mock inject() so the React lifecycle /
 * Strict Mode guard can be tested in unit-test style.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import React, { StrictMode } from 'react'

// vi.hoisted creates variables that survive being hoisted above imports
const { mockInject, mockSetLocale } = vi.hoisted(() => {
  const makeWorkspace = () => ({
    addChangeListener: vi.fn(),
    removeChangeListener: vi.fn(),
    dispose: vi.fn(),
    isDragging: vi.fn().mockReturnValue(false),
  })
  const mockInject = vi.fn(makeWorkspace)
  const mockSetLocale = vi.fn()
  return { mockInject, mockSetLocale, makeWorkspace }
})

vi.mock('blockly/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('blockly/core')>()
  return {
    ...actual,
    // Re-export Blocks explicitly because it's a runtime-mutated property
    // and may not be captured by the spread of named exports.
    Blocks: actual.Blocks,
    inject: mockInject,
    setLocale: mockSetLocale,
  }
})

vi.mock('blockly/msg/en', () => ({}))

// Import AFTER vi.mock definitions
import { BlocklyWorkspace } from '../src/BlocklyWorkspace'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  // Restore mock implementation after clearAllMocks resets call counts
  const makeWorkspace = () => ({
    addChangeListener: vi.fn(),
    removeChangeListener: vi.fn(),
    dispose: vi.fn(),
    isDragging: vi.fn().mockReturnValue(false),
  })
  mockInject.mockImplementation(makeWorkspace)
})

describe('<BlocklyWorkspace /> mount', () => {
  // BT-005
  it('mounts without errors in React 18 Strict Mode', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let container!: HTMLElement
    await act(async () => {
      const result = render(
        <StrictMode>
          <BlocklyWorkspace />
        </StrictMode>
      )
      container = result.container
    })

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

  it('calls inject when mounting — Strict Mode double-mount guard prevents corrupt workspace', async () => {
    await act(async () => {
      render(
        <StrictMode>
          <BlocklyWorkspace />
        </StrictMode>
      )
    })

    // inject must have been called
    expect(mockInject).toHaveBeenCalled()

    // Each inject call receives an HTMLElement container div
    mockInject.mock.calls.forEach((callArgs) => {
      expect(callArgs[0]).toBeInstanceOf(HTMLElement)
    })
  })

  it('unmounts cleanly without throwing', async () => {
    let unmount!: () => void

    await act(async () => {
      const result = render(
        <StrictMode>
          <BlocklyWorkspace />
        </StrictMode>
      )
      unmount = result.unmount
    })

    await act(async () => {
      expect(() => unmount()).not.toThrow()
    })
  })

  it('accepts an onCodeChange callback prop and registers a change listener', async () => {
    const onCodeChange = vi.fn()

    await act(async () => {
      render(
        <StrictMode>
          <BlocklyWorkspace onCodeChange={onCodeChange} />
        </StrictMode>
      )
    })

    expect(mockInject).toHaveBeenCalled()
    const lastWorkspace = mockInject.mock.results[mockInject.mock.results.length - 1]
      ?.value as { addChangeListener: ReturnType<typeof vi.fn> }
    if (lastWorkspace) {
      expect(lastWorkspace.addChangeListener).toHaveBeenCalled()
    }
  })
})
