# Assumptions

Phase 0 assumptions revisited after Phase 1 research. Each tagged: **CONFIRMED**, **REFUTED**, or **STILL OPEN**.

## Original assumptions

1. **Blockly's JS code generator emits valid ES modules.**
   - Status: **PARTIALLY CONFIRMED**. Generator emits valid JS strings; "ES module" framing is on us — we wrap the emitted code in a module shell with imports.
   - Evidence: `01-research/blockly/code-generation.md`.

2. **Vercel AI SDK v5.x is current stable.**
   - Status: **REFUTED**. Current stable is **v6.0.184** as of 2026-05-16.
   - Evidence: `01-research/vercel-ai-sdk/version-and-current-api.md`; `npm view ai version`.

3. **Browser-side `generateText` works without a server proxy if the key is exposed.**
   - Status: **CONFIRMED in theory, REJECTED in practice.** Technically works; doing so leaks the key. Architecture mandates server-side execution.
   - Evidence: `01-research/vercel-ai-sdk/security-model.md`.

4. **Zod schemas can be constructed from Blockly blocks at runtime.**
   - Status: **STILL OPEN, but plausible.** Schema-building from a block tree is a code-emit problem — generator emits `z.object({...})` literals from the block tree. We will not construct Zod schemas reflectively at runtime; we emit them as source code.
   - Evidence: `01-research/integration-blueprint.md` ("Object schema" block).

5. **Next.js 15.x supports streaming AI SDK responses via route handlers.**
   - Status: **CONFIRMED.** Standard pattern is `result.toUIMessageStreamResponse()` in an App Router route handler.
   - Evidence: `01-research/vercel-ai-sdk/nextjs-integration.md`.

## New assumptions surfaced by research

6. **Blockly v12.5.1 is the right pin (avoid v13 beta).** Confidence: **high**. Validate in L1.
7. **A server-side execution sandbox is safe enough using `new Function(...)` with an injected imports map.** Confidence: **medium**. Validate in L4.
8. **Async codegen via hand-wrapping (emit `await` in statement generators) is correct.** Confidence: **medium**. Validate in L2 — this is the highest-risk codegen pattern.
9. **Golden-output tests on emitted code are sufficient to detect AI SDK API drift.** Confidence: **high**. Validate continuously.
10. **Blockly works fine inside a Next.js client component when loaded via `dynamic({ ssr: false })`.** Confidence: **high** (well-documented pattern). Validate in L1.
