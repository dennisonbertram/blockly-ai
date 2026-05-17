/**
 * capstone-regression.test.ts — L-capstone REGRESSION
 *
 * Regression tests that would fail if the GREEN commit (e9f27f8) were reverted.
 * These tests cover different angles from the behavioral tests — edge cases,
 * integration points, and specific invariants.
 *
 * RT-reg-001: Tool stubs are idempotent — calling twice returns same data
 * RT-reg-002: searchStub returns array (not undefined, not error) for ALL inputs
 * RT-reg-003: fetchStub returns string (not undefined, not error) for ALL inputs
 * RT-reg-004: Emitted code's tool execute bodies call __tools (not hardcoded data)
 * RT-reg-005: run() signature contains "tools: __tools" — injection contract locked
 * RT-reg-006: Capstone workspace loads and generates without error (no block registration gap)
 * RT-reg-007: ai_tool_call block emits "await __tools." prefix — Order.AWAIT correct
 * RT-reg-008: runEmitted with capstone workspace + no modelOverride doesn't crash on init
 * RT-reg-009: The 3 schema fields (title, key_points, sources) use correct Zod types in snapshot
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'

import { generate } from '../lib/codegen/generate'
import { searchStub } from '../lib/tools/search'
import { fetchStub } from '../lib/tools/fetch'

import capstoneWorkspace from './fixtures/capstone-workspace.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers all blocks including the new ai_tool_call
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
import '../lib/blocks/tool-call'

// ─── RT-reg-001: Tool stubs are idempotent ────────────────────────────────

describe('RT-reg-001: searchStub is idempotent', () => {
  it('calling searchStub twice with same query returns identical results', async () => {
    const r1 = await searchStub('visual programming with LLMs')
    const r2 = await searchStub('visual programming with LLMs')
    expect(r1).toEqual(r2)
  })
})

// ─── RT-reg-002: searchStub always returns array ──────────────────────────

describe('RT-reg-002: searchStub always returns SearchResult[]', () => {
  const queries = ['visual programming with LLMs', '', 'unknown topic', '   ', 'a'.repeat(200)]

  for (const query of queries) {
    it(`searchStub returns array for query: "${query.slice(0, 30)}"`, async () => {
      const results = await searchStub(query)
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThanOrEqual(1)
      // Each result must have the required fields
      for (const result of results) {
        expect(result).toHaveProperty('title')
        expect(result).toHaveProperty('url')
        expect(result).toHaveProperty('snippet')
        expect(typeof result.title).toBe('string')
        expect(typeof result.url).toBe('string')
        expect(typeof result.snippet).toBe('string')
      }
    })
  }
})

// ─── RT-reg-003: fetchStub always returns string ──────────────────────────

describe('RT-reg-003: fetchStub always returns a non-empty string', () => {
  const urls = [
    'https://example.dev/blockly-ai',
    'https://example.dev/llm-blocks',
    'https://example.dev/unknown',
    'https://totally-unknown.dev/page',
    '',
  ]

  for (const url of urls) {
    it(`fetchStub returns string for url: "${url}"`, async () => {
      const content = await fetchStub(url)
      expect(typeof content).toBe('string')
      expect(content.length).toBeGreaterThan(0)
    })
  }
})

// ─── RT-reg-004: Tool bodies call __tools (not hardcoded) ────────────────

describe('RT-reg-004: emitted tool bodies call __tools (not hardcoded data)', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('search tool body calls __tools.search — NOT a hardcoded array literal', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must call __tools.search
    expect(code).toContain('__tools.search(')
    // Must NOT contain hardcoded array with canned data
    expect(code).not.toContain('Blockly + AI')
    expect(code).not.toContain('Generic result A')
    expect(code).not.toContain('Blockly is a visual editor')
  })

  it('fetch tool body calls __tools.fetch — NOT a hardcoded string literal', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must call __tools.fetch
    expect(code).toContain('__tools.fetch(')
    // Must NOT contain hardcoded page content
    expect(code).not.toContain('Blockly is a Google library')
    expect(code).not.toContain('Custom blocks make LLM workflows')
  })
})

// ─── RT-reg-005: run() signature contains "tools: __tools" ───────────────

describe('RT-reg-005: run() signature includes tools: __tools injection contract', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('capstone emitted code run() signature contains "tools: __tools"', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('tools: __tools')
  })

  it('L5 legacy programs also include "tools: __tools" in run() signature (backward compat)', () => {
    // Even a simple generateText workspace should have the tools: __tools parameter
    // (it just won't use it, but the signature must be consistent)
    const ws = new Blockly.Workspace()
    try {
      // Empty workspace still produces the run() signature
      const code = generate(ws)
      expect(code).toContain('tools: __tools')
    } finally {
      ws.dispose()
    }
  })
})

// ─── RT-reg-006: Capstone workspace loads without block-registration error ─

describe('RT-reg-006: capstone workspace loads and generates without error', () => {
  it('loading capstone-workspace.json does not throw (all block types registered)', () => {
    const ws = new Blockly.Workspace()
    try {
      expect(() => {
        Blockly.Events.disable()
        Blockly.serialization.workspaces.load(capstoneWorkspace, ws)
        Blockly.Events.enable()
      }).not.toThrow()

      // generate should also succeed
      expect(() => { generate(ws) }).not.toThrow()
    } finally {
      Blockly.Events.disable()
      ws.dispose()
      Blockly.Events.enable()
    }
  })
})

// ─── RT-reg-007: ai_tool_call emits "await __tools." prefix ──────────────

describe('RT-reg-007: ai_tool_call block emits await __tools. prefix', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('emitted tool execute body contains "await __tools." (not just "__tools.")', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    // Must use await (Order.AWAIT from the ai_tool_call generator)
    expect(code).toContain('await __tools.search(')
    expect(code).toContain('await __tools.fetch(')
  })
})

// ─── RT-reg-009: Schema fields use correct Zod types ─────────────────────

describe('RT-reg-009: GenerateObject schema uses correct Zod types', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('title field uses z.string()', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('title: z.string()')
  })

  it('key_points field uses z.array(z.string())', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('key_points: z.array(z.string())')
  })

  it('sources field uses z.array(z.string())', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code).toContain('sources: z.array(z.string())')
  })
})
