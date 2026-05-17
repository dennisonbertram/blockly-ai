# Open Questions — Combined

Questions Phase 1 could not fully resolve. Each tagged with the POC level where we expect resolution.

## Blockly

- **B1.** End-to-end pattern for async/await codegen — no official Blockly support, multiple community workarounds. *Validate in L2.*
- **B2.** Stable Vite config for Blockly (Next.js path is cleaner) — community workarounds exist, unverified. *Skip if we commit to Next.js exclusively.*
- **B3.** Headless Node.js code generation without jsdom overhead — for server-side recompile of stored workspaces. *Validate in L5.*
- **B4.** Multiple concurrent `WorkspaceSvg` instances on the same page — isolation completeness. *Out of scope for v1; flagged in open-questions.*
- **B5.** Undo-stack observability without private fields. *Out of scope for v1.*

## Vercel AI SDK

- **A1.** Stability of `instructions` parameter on `generateText`/`streamText` in v6 vs. only on `ToolLoopAgent`. *Validate in L2.*
- **A2.** Latency delta between AI Gateway and direct provider calls. *Out of scope for v1; flag.*
- **A3.** How streaming-tool `execute` async generators surface in `fullStream`. *Validate in L4.*
- **A4.** `Output.*` parity between Zod v3 and Zod v4. *Validate in L3 with both versions.*
- **A5.** Multi-step agents on Vercel Edge 25-s limit. *Validate in L5.*
- **A6.** `experimental_repairToolCall` production reliability. *Out of scope for v1.*

## Integration

- **I1.** Sandboxing strategy for executing emitted code — `new Function` vs. worker vs. VM module. *Decided in L4 design.*
- **I2.** How to round-trip workspace state ↔ shareable URL or DB record. *Validate in L5.*
- **I3.** Streaming back to the browser: `toUIMessageStreamResponse` baseline vs. custom SSE. *Validate in L4.*
- **I4.** Tool body authoring UX — free-form text-field vs. predefined tools. *Decided in L3.*
- **I5.** Multi-provider parity for structured output strict modes. *Validate in L3.*
