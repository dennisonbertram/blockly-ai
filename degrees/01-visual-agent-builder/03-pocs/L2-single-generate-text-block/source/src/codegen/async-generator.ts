/**
 * async-generator.ts
 *
 * AsyncJavascriptGenerator: wraps the generated block code in an async ES module.
 *
 * ## Design decision: post-process approach
 *
 * The planner spec says to subclass javascriptGenerator. However, the Blockly
 * library exports `javascriptGenerator` as a *singleton instance* of
 * JavascriptGenerator, not a class directly usable as `new JavascriptGenerator()`.
 * The class IS accessible via `javascriptGenerator.constructor` but TypeScript
 * does not know the constructor's type. Calling `new (javascriptGenerator.constructor
 * as new (...args: unknown[]) => unknown)()` would work at runtime but loses all
 * type information.
 *
 * The practical approach used here: create a fresh Blockly.Generator-like wrapper
 * that:
 * 1. Uses the real `javascriptGenerator.workspaceToCode()` to get the raw body.
 * 2. Inspects the body to determine which providers are needed.
 * 3. Wraps the body in the async export default function with the correct imports.
 *
 * This is equivalent to overriding `finish()` conceptually — it intercepts the
 * output of workspaceToCode and post-processes it — but implemented as a plain
 * class rather than fragile constructor introspection.
 *
 * See implementation-notes.md for the rationale.
 */

import { javascriptGenerator } from 'blockly/javascript'
import type { Workspace } from 'blockly/core'

/** The run() function signature emitted into every module. */
const RUN_SIGNATURE = `export default async function run({ model: __model_provider, sink: __sink } = {}) {`

/**
 * Determine which provider imports are needed based on the generated body.
 * Scans for the provider name patterns emitted by the ai_model generator.
 */
function buildImportHeader(body: string): string {
  const needsAnthropic = body.includes('anthropic(')
  const needsOpenai = body.includes('openai(')

  const lines = [`import { generateText } from 'ai';`]
  if (needsAnthropic) lines.push(`import { anthropic } from '@ai-sdk/anthropic';`)
  if (needsOpenai) lines.push(`import { openai } from '@ai-sdk/openai';`)

  return lines.join('\n')
}

/**
 * Generate an async ES module string from a Blockly workspace.
 *
 * The output shape:
 * ```
 * import { generateText } from 'ai';
 * import { anthropic } from '@ai-sdk/anthropic'; // if needed
 *
 * export default async function run({ model: __model_provider, sink: __sink } = {}) {
 *   <generated body>
 * }
 * ```
 */
export function generateAsyncModule(workspace: Workspace): string {
  // Get the raw block body from the standard JS generator
  const body = javascriptGenerator.workspaceToCode(workspace)

  // Build import header based on which providers are referenced in the body
  const importHeader = buildImportHeader(body)

  // Indent the body (4 spaces per line, skip blank lines at start/end)
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
