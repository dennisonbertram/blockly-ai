# Conventions — blockly-ai

## File and Directory Naming

- Directories: `kebab-case` (e.g., `degrees/01-visual-agent-builder/03-pocs/L2-single-generate-text-block/`).
- Markdown files: lowercase-hyphen slugs (`command-log.md`, `before-you-build/`).
- Numeric prefixes use two digits (`00-metadata`, `01-research`, ...).
- POC directories use an `L<n>-` prefix indicating phase order; the capstone uses `L-capstone-<slug>`.
- Dates in logs and filenames use ISO 8601: `YYYY-MM-DD` and `YYYY-MM-DDTHH:MM:SSZ` when time matters.

## Markdown Structure

- One H1 (`#`) at the top of every document — the title.
- Top-level sections use H2 (`##`); nested sections use H3+.
- Evidence in distillation, research notes, and skill-pack content is labeled inline:
  - `Source:` for primary references (docs, source code, official blogs).
  - `Evidence:` for empirical observations from POCs (with a link to the log entry or commit).
- Code fences use language tags (` ```ts `, ` ```bash `, ` ```json `).

## Commit Format

Conventional Commits, one line per commit subject:

```
type: subject
```

Types in use:

- `feat` — new functionality
- `fix` — bug fix
- `refactor` — code change without behavior change
- `test` — adding or updating tests
- `docs` — documentation only
- `chore` — tooling, scaffolding, dependency bumps

Subjects are lowercase, imperative mood, no trailing period.

## POC Code Style

- TypeScript strict mode (`"strict": true`).
- Explicit return types on every exported function.
- Named exports preferred over default exports.
- Top-of-file comment describing the POC's intent and the lesson it embodies.
- No `any` without a comment explaining why; prefer `unknown` and narrow.
- Side-effectful code (DOM mounting, server starts) lives behind explicit entry points, not at module top level.

## Evidence Labeling Rule

Every load-bearing claim in distillation, skill-pack lessons, recipes, gotchas, patterns, anti-patterns, and playbooks **must** cite a source or evidence. A claim without a citation is a TODO, not content. Acceptable citations:

- A URL to official docs with the doc version visible.
- A path to a file in this repo (POC source, log entry, decision-log entry).
- A specific git commit SHA in this repo.

Distillation content that cannot be cited is moved to `02-planning/` as an open question.
