/**
 * imports.ts
 *
 * The pinned import header prepended to every emitted async module.
 * Tracks exactly which providers are needed; the actual header is assembled
 * dynamically in async-generator.ts based on which Model blocks are present.
 *
 * This constant is the FULL header (both providers) — used as a baseline.
 * async-generator.ts will select only the providers needed for the workspace.
 */

export const FULL_IMPORT_HEADER = `import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
`

export const ANTHROPIC_IMPORT_HEADER = `import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
`

export const OPENAI_IMPORT_HEADER = `import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
`

export const BOTH_IMPORT_HEADER = `import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
`
