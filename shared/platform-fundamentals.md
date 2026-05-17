# Platform Fundamentals — blockly-ai

> Brief stubs to be expanded during research. Versions are tentative and will be pinned in `00-metadata/environment.md` of each degree.

## Language

- **TypeScript** is the baseline for every POC. Strict mode on. Explicit return types on exported functions (see `conventions.md`).
- No plain JavaScript source files in POCs; `.d.ts` and config files are exceptions.

## Runtime

- **Node.js ≥ 20** for server-side and tooling.
- Browser runtime for Blockly itself (Blockly requires a DOM).
- Edge runtime is acceptable for AI SDK route handlers in L5 if it simplifies streaming.

## Package Management

- **pnpm** preferred; `npm` acceptable when a POC's tooling demands it.
- Lockfiles are committed.

## Host Framework

- **Next.js (App Router)** is the default host for POCs that need both browser (Blockly) and server (AI SDK with secret keys) surfaces — i.e., L5 and the capstone.
- Lower-level POCs (L1–L4) may run in a minimal Vite or plain HTML harness if Next.js is overkill.

## DOM / Blockly Constraints

- Blockly runs in a browser context. It mounts to a DOM element and depends on layout and SVG.
- All Blockly-related code paths must be client-only in Next.js (`'use client'` or dynamic import with `ssr: false`).

## Module System

- **ESM** by default. CommonJS is avoided unless a dependency forces it.
- `"type": "module"` in `package.json` where applicable.

## Environment Variables

- LLM provider API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) live in `.env.local` and are never committed.
- Browser-exposed keys (`NEXT_PUBLIC_*`) are avoided for LLM calls; server-side execution via route handlers is the default for any code that touches a real provider.

## Validation

- **Zod** (v3.x) for runtime validation, tool parameter schemas, and structured-output schemas. The AI SDK's surface for tools and `generateObject` is designed around Zod.

## Deployment

- **Vercel** for hosted POCs (L5 and capstone). CLI-based deploys from the repo.
