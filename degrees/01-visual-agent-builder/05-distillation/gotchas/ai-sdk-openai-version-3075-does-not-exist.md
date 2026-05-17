# Gotcha: `@ai-sdk/openai@3.0.75` does not exist on npm — pin `3.0.64`

**Category:** gotcha — version pinning / research-vs-reality drift

## Symptom

```
ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @ai-sdk/openai@3.0.75.
The latest release of @ai-sdk/openai is "3.0.64".
```

`pnpm install` (or `npm install`) fails immediately on a fresh clone of L2 because the version pinned in research docs was never published.

## Root cause

The Phase-1 research document `01-research/vercel-ai-sdk/version-and-current-api.md` was authored against the wider AI SDK release set and listed `@ai-sdk/openai@3.0.75` alongside `ai@6.0.184` and `@ai-sdk/anthropic@3.0.78`. At the time L2 was implemented (2026-05-17), the latest published `@ai-sdk/openai` was `3.0.64`. The research version was either aspirational, a typo, or read from a release that was later un-published.

## Fix

Pin `@ai-sdk/openai@3.0.64` exactly. Verify with `npm view @ai-sdk/openai version` before pinning anywhere downstream. From L2 onward this is the pinned version in every POC's `package.json`.

```
@ai-sdk/openai: 3.0.64   (exact, no ^)
@ai-sdk/anthropic: 3.0.78 (exact, no ^)
ai: 6.0.184              (exact, no ^)
blockly: 12.5.1          (exact, no ^)
```

## Lesson — for any worker: research-doc pins are advisory, npm is authoritative

Always run `npm view <pkg> version` before adopting a version pin from a doc. This was the *first* L2 install failure and surfaced the second-order rule: pin exact versions, then add a regression test that re-reads `package.json` and asserts the pin (see RT-002 / RT-L4-002).

## Evidence

- `04-logs/error-log.md` lines 43-49: verbatim error and fix.
- `04-logs/expectation-gap-log.md` lines 38-46: "Source of expectation: `01-research/vercel-ai-sdk/version-and-current-api.md` … Source of reality: `npm view @ai-sdk/openai version → 3.0.64`."
- `03-pocs/L2-single-generate-text-block/surprises.md` lines 3-11: "The research file pins `@ai-sdk/openai@3.0.75` but npm returns: ERR_PNPM_NO_MATCHING_VERSION."
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 90-99: capstone version table — `@ai-sdk/openai@3.0.64` is the final pin used in production.

## Related

- [`patterns/exact-version-pins-on-ai-sdk.md`](../patterns/exact-version-pins-on-ai-sdk.md)
- [`anti-patterns/implicit-caret-on-ai-sdk.md`](../anti-patterns/implicit-caret-on-ai-sdk.md)
