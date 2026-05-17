/**
 * tool-stubs.test.ts — L-capstone
 *
 * Unit tests for the stubbed search and fetch tool implementations.
 *
 * BT-capstone-001: searchStub('visual programming with LLMs') returns 2 canned results
 * BT-capstone-002: fetchStub('https://example.dev/unknown') returns default stubbed string
 * BT-capstone-003: fetchStub known URL returns correct canned content
 * BT-capstone-004: searchStub unknown query returns default 2 results
 */

import { describe, it, expect } from 'vitest'
import { searchStub } from '../lib/tools/search'
import { fetchStub } from '../lib/tools/fetch'

describe('searchStub — canned responses', () => {
  it('BT-capstone-001: searchStub("visual programming with LLMs") returns expected 2 results', async () => {
    const results = await searchStub('visual programming with LLMs')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      title: 'Blockly + AI',
      url: 'https://example.dev/blockly-ai',
      snippet: 'Blockly is a visual editor; AI fills the gaps.',
    })
    expect(results[1]).toMatchObject({
      title: 'LLM block tooling',
      url: 'https://example.dev/llm-blocks',
      snippet: 'Custom blocks for LLM workflows.',
    })
  })

  it('BT-capstone-004: searchStub unknown query returns 2 default results', async () => {
    const results = await searchStub('something completely unknown')

    expect(results).toHaveLength(2)
    expect(results[0]).toHaveProperty('title', 'Generic result A')
    expect(results[1]).toHaveProperty('title', 'Generic result B')
  })
})

describe('fetchStub — canned page content', () => {
  it('BT-capstone-002: fetchStub unknown URL returns "Stubbed content for <url>"', async () => {
    const content = await fetchStub('https://example.dev/unknown')
    expect(content).toBe('Stubbed content for https://example.dev/unknown.')
  })

  it('BT-capstone-003: fetchStub known URL "https://example.dev/blockly-ai" returns canned content', async () => {
    const content = await fetchStub('https://example.dev/blockly-ai')
    expect(content).toBe('Blockly is a Google library for visual programming. AI fills in the rest.')
  })

  it('BT-capstone-003b: fetchStub known URL "https://example.dev/llm-blocks" returns canned content', async () => {
    const content = await fetchStub('https://example.dev/llm-blocks')
    expect(content).toBe('Custom blocks make LLM workflows visual and debuggable.')
  })
})
