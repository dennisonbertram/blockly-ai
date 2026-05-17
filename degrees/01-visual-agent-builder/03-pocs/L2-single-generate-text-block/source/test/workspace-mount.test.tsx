/**
 * workspace-mount.test.tsx
 *
 * Mount sanity test for BlocklyWorkspace component.
 * Reuses L1 mock pattern: mocks Blockly.inject to avoid happy-dom FocusManager crash.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import React, { StrictMode } from 'react'

// vi.hoisted: create mock variables that survive hoisting above imports
const { mockInject, mockSetLocale } = vi.hoisted(() => {
  const makeWorkspace = () => ({
    addChangeListener: vi.fn(),
    removeChangeListener: vi.fn(),
    dispose: vi.fn(),
    isDragging: vi.fn().mockReturnValue(false),
  })
  const mockInject = vi.fn(makeWorkspace)
  const mockSetLocale = vi.fn()
  return { mockInject, mockSetLocale }
})

vi.mock('blockly/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('blockly/core')>()
  return {
    ...actual,
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
  const makeWorkspace = () => ({
    addChangeListener: vi.fn(),
    removeChangeListener: vi.fn(),
    dispose: vi.fn(),
    isDragging: vi.fn().mockReturnValue(false),
  })
  mockInject.mockImplementation(makeWorkspace)
})

describe('<BlocklyWorkspace /> mount', () => {
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

    const workspaceDiv = container.querySelector('[data-testid="blockly-container"]')
    expect(workspaceDiv).not.toBeNull()

    const errors = errorSpy.mock.calls.map((args) => String(args[0]))
    const doubleInjectErrors = errors.filter(
      (e) => e.includes('Already') || e.includes('injected') || e.includes('double')
    )
    expect(doubleInjectErrors).toHaveLength(0)

    errorSpy.mockRestore()
  })

  it('calls inject when mounting', async () => {
    await act(async () => {
      render(
        <StrictMode>
          <BlocklyWorkspace />
        </StrictMode>
      )
    })

    expect(mockInject).toHaveBeenCalled()
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
})
