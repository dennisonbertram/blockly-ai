# Scope — Visual Agent Builder

## In Scope

- Mounting and configuring a **Blockly workspace** in a browser host (vanilla page for early POCs, Next.js for later ones).
- **Custom block definitions** for AI primitives, including (but not limited to):
  - `GenerateText` (prompt → text)
  - `GenerateObject` (prompt + Zod schema → typed object)
  - `Tool` (name, description, Zod params, body)
  - `Agent` (multi-step with `maxSteps`)
  - `StreamText` (streaming output)
  - `Branch` and `Loop` control flow
  - `PromptTemplate` (parameterized prompts)
  - `OutputSink` (where results go — console, DOM, server response)
- Using **Blockly's JavaScript code generator** to emit Vercel AI SDK code from a workspace.
- Two execution surfaces: **browser-side** (for early POCs and learning) and **server-side via Next.js API route handlers** (default for anything that touches a real provider key).
- **Streaming output** wired through to a UI in L4 and the capstone.
- **Multi-provider** support via the AI SDK provider abstraction — Anthropic and OpenAI at minimum.
- **Zod schemas** as the bridge between Blockly's typed block inputs and the AI SDK's structured-output / tool surfaces.
- **Deployment to Vercel** for L5 and the capstone.

## Out of Scope

- Other Blockly code generators (Python, Lua, Dart, PHP).
- Native mobile applications (iOS, Android).
- Custom model training, fine-tuning, or LoRA work.
- Non-AI-SDK runtimes (direct provider SDK usage, LangChain, LlamaIndex, etc.).
- Scratch compatibility or Scratch-style cat sprites.
- Gamification, achievement systems, or end-user retention UI.
- Self-hosted or local LLM runtimes (Ollama, llama.cpp, vLLM).
- Polished design / branding work beyond what is required to validate the capstone.
