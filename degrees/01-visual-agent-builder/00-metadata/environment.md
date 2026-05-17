# Environment — Visual Agent Builder

> All versions below are **tentative** and will be confirmed during the research phase. Final pinned versions land in each POC's `package.json` and are recorded in `04-logs/command-log.md`.

## Runtime

- **Node.js** ≥ 20 (LTS).
- **Browser**: modern evergreen (Chromium-based + Firefox + Safari latest two majors). Blockly requires a DOM.

## Package Manager

- **pnpm** (preferred). `npm` acceptable for ad-hoc tooling.

## Language

- **TypeScript** 5.x, strict mode.

## Host Framework

- **Next.js** 15.x (App Router). Verify exact minor in research; confirm streaming behavior for AI SDK responses.

## Visual Editor

- **Blockly** — latest stable from `blockly` on npm. Pin during L1 setup.

## AI Runtime

- **`ai`** (Vercel AI SDK) v5.x — confirm exact version in research.
- **`@ai-sdk/anthropic`** — provider adapter for Claude models.
- **`@ai-sdk/openai`** — provider adapter for GPT models.

## Validation

- **Zod** 3.x. Schemas used for tool params and `generateObject` output.

## Tooling

- **Vercel CLI** for deploys in L5 and the capstone.
- **gh** (GitHub CLI) for repo and PR operations.
- **git** for source control.

## Provider Keys

- `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `.env.local` (gitignored). Never exposed to the browser. Server-side execution is the default for any code that touches a real provider.

> **To be confirmed during research**: exact AI SDK minor version, Next.js minor version, Blockly major version, whether `@ai-sdk/anthropic` v1.x or v2.x is current.
