# Recipe: AsyncJavascriptGenerator Post-Processor

**Use when:** You need Blockly's `workspaceToCode()` to produce `async/await` code for the Vercel AI SDK.

---

## Problem

Blockly's `javascriptGenerator` is a singleton that emits synchronous ES5-style code. The AI SDK requires `await`. There is no official Blockly pattern for async codegen. Subclassing `JavascriptGenerator` fails because it is exported as a singleton instance, not a class.

## Solution

Keep using the singleton. Wrap its output in a plain post-processor function:

```ts
// src/codegen/async-generator.ts
import { javascriptGenerator } from 'blockly/javascript'
import type { Workspace } from 'blockly/core'

const RUN_SIGNATURE =
  `export default async function run({ model: __model_provider, sink: __sink, tools: __tools } = {}) {`

function buildImportHeader(body: string): string {
  const needsAnthropic   = body.includes('anthropic(')
  const needsOpenai      = body.includes('openai(')
  const needsStepCountIs = body.includes('stepCountIs(')
  const needsTool        = body.includes('tool({')
  const needsOutput      = body.includes('Output.object(')

  const aiNames = [
    'generateText',
    ...(body.includes('streamText(')   ? ['streamText']   : []),
    ...(needsTool                       ? ['tool']         : []),
    ...(needsOutput                     ? ['Output']       : []),
    ...(needsStepCountIs                ? ['stepCountIs']  : []),
    ...(body.includes('hasToolCall(')   ? ['hasToolCall']  : []),
  ]

  const lines = [`import { ${aiNames.join(', ')} } from 'ai';`]
  if (needsAnthropic) lines.push(`import { anthropic } from '@ai-sdk/anthropic';`)
  if (needsOpenai)    lines.push(`import { openai }    from '@ai-sdk/openai';`)
  if (body.includes('z.'))
    lines.push(`import { z } from 'zod';`)
  return lines.join('\n')
}

export function generateAsyncModule(workspace: Workspace): string {
  const body = javascriptGenerator.workspaceToCode(workspace)
  const header = buildImportHeader(body)
  const indented = body
    .split('\n')
    .map(l => l.trim() === '' ? '' : '  ' + l)
    .join('\n')
    .trimEnd()
  return [header, '', RUN_SIGNATURE, indented, '}', ''].join('\n')
}
```

## Key Details

- `buildImportHeader` uses **body-substring scanning** — it detects which SDK symbols to import by checking what strings appear in the generated body. Do not pre-declare imports statically.
- The `RUN_SIGNATURE` defines the three injectable parameters: `__model_provider` (the model factory), `__sink` (output callback), `__tools` (tool stubs).
- `generateAsyncModule(workspace)` replaces `javascriptGenerator.workspaceToCode(workspace)` as the public entry point.

## Extend the import header

When adding a new AI SDK call type, add both a positive body-scan entry and the old name to the forbidden list:

```ts
// Add detection for new call type
const needsEmbed = body.includes('embed(')
// Add to aiNames list
...(needsEmbed ? ['embed'] : [])
```

## Usage in tests

```ts
import { generateAsyncModule } from '../src/codegen/async-generator'

const code = generateAsyncModule(workspace)
expect(code).toContain('generateText(')
expect(code).toMatchSnapshot()
```

## Usage in the route handler

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'
import { runEmitted } from 'lib/execute/run-emitted'

export async function POST(req: Request) {
  const { workspaceJson } = await req.json()
  return runEmitted(workspaceJson)
}
```

`runEmitted` calls `generateAsyncModule` internally and then strips imports for execution.

---

## Links

- [Lesson 02: Emit GenerateText v6](../lessons/02-emit-generate-text-v6.md)
- [Recipe: Async Function Body Injection](recipe-async-function-body-injection.md)
- [Recipe: Server-Side Execution Route Handler](recipe-server-side-execution-route-handler.md)
- [Back to Index](../index.md)
