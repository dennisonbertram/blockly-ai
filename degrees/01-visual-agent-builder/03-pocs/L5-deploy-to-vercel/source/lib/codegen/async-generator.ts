/**
 * async-generator.ts — L4
 *
 * AsyncJavascriptGenerator: wraps the generated block code in an async ES module.
 * Extended from L3 to support: streamText, hasToolCall imports.
 *
 * Import detection rules:
 * - 'generateText(' in body → import generateText from 'ai'
 * - 'streamText(' in body  → import streamText from 'ai'
 * - 'tool({' in body       → import tool from 'ai'
 * - 'Output.object(' in body → import Output from 'ai'
 * - 'stepCountIs(' in body → import stepCountIs from 'ai'
 * - 'hasToolCall(' in body → import hasToolCall from 'ai'
 * - z.* in body            → import z from 'zod'
 * - 'anthropic(' in body   → import anthropic from '@ai-sdk/anthropic'
 * - 'openai(' in body      → import openai from '@ai-sdk/openai'
 *
 * Key invariant: only include streamText OR generateText if actually used.
 * This protects bundle size (no spurious imports).
 */

import { javascriptGenerator } from 'blockly/javascript'
import type { Workspace } from 'blockly/core'

/** The run() function signature emitted into every module. */
const RUN_SIGNATURE = `export default async function run({ model: __model_provider, sink: __sink } = {}) {`

/**
 * Determine which imports are needed based on the generated body.
 */
function buildImportHeader(body: string): string {
  const needsAnthropic = body.includes('anthropic(')
  const needsOpenai = body.includes('openai(')
  const needsOutput = body.includes('Output.object(')
  const needsZod = body.includes('z.object(') || body.includes('z.string()') || body.includes('z.number()') || body.includes('z.boolean()') || body.includes('z.array(')
  const needsTool = body.includes('tool({')
  const needsGenerateText = body.includes('generateText(')
  const needsStreamText = body.includes('streamText(')

  // Build 'ai' named imports — only include what's actually used
  const aiImports: string[] = []
  if (needsGenerateText) aiImports.push('generateText')
  if (needsStreamText) aiImports.push('streamText')
  if (needsTool) aiImports.push('tool')
  if (needsOutput) aiImports.push('Output')
  if (body.includes('stepCountIs(')) aiImports.push('stepCountIs')
  if (body.includes('hasToolCall(')) aiImports.push('hasToolCall')

  // Fallback: if no ai imports detected, always include generateText (safe default)
  if (aiImports.length === 0) aiImports.push('generateText')

  const lines = [`import { ${aiImports.join(', ')} } from 'ai';`]
  if (needsZod) lines.push(`import { z } from 'zod';`)
  if (needsAnthropic) lines.push(`import { anthropic } from '@ai-sdk/anthropic';`)
  if (needsOpenai) lines.push(`import { openai } from '@ai-sdk/openai';`)

  return lines.join('\n')
}

/**
 * Generate an async ES module string from a Blockly workspace.
 */
export function generateAsyncModule(workspace: Workspace): string {
  const body = javascriptGenerator.workspaceToCode(workspace)
  const importHeader = buildImportHeader(body)

  const indentedBody = body
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : '  ' + line))
    .join('\n')
    .trimEnd()

  return [
    importHeader,
    '',
    RUN_SIGNATURE,
    indentedBody,
    '}',
    '',
  ].join('\n')
}
