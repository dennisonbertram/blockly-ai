# Implementation Notes — L2 single-generate-text-block

## Async Codegen Approach: Post-Process vs. Subclass finish()

**Decision: Post-process (plain function wrapper)**

The planner spec suggested subclassing `javascriptGenerator` and overriding `finish()`. However, Blockly exports `javascriptGenerator` as a **singleton instance**, not a class. To subclass it you would need `new (Object.getPrototypeOf(javascriptGenerator).constructor)()` which TypeScript has no type information for.

The practical alternative chosen: `generateAsyncModule(workspace)` in `src/codegen/async-generator.ts`:
1. Calls `javascriptGenerator.workspaceToCode(workspace)` to get the raw body.
2. Inspects the body for provider name patterns to determine which imports are needed.
3. Wraps the body in `export default async function run({ model: __model_provider, sink: __sink } = {}) { ... }`.

This produces identical output to a `finish()` override — semantically it IS the finish override, just implemented as a standalone function rather than a class method.

## Compile-Execute Strategy: AsyncFunction Injection

**Decision: `new Function` with injected modules (NOT temp-file dynamic import)**

Vitest runs tests through Vite, which resolves dynamic imports through its module graph. Files written to `/tmp` at runtime are outside the graph and cause `Failed to load url` errors.

The `new Function` approach:
1. Strip `import` statement lines from the emitted source.
2. Strip `export default` from the `run` function declaration.
3. Wrap in a `Function('generateText', 'anthropic', 'openai', body)` factory.
4. Call the factory with the actual (or mock) module values.

This is equivalent in behavior — the same generated code runs, just with ES module syntax removed and modules injected as lexical parameters.

## Module vs. Injected Mode

**Decision: module mode for production, injection wrapper in tests**

The `generate()` function always produces valid ES module output (with `import`/`export`). The test helper `buildRunnable()` in `execute.test.ts` is a test-only translation layer that adapts the module-mode output for `new Function` execution.

This means:
- The emitted code is production-ready out of the box.
- Tests do not change how the generator works.
- The `buildRunnable()` helper is the only place that knows about ES-to-Function translation.

## Block Design Choices

### `ai_model` vs. built-in block
Custom block with PROVIDER dropdown and NAME text field. The dropdown change (anthropic → openai) needs to change the default model name — this requires a custom validator in a future POC (L3+). For L2, the name field defaults to `claude-haiku-4-5` but changing the dropdown does not auto-update the name.

### `ai_prompt` vs. built-in `text` block
Custom `ai_prompt` block chosen over Blockly's built-in `text` block. Rationale: the custom block has an "AI" visual label making it clear in the toolbox, and can be extended with additional metadata (role indicators, template syntax) in future POCs. Functionally equivalent for L2.

### `ai_generate_text` SYSTEM input
The SYSTEM input is always added to the block definition but only included in the generated code if connected. Detection: `block.getInput('SYSTEM')?.connection?.isConnected()`.

### `ai_output_sink` uses `__sink?.()` (optional chaining)
Using optional chaining means `run({ model })` without a `sink` does not throw. The sink is optional in the contract.

## `@ai-sdk/openai` Version Discrepancy

The research file `version-and-current-api.md` specifies `@ai-sdk/openai@3.0.75`. The actual latest published version (2026-05-17) is `3.0.64`. Pinned to `3.0.64`. Documented in `expectation-gap-log.md`.
