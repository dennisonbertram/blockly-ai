/**
 * generate.ts — L3
 *
 * Public generate(workspace) → emitted async ES module source.
 * Thin wrapper around generateAsyncModule.
 */

import * as Blockly from 'blockly/core'
import { generateAsyncModule } from './async-generator'

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
