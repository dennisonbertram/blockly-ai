/**
 * regression.test.ts — L-capstone
 *
 * Regression tests that catch future breakage.
 * Extends L5 regression tests with capstone-specific checks.
 *
 * RT-L5-001 through RT-L5-007: carried forward from L5
 * RT-capstone-001: Snapshot lock — capstone workspace codegen locked
 * RT-capstone-004: demo-program.json is a valid Blockly workspace state
 * RT-capstone-005: GenerateObject schema includes all 3 fields (title, key_points, sources)
 * RT-capstone-006: Agent stopWhen is explicitly stepCountIs(5) in emitted source
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as libraryBlocks from 'blockly/blocks'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { generate } from '../lib/codegen/generate'

// Fixtures
import streamTextBasicFixture from './fixtures/stream-text-basic.json'
import agentMultiStepFixture from './fixtures/agent-multi-step.json'
import agentHasToolCallStopFixture from './fixtures/agent-has-tool-call-stop.json'
import generateTextBasicFixture from './fixtures/generate-text-basic.json'
import capstoneWorkspace from './fixtures/capstone-workspace.json'

// Side-effect: registers built-in blocks
void libraryBlocks

// Side-effect: registers all blocks
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

const SOURCE_ROOT = join(import.meta.dirname ?? __dirname, '..')

/** Recursively collect all .ts / .tsx files under a directory. */
function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  let entries: ReturnType<typeof readdirSync>
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry as string)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory() && !['node_modules', '.next', 'test', '__snapshots__'].includes(entry as string)) {
      results.push(...collectTsFiles(fullPath))
    } else if (stat.isFile() && (String(entry).endsWith('.ts') || String(entry).endsWith('.tsx'))) {
      results.push(fullPath)
    }
  }
  return results
}

// ─── RT-L5-001: Snapshot locks ─────────────────────────────────────────────

describe('RT-L5-001: snapshot lock — all L5 fixtures', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('generate-text-basic fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(generateTextBasicFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('stream-text-basic fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('agent-multi-step fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })

  it('agent-has-tool-call-stop fixture snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentHasToolCallStopFixture, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })
})

// ─── RT-L5-002: Version-pin assertions ─────────────────────────────────────

describe('RT-L5-002: version-pin assertions', () => {
  it('package.json pins ai@6.0.184', () => {
    const pkgPath = join(SOURCE_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['ai']).toBe('6.0.184')
  })

  it('package.json pins blockly@12.5.1', () => {
    const pkgPath = join(SOURCE_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['blockly']).toBe('12.5.1')
  })

  it('package.json pins next@15.x', () => {
    const pkgPath = join(SOURCE_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { dependencies: Record<string, string> }
    // next should be 15.x.x
    expect(pkg.dependencies['next']).toMatch(/^15\./)
  })
})

// ─── RT-L5-003: No experimental_ prefixes in production code ───────────────

describe('RT-L5-003: no experimental_ prefixes in production code paths', () => {
  it('no experimental_ symbol used in lib/ or app/ source files', () => {
    const productionDirs = [
      join(SOURCE_ROOT, 'lib'),
      join(SOURCE_ROOT, 'app'),
      join(SOURCE_ROOT, 'components'),
    ]

    const violations: string[] = []

    for (const dir of productionDirs) {
      const files = collectTsFiles(dir)
      for (const filePath of files) {
        let content: string
        try {
          content = readFileSync(filePath, 'utf-8')
        } catch {
          continue
        }

        // Check for experimental_ exports (not just mentions)
        const matches = content.match(/experimental_\w+/g)
        if (matches) {
          violations.push(`${filePath}: ${matches.join(', ')}`)
        }
      }
    }

    expect(
      violations,
      `experimental_ prefixed symbols found in production code: ${violations.join('; ')}`
    ).toHaveLength(0)
  })
})

// ─── RT-L5-004: API key references only in server-side modules ─────────────

describe('RT-L5-004: API key env var references only in server-side modules', () => {
  it('OPENAI_API_KEY and ANTHROPIC_API_KEY references appear ONLY in lib/execute/* or app/api/*', () => {
    const forbiddenDirs = [
      join(SOURCE_ROOT, 'components'),
      join(SOURCE_ROOT, 'app', 'page.tsx'),
    ]

    const keyPatterns = [
      /process\.env\.OPENAI_API_KEY/,
      /process\.env\.ANTHROPIC_API_KEY/,
      /process\.env\[['"]OPENAI_API_KEY['"]\]/,
      /process\.env\[['"]ANTHROPIC_API_KEY['"]\]/,
    ]

    const violations: string[] = []

    // Check components dir
    const componentsDir = join(SOURCE_ROOT, 'components')
    const componentFiles = collectTsFiles(componentsDir)
    for (const filePath of componentFiles) {
      let content: string
      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }
      for (const pattern of keyPatterns) {
        if (pattern.test(content)) {
          violations.push(`${filePath}: API key env var reference in client component`)
        }
      }
    }

    // Check app/page.tsx
    const pagePath = join(SOURCE_ROOT, 'app', 'page.tsx')
    let pageContent: string
    try {
      pageContent = readFileSync(pagePath, 'utf-8')
      for (const pattern of keyPatterns) {
        if (pattern.test(pageContent)) {
          violations.push(`${pagePath}: API key env var reference in page component`)
        }
      }
    } catch {
      // File doesn't exist — no violation
    }

    expect(
      violations,
      `API key env vars found outside server-side modules: ${violations.join('; ')}`
    ).toHaveLength(0)
  })
})

// ─── RT-L5-005: toDataStreamResponse banned in ALL source files ─────────────

describe('RT-L5-005: toDataStreamResponse banned in all source files', () => {
  it('toDataStreamResponse does NOT appear in any production source file', () => {
    const productionDirs = [
      join(SOURCE_ROOT, 'lib'),
      join(SOURCE_ROOT, 'app'),
      join(SOURCE_ROOT, 'components'),
    ]

    const violations: string[] = []

    for (const dir of productionDirs) {
      const files = collectTsFiles(dir)
      for (const filePath of files) {
        let content: string
        try {
          content = readFileSync(filePath, 'utf-8')
        } catch {
          continue
        }

        if (content.includes('toDataStreamResponse')) {
          violations.push(filePath)
        }
      }
    }

    expect(
      violations,
      `toDataStreamResponse found in production files: ${violations.join(', ')} — use toUIMessageStreamResponse`
    ).toHaveLength(0)
  })
})

// ─── RT-L5-006: stepCountIs in Agent programs ──────────────────────────────

describe('RT-L5-006: stepCountIs in every emitted Agent program', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('agent-multi-step fixture emits stepCountIs(', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(agentMultiStepFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code, 'Expected "stepCountIs(" in agent code').toContain('stepCountIs(')
  })
})

// ─── RT-L5-007: for await of .textStream in StreamSink ─────────────────────

describe('RT-L5-007: for await of .textStream in StreamSink code', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('stream-text-basic fixture emits for await (... of ....textStream)', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(streamTextBasicFixture, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code, 'Expected "for await (" — StreamSink must use async iteration').toContain('for await (')
    expect(code, 'Expected ".textStream)" — must use textStream not fullStream').toContain('.textStream)')
    expect(code, 'Found ".fullStream" — must use .textStream').not.toContain('.fullStream')
  })
})

// ─── RT-capstone-001: Snapshot lock — capstone workspace ───────────────────

describe('RT-capstone-001: snapshot lock — capstone workspace codegen', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('capstone workspace codegen snapshot locked', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()
    expect(generate(workspace)).toMatchSnapshot()
  })
})

