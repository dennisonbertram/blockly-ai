/**
 * generate.ts
 *
 * Thin wrapper around javascriptGenerator.workspaceToCode that adds:
 * - Defensive error handling (returns '' + console.warn on failure)
 * - Stable empty-workspace representation (returns '' for empty workspaces)
 *
 * Usage:
 *   import { generate } from './codegen/generate'
 *   const code = generate(workspace)
 */

import * as Blockly from 'blockly/core'
import { javascriptGenerator } from 'blockly/javascript'

/**
 * Generate JavaScript code from the given workspace.
 *
 * @param workspace - A Blockly.Workspace (headless or WorkspaceSvg)
 * @returns Generated JS code string. Returns '' for empty workspaces or on error.
 */
export function generate(workspace: Blockly.Workspace): string {
  try {
    const code = javascriptGenerator.workspaceToCode(workspace)
    // workspaceToCode returns '' for empty workspaces — no special handling needed.
    return code
  } catch (err) {
    console.warn('[generate] Code generation failed — returning empty string.', err)
    return ''
  }
}
