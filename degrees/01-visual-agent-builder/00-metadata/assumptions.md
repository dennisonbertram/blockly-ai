# Assumptions — Visual Agent Builder

Each assumption is labeled with a confidence level (**high**, **medium**, **low**) and the POC in which it will be validated. Assumptions are revised as the research and POC phases produce evidence.

---

- **Blockly's JavaScript code generator emits valid ES modules.**
  Confidence: **medium**. The generator was originally designed to emit script-style code; whether modern ESM output is straightforward (or requires post-processing) is unclear.
  Validate in: **L1**.

- **The Vercel AI SDK v5.x is the current stable line.**
  Confidence: **high**. Verify exact minor/patch and any pending major bumps during the research phase before pinning `package.json`.
  Validate in: **research**.

- **Browser-side `generateText` works without a server proxy if a provider key is exposed.**
  Confidence: **low**. Technically possible but unsafe; some providers may block direct browser origins via CORS. Server-side execution is the safer default.
  Validate in: **L2 / L5**.

- **Zod schemas can be constructed from Blockly blocks at runtime.**
  Confidence: **medium**. Blockly's mutators and nested inputs support recursive structures, but mapping them cleanly to Zod (`z.object`, `z.array`, refinements) needs prototyping.
  Validate in: **L3**.

- **Next.js 15.x supports streaming AI SDK responses via App Router route handlers.**
  Confidence: **high**. Pinning the exact Next.js minor version and confirming Node vs edge runtime behavior is part of the research phase.
  Validate in: **research / L5**.
