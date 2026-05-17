# Blockly Research — Index

Phase 1 deep research into Google Blockly (now maintained by the Raspberry Pi Foundation) for use in a visual agent builder POC that compiles block graphs to runnable JavaScript.

## Files

| File | Summary |
|------|---------|
| `capability-map.md` | What Blockly can and cannot do; major modules and their limits |
| `mental-model.md` | How to think about Blockly — block tree, workspace state, code generation, mutators |
| `setup-and-installation.md` | npm install, version pin, bundler notes, TypeScript, ESM/CJS, React/Next.js mounting |
| `code-generation.md` | `javascriptGenerator`, `forBlock`, `Order` enum, precedence, async, sandboxed execution |
| `custom-blocks.md` | JSON and JS block definitions, all field types, connections, toolbox JSON format |
| `serialization.md` | XML vs JSON workspace save/load, `Blockly.serialization.workspaces.save/load`, migration |
| `testing-model.md` | How Blockly tests itself (mocha + chai), headless workspace testing, sample test pattern |
| `integration-with-frameworks.md` | React/Next.js integration, dynamic import, useEffect mount, react-blockly, state sync |
| `known-failure-modes.md` | Top gotchas: SSR crash, double-mount, bundle bloat, event loops, mutator state loss |
| `version-compatibility.md` | Version pin rationale, v10→v11→v12→v13 breaking changes, deprecations |
| `open-questions.md` | Unresolved questions for POC phase |

## Key Facts (as of 2026-05-16)

- **Version pinned**: `blockly@12.5.1` (npm `latest` tag)
- **Stewardship**: Transferred from Google to Raspberry Pi Foundation on 2025-11-10
- **License**: Apache 2.0
- **Node.js requirement**: `>=18`
- **Only peer dep of note**: `jsdom@26.1.0` (bundled as a dependency, not peerDep)
- **Testing framework**: Mocha + Chai (in the Blockly source repo)
- **Official bundler in examples**: Webpack 5; Vite works but has known ESM quirks
