# Decision Log — Visual Agent Builder

Append-only record of design and tooling decisions. Every entry names the decision, the alternatives considered, the rationale, and the trade-offs accepted.

## Entry Format

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>

- **Decision**:
- **Alternatives considered**:
- **Rationale**:
- **Trade-offs accepted**:
- **Reversibility** (easy / costly / one-way):
- **Revisit when**:
```

## Entries

## 2026-05-17T00:13:00Z — Use pnpm over npm for L1

- **Decision**: Use pnpm as the package manager for the L1 POC.
- **Alternatives considered**: npm, yarn
- **Rationale**: pnpm is available on this machine (`pnpm@10.33.4`), is faster than npm, and is the monorepo-standard choice. The task contract references pnpm in its commands.
- **Trade-offs accepted**: pnpm 10.x blocks build scripts by default (esbuild workaround needed).
- **Reversibility**: easy (package-lock.json vs pnpm-lock.yaml)
- **Revisit when**: L2+ if workspace setup changes.

## 2026-05-17T00:13:10Z — Use happy-dom over jsdom for test environment

- **Decision**: Use `happy-dom` as the Vitest test environment (specified in `vitest.config.ts`).
- **Alternatives considered**: jsdom
- **Rationale**: Task contract specifies `happy-dom@latest stable`. Both fail for Blockly.inject (same FocusManager issue) so the choice doesn't matter for workspace tests. happy-dom is faster.
- **Trade-offs accepted**: happy-dom has the same Blockly.inject incompatibility as jsdom. Workspace-mount tests must mock inject.
- **Reversibility**: easy (one config line change)
- **Revisit when**: Never for L1. If happy-dom fixes EventTarget compatibility, injection mock can be removed.

## 2026-05-17T00:14:00Z — Use input_value for greet block NAME (not field_input)

- **Decision**: Greet block uses `input_value` connector for NAME rather than `field_input` text field.
- **Alternatives considered**: `field_input` (text embedded in block face)
- **Rationale**: The test fixtures use `inputs.NAME.block` structure which is the JSON serialization of `input_value` connectors. `field_input` would require `fields.GREET_NAME` structure.
- **Trade-offs accepted**: `input_value` requires a text block to be connected; standalone greet block shows an empty slot unless a shadow is configured.
- **Reversibility**: easy (would require fixture changes)
- **Revisit when**: If the greet block is redesigned for L2+ with a simpler UX.

## 2026-05-17T00:28:00Z — L2: Async codegen approach: post-process vs. subclass finish()

- **Decision**: Implement async wrapping as a post-processor (`generateAsyncModule()`) rather than subclassing `javascriptGenerator` and overriding `finish()`.
- **Alternatives considered**: Subclass `javascriptGenerator.constructor` (planner's preferred approach). Post-process the raw `workspaceToCode()` output.
- **Rationale**: Blockly exports `javascriptGenerator` as a singleton instance. The class is accessible via `Object.getPrototypeOf(javascriptGenerator).constructor` but TypeScript doesn't know the constructor's signature, making subclassing fragile and untyped. The post-process approach is strictly equivalent: it intercepts the output of `workspaceToCode` and wraps it — exactly what `finish()` does.
- **Trade-offs accepted**: The post-processor is a separate function call rather than a method override. Callers must call `generateAsyncModule(workspace)` instead of `asyncGenerator.workspaceToCode(workspace)`. The API is slightly more explicit but less surprising.
- **Reversibility**: easy (refactor to subclass if needed in L3+)
- **Revisit when**: L3+ if multiple generators (async vs. sync) need to share an interface.

## 2026-05-17T00:28:30Z — L2: Compile-execute strategy: AsyncFunction injection vs. temp-file dynamic import

- **Decision**: Use `new Function('generateText', 'anthropic', 'openai', body)` with injected modules for test execution.
- **Alternatives considered**: Write emitted source to a temp `.mjs` file and use `await import('file:///tmp/...')`.
- **Rationale**: The temp-file approach fails in Vitest because Vite resolves dynamic imports through its module graph and refuses to load files outside the project root. The `new Function` approach strips ES import/export syntax and injects the real (or mock) modules as parameters — the same code runs, just in a different execution context.
- **Trade-offs accepted**: The test helper (`buildRunnable()`) adds complexity. The emitted module-mode code is not literally "run as-is" in tests — it's adapted. This is documented in both `implementation-notes.md` and `surprises.md`.
- **Reversibility**: easy (swap to temp-file if Vitest adds file:// support for arbitrary paths)
- **Revisit when**: L5 (Node.js server-side execution) — a proper vm sandbox or subprocess approach will be needed anyway.

## 2026-05-17T00:28:45Z — L2: Module vs. injected mode for emitted code

- **Decision**: Always emit module mode (with ES `import`/`export`). Tests use an injection adapter, not a separate "injected mode" generator.
- **Alternatives considered**: Two generator modes: module mode (production) and injected mode (parameters for testing).
- **Rationale**: A single output format is simpler and less error-prone. The test adapter is 20 lines and clearly separated from the generator. Maintaining two codegen modes would require duplicating tests.
- **Trade-offs accepted**: Tests cannot run the emitted code without the `buildRunnable()` adapter.
- **Reversibility**: easy
- **Revisit when**: If the emitted code is tested in a Node.js subprocess or browser E2E at L5.

## 2026-05-17T00:15:00Z — Mock Blockly.inject in workspace-mount tests

- **Decision**: Mock `Blockly.inject` in `workspace-mount.test.tsx` instead of testing with real injection.
- **Alternatives considered**: (1) Use jsdom with real inject. (2) Skip workspace-mount tests. (3) Use Playwright for all component tests.
- **Rationale**: Research docs state UI tests require a real browser. happy-dom/jsdom are incompatible with Blockly's FocusManager. Skipping would leave BT-005 untested. Playwright is out of scope for unit tests. Mocking inject lets us test the React lifecycle (Strict Mode guard) without Blockly DOM dependency.
- **Trade-offs accepted**: The mock doesn't test actual Blockly rendering. The Strict Mode guard logic is tested via a pure unit test simulation and via the `mockInject` call count assertions.
- **Reversibility**: easy (remove mock when Playwright tests are added at L5)
- **Revisit when**: L5 adds Playwright — real E2E tests will cover actual inject behavior.