// ─── RT-capstone-004: demo-program.json is valid ───────────────────────────

describe('RT-capstone-004: demo-program.json is a valid Blockly workspace state', () => {
  it('public/demo-program.json loads into headless workspace without error', () => {
    const demoProgramPath = join(SOURCE_ROOT, 'public', 'demo-program.json')
    let demoProgram: unknown
    expect(() => {
      const raw = readFileSync(demoProgramPath, 'utf-8')
      demoProgram = JSON.parse(raw)
    }, 'demo-program.json must exist and be valid JSON').not.toThrow()

    const ws = new Blockly.Workspace()
    try {
      expect(() => {
        Blockly.Events.disable()
        Blockly.serialization.workspaces.load(demoProgram as Record<string, unknown>, ws)
        Blockly.Events.enable()
      }, 'demo-program.json must load into Blockly workspace without error').not.toThrow()
    } finally {
      Blockly.Events.disable()
      ws.dispose()
      Blockly.Events.enable()
    }
  })
})

// ─── RT-capstone-005: GenerateObject schema has all 3 required fields ──────

describe('RT-capstone-005: GenerateObject schema includes title, key_points, sources', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('capstone emitted code contains title, key_points, and sources fields', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code, 'Must contain title field').toContain('title:')
    expect(code, 'Must contain key_points field').toContain('key_points:')
    expect(code, 'Must contain sources field').toContain('sources:')
  })
})

// ─── RT-capstone-006: stopWhen: stepCountIs(5) explicitly set ──────────────

describe('RT-capstone-006: Agent stopWhen is explicitly stepCountIs(5)', () => {
  let workspace: Blockly.Workspace
  beforeEach(() => { workspace = new Blockly.Workspace() })
  afterEach(() => { workspace.dispose() })

  it('capstone emitted code contains "stopWhen: stepCountIs(5)"', () => {
    Blockly.Events.disable()
    Blockly.serialization.workspaces.load(capstoneWorkspace, workspace)
    Blockly.Events.enable()

    const code = generate(workspace)

    expect(code, 'stopWhen: stepCountIs(5) must be explicit in emitted code').toContain('stopWhen: stepCountIs(5)')
  })
})
