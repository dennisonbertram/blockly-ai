# Blockly + AI — AI School Ecosystem

## Purpose

This repository is an AI School ecosystem focused on building agent-ready skill packs that demonstrate how to combine Google Blockly with the Vercel AI SDK and modern LLMs. The intent is to produce structured, evidence-backed knowledge that downstream LLM agents can consume to build their own visual agent-builder systems.

## Audience

The primary audience is LLM agents. Every artifact — research notes, POCs, distillation, skill pack — is written so a downstream model can read it, follow the references, and reliably reproduce or extend the work. Human readers are welcome but secondary.

## Structure

The repo is organized into two top-level concerns: `shared/` for cross-degree fundamentals (glossary, platform fundamentals, conventions) and `degrees/` for individual learning tracks. Each degree follows the AI School phase layout (`00-metadata` → `07-evaluation`) so that knowledge progresses from intent through research, planning, POCs, logs, distillation, and a navigable skill pack.

## Status

In-progress. The first degree lives at `degrees/01-visual-agent-builder` and is currently in the scaffolding phase; no research, planning, or POC work has been executed yet.

## Doctrine

The portable AI School doctrine that governs how this repo is structured and operated lives at `../instructions/instructions.md` in the sibling `instructions/` repo. Refer to that document for phase definitions, evidence rules, and append-only logging discipline.
