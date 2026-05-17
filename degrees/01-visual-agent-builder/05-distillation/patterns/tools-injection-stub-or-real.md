# Pattern: `__tools` injection — block emits a call, executor provides the implementation

**Category:** pattern — tool implementation strategy

## Problem it solves

When a Blockly Tool block defines an "execute body", the body has to do *something* — call a real search API, fetch a URL, query a database. Two bad alternatives:

- **Inline-emit:** hard-code the side-effect body (e.g., `fetch(url).then(...)`) directly in the emitted code. Locks the data shape into the workspace fixture and the emitted module gains arbitrary network/filesystem reach.
- **No tools:** keep the visual builder to text-only programs and write tools elsewhere. Defeats the point of the visual builder.

## The pattern

Each tool body uses an `ai_tool_call` block that emits:

```ts
await __tools.<name>(<arg>)
```

The executor injects `tools: { search: searchStub, fetch: fetchStub }` into `run({ model, sink, tools })`. The stubs are TypeScript modules under the server's control — they can be swapped from canned data (in tests) to real APIs (in production) without touching the workspace JSON.

A canned-data search stub from the capstone:

```ts
// lib/tools/search.ts
export async function searchStub(query: string) {
  return [
    { title: 'Blockly + AI', url: 'https://example.com/...' },
    { title: 'Visual programming', url: '...' },
  ]
}
```

And the matching emitted execute body:

```ts
tool({
  description: 'Search the web',
  inputSchema: z.object({ query: z.string() }),
  execute: async (input) => {
    return await __tools.search(input.query)
  },
})
```

## Why this beats inline-emit

1. **Workspace JSON describes structure, not data.** Fixtures stay short and shareable.
2. **The executor can swap stubs for real implementations** without rebuilding the workspace.
3. **Test isolation:** in tests, `__tools` is a `{ search: vi.fn().mockResolvedValue([...]) }`. In production, `__tools` points at modules that hit a real API.
4. **Backward compatibility:** the `tools: __tools` field defaults to `undefined`, so L5 programs that never call `__tools.*` keep working.

## Evidence

- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 17-30: full decision; "Inline data would be locked in the workspace fixture — not reusable. The injection pattern lets the executor swap stubs for real implementations without changing the emitted code."
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 60-67: `ai_tool_call` block — "Emits `await __tools.<name>(<arg>)`."
- `04-logs/decision-log.md` lines 173-180 (capstone decision "Tools injection: __tools map vs inline-emit"): three rationale bullets, backward-compat trade-off.
- `04-logs/deployment-log.md` lines 33-43: deployment notes — "capstone adds no new server-side dependencies beyond L5. The tool stubs (search.ts, fetch.ts) are pure TypeScript, no external deps. Route handler imports the new ai_tool_call block at module load time."

## Related

- [`patterns/server-side-execution-via-import-map.md`](server-side-execution-via-import-map.md)
- [`playbooks/wiring-a-new-tool.md`](../playbooks/wiring-a-new-tool.md)
