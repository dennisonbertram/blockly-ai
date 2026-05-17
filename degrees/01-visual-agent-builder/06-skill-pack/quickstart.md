# Quickstart — Run Your First Visual AI Program in 5 Minutes

This guide walks from zero to a running `GenerateText` program using the L5 source as your starting point.

**Prerequisite:** Node 20+, pnpm 9+ (or npm), a terminal, an Anthropic or OpenAI API key.

---

## Version Pins (carry these everywhere)

```json
{
  "ai":                "6.0.184",
  "@ai-sdk/anthropic": "3.0.78",
  "@ai-sdk/openai":    "3.0.64",
  "blockly":           "12.5.1",
  "next":              "15.3.2",
  "zod":               "^3.25.76"
}
```

---

## Step 1 — Install

Navigate to the L5 source or capstone source directory and install:

```bash
cd 03-pocs/L5-deploy-to-vercel/source
# OR
cd 03-pocs/L-capstone-research-agent/source

# If you are on pnpm 10, create pnpm-workspace.yaml first:
cat > pnpm-workspace.yaml << 'EOF'
onlyBuiltDependencies:
  - esbuild
EOF

pnpm install
```

If pnpm 10 blocked esbuild's build script, you will see:
```
Ignored build scripts: esbuild@0.21.5.
```
The `pnpm-workspace.yaml` fix above resolves this. See [troubleshooting/symptom-pnpm-install-fails-esbuild-blocked.md](troubleshooting/symptom-pnpm-install-fails-esbuild-blocked.md).

---

## Step 2 — Set Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...    # or leave blank if using OpenAI only
OPENAI_API_KEY=sk-...           # or leave blank if using Anthropic only
```

**Never** use `NEXT_PUBLIC_` prefix. These keys must stay server-side only.

---

## Step 3 — Start the Dev Server

```bash
pnpm dev
# or
npm run dev
```

Open `http://localhost:3000` in a browser. You should see the Blockly workspace load within 2 seconds. If you see a blank white page, check the browser console — a `window is not defined` error means the `'use client'` + `next/dynamic({ ssr: false })` setup is missing. See [troubleshooting/symptom-ssr-window-not-defined.md](troubleshooting/symptom-ssr-window-not-defined.md).

---

## Step 4 — Drag the Blocks

Build this program in the workspace:

1. From the **AI** toolbox category, drag a **Model** block.
   - Set provider: `anthropic`, model: `claude-haiku-4-5` (or `openai` / `gpt-4o-mini`).

2. Drag a **Prompt** block.
   - Set text: `Tell me a short joke.`

3. Drag a **GenerateText** block.
   - Connect **Model** to the `model:` input.
   - Connect **Prompt** to the `prompt:` input.

4. Drag an **OutputSink** block.
   - Connect the **GenerateText** block to its `value:` input.

The vertical stack from top to bottom: `OutputSink → GenerateText → Model + Prompt`.

---

## Step 5 — Run the Program

Click the green **Run** button. The output pane on the right should stream a short joke within a few seconds.

If you are running without a real API key and want to test the pipeline, modify the route handler to inject a `MockLanguageModelV3`. See [recipes/recipe-mock-language-model-v3.md](recipes/recipe-mock-language-model-v3.md).

---

## Step 6 — Verify the Output

Expected behavior:
- The output pane shows at least one line of text.
- The browser console shows no errors.
- The server terminal shows the POST to `/api/run` returned 200.

If something went wrong, the most common first-run errors are:

| Symptom | Where to look |
|---|---|
| `window is not defined` during build | [symptom-ssr-window-not-defined.md](troubleshooting/symptom-ssr-window-not-defined.md) |
| Double workspace or "already injected" | [symptom-double-blockly-workspace.md](troubleshooting/symptom-double-blockly-workspace.md) |
| `pnpm install` blocked esbuild | [symptom-pnpm-install-fails-esbuild-blocked.md](troubleshooting/symptom-pnpm-install-fails-esbuild-blocked.md) |
| Route returns 504 / times out | [symptom-route-handler-times-out.md](troubleshooting/symptom-route-handler-times-out.md) |
| `TypeError: X is not a function` | [symptom-generated-code-throws-typeerror.md](troubleshooting/symptom-generated-code-throws-typeerror.md) |

---

## What Just Happened

The Blockly workspace serialized your block program to a JSON workspace state. When you clicked Run:

1. The browser POSTed the workspace JSON to `/api/run` (a Next.js route handler).
2. The route handler loaded the workspace on the server (headless, no DOM), regenerated the TypeScript module source from the blocks, stripped the `import`/`export` syntax, and injected the AI SDK modules as positional arguments to `new Function(...)`.
3. The generated `run()` function called `generateText({ model: anthropic('claude-haiku-4-5'), prompt: 'Tell me a short joke.' })`.
4. The result text was streamed back through a `ReadableStream` to your browser's output pane.

The API key never left the server.

---

## Next Steps

- Read [curriculum.md](curriculum.md) for the recommended progression through lessons and labs.
- Read [lessons/01-mount-blockly-safely.md](lessons/01-mount-blockly-safely.md) to understand exactly why `next/dynamic({ ssr: false })` is required.
- Read [reference/v6-api-cheatsheet.md](reference/v6-api-cheatsheet.md) before writing any custom blocks or generators.
- Read [agent-instructions.md](agent-instructions.md) if you are an LLM agent building on top of this system.
