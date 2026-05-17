/**
 * generate.ts
 *
 * Public generate(workspace) → emitted async ES module source.
 *
 * Thin wrapper around generateAsyncModule that adds defensive error handling.
 */

import * as Blockly from 'blockly/core'
import { generateAsyncModule } from './async-generator'

/**
 * Generate an async ES module from the given Blockly workspace.
 *
 * @param workspace - A Blockly.Workspace (headless or WorkspaceSvg)
 * @returns Emitted ES module source string (always includes import header + run() wrapper).
 *          Returns the header + empty run() on error.
 */
export function generate(workspace: Blockly.Workspace): string {
  try {
    return generateAsyncModule(workspace)
  } catch (err) {
    console.warn('[generate] Code generation failed — returning empty run() shell.', err)
    return [
      `import { generateText } from 'ai';`,
      '',
      `export default async function run({ model: __model_provider, sink: __sink } = {}) {`,
      `}`,
      '',
    ].join('\n')
  }
}
