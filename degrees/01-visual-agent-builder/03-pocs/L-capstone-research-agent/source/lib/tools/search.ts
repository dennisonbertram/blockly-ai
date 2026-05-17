/**
 * search.ts — L-capstone
 *
 * Stubbed search tool. Returns canned SearchResult[] for known queries,
 * or a default set for all others. No real search API is called.
 *
 * Injected into the executor via __tools.search in run-emitted.ts.
 */

export type SearchResult = { title: string; url: string; snippet: string }

const CANNED: Record<string, SearchResult[]> = {
  'visual programming with LLMs': [
    {
      title: 'Blockly + AI',
      url: 'https://example.dev/blockly-ai',
      snippet: 'Blockly is a visual editor; AI fills the gaps.',
    },
    {
      title: 'LLM block tooling',
      url: 'https://example.dev/llm-blocks',
      snippet: 'Custom blocks for LLM workflows.',
    },
  ],
  default: [
    {
      title: 'Generic result A',
      url: 'https://example.dev/a',
      snippet: 'Generic snippet A.',
    },
    {
      title: 'Generic result B',
      url: 'https://example.dev/b',
      snippet: 'Generic snippet B.',
    },
  ],
}

export async function searchStub(query: string): Promise<SearchResult[]> {
  return CANNED[query] ?? CANNED.default
}
