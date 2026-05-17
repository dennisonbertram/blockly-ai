/**
 * fetch.ts — L-capstone
 *
 * Stubbed fetch tool. Returns canned page-content strings for known URLs,
 * or a default string for all others. No real HTTP requests are made.
 *
 * Injected into the executor via __tools.fetch in run-emitted.ts.
 */

const CANNED: Record<string, string> = {
  'https://example.dev/blockly-ai':
    'Blockly is a Google library for visual programming. AI fills in the rest.',
  'https://example.dev/llm-blocks':
    'Custom blocks make LLM workflows visual and debuggable.',
}

export async function fetchStub(url: string): Promise<string> {
  return CANNED[url] ?? `Stubbed content for ${url}.`
}
