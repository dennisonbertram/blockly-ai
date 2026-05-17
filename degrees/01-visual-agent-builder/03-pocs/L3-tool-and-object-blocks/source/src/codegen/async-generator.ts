/**
 * async-generator.ts — L3
 *
 * AsyncJavascriptGenerator: wraps the generated block code in an async ES module.
 * Extended from L2 to support: tool, Output, z imports.
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

  // Build 'ai' named imports
  const aiImports: string[] = ['generateText']
  if (needsTool) aiImports.push('tool')
  if (needsOutput) aiImports.push('Output')
  if (body.includes('stepCountIs(')) aiImports.push('stepCountIs')

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
