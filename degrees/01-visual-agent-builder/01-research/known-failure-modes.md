# Known Failure Modes — Combined

Top failure modes synthesized from `blockly/known-failure-modes.md` and `vercel-ai-sdk/known-failure-modes.md`. Each entry: Symptom → Cause → Fix.

## Blockly

1. **SSR crash on import.** Symptom: `ReferenceError: window is not defined` at module-load. Cause: Blockly references browser globals at top-level. Fix: `next/dynamic(() => import('./BlocklyWorkspace'), { ssr: false })`.
2. **React Strict Mode double-inject.** Symptom: workspace mounts twice in dev, second mount errors or shows duplicate UI. Cause: cleanup did not null the workspace ref. Fix: guard with `if (workspaceRef.current) return;` AND set `workspaceRef.current = null` in cleanup.
3. **Events fire during programmatic load.** Symptom: code generator runs on every block-created event during `workspaces.load`, producing partial code. Fix: wrap loads with `Blockly.Events.disable() / enable()`.
4. **Generator returns string for expression block.** Symptom: precedence bug, e.g. `1+2*3` rendered as `(1+2)*3`. Fix: return `[code, javascriptGenerator.ORDER_*]` tuple from expression generators.
5. **Field validator returns `undefined`.** Symptom: invalid values silently accepted. Fix: return `null` to reject.
6. **Generator missing for a block.** Symptom: silent empty output. Fix: register generator; check console for `Unknown block` warnings.
7. **Drag-time codegen.** Symptom: `workspace.toCode()` during a drag produces invalid output traversing insertion markers. Fix: guard with `ws.isDragging()`.

## Vercel AI SDK

8. **`parameters` instead of `inputSchema` in `tool()`.** Symptom: TypeScript inference breaks; tool silently miswired. Fix: use `inputSchema:` in v6.
9. **`maxSteps` instead of `stopWhen`.** Symptom: agent stops after one step. Fix: `stopWhen: stepCountIs(N)`.
10. **Using `generateObject()`.** Symptom: deprecation warning, future removal. Fix: `generateText({ output: Output.object({ schema }) })`.
11. **Calling `toDataStreamResponse()`.** Symptom: function not found. Fix: `toUIMessageStreamResponse()`.
12. **`UIMessage[]` passed to `generateText`.** Symptom: format mismatch, often silent. Fix: `convertToModelMessages(uiMessages)` first.
13. **`result.usage` for multi-step tokens.** Symptom: only counts last step. Fix: `result.totalUsage`.
14. **Vague tool description.** Symptom: model hallucinates instead of calling the tool. Fix: precise, action-oriented description ("Look up the current weather for a given city. Returns temperature and conditions.").
15. **`useChat` in a Server Component / route handler.** Symptom: hook-out-of-context error. Fix: it is a client hook only.
16. **No `stopWhen` set.** Symptom: unbounded loops, runaway cost. Fix: always set a `stopWhen`.
17. **OpenAI strict mode + `.optional()` in Zod schema.** Symptom: structured output fails. Fix: use `.nullable()` for OpenAI strict mode.
18. **Importing `CoreMessage`.** Symptom: TS compile error. Fix: import `ModelMessage` (renamed in v5).

## Combined (Blockly + AI SDK)

19. **Codegen emits stale v4/v5 API names.** Symptom: generated programs throw at runtime. Cause: codegen template not updated when SDK changed names. Fix: golden-output tests + SDK version pin reviewed each upgrade.
20. **Client-side `generateText` exposing keys.** Symptom: API key leaked in bundle. Fix: always execute generated programs server-side via a Next.js route handler.
