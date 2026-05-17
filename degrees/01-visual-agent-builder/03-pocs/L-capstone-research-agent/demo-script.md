# Demo Script — L-capstone Research Agent

## Prerequisites

- Next.js dev server running: `npm run dev` in `source/`
- Browser open to `http://localhost:3000`
- (Optional for live model) `.env.local` with `ANTHROPIC_API_KEY=<key>`

---

## Step 1: Load the Demo Program

1. Open `http://localhost:3000` in your browser.
2. You will see an empty Blockly workspace and an "Output" pane.
3. Click the **"Load Demo"** button (blue, top-left of the controls).
4. The workspace populates with the capstone block program:
   - Two **OutputSink** blocks stacked vertically
   - First sink feeds a **GenerateObject** block (schema: title, key_points, sources)
   - Second sink feeds an **Agent** block (stopWhen=5) with two Tool blocks (search + fetch)

---

## Step 2: Run the Program

1. Click the green **"Run"** button.
2. The output pane will show streaming results:
   - First: the structured JSON summary object with `title`, `key_points`, and `sources` fields
   - Second: the agent loop result text
3. The run completes in a few seconds (mock stubs run instantly in dev mode).

---

## Step 3: Swap the Model

1. In the workspace, find the **Model** block connected to the **Agent** block.
2. Change the provider dropdown from `anthropic` to `openai`.
3. Change the model name field to `gpt-4o-mini`.
4. Click **"Run"** again.
5. The output pane shows equivalent results using the OpenAI provider.

---

## Step 4: Modify the Schema

1. In the workspace, find the **ZodObject** block inside the **GenerateObject** block.
2. Add a new **ZodField** block at the bottom of the fields stack:
   - Field name: `tags`
   - Type: `string[]`
3. Click **"Run"** again.
4. The output pane now shows the structured summary with an additional `tags` array field.

---

## Step 5: Change the Stop Condition

1. Find the **StopCondition** block connected to the **Agent** block.
2. Change the `N` value from `5` to `3`.
3. Click **"Run"**.
4. The agent will now stop after at most 3 steps instead of 5.

---

## Notes for Evaluator

- All tool calls (search, fetch) use stubbed implementations — no real APIs are called.
- Live model testing requires `ANTHROPIC_API_KEY` set in `.env.local`.
- The workspace JSON is saved in `public/demo-program.json` — you can inspect it directly.
- The emitted code can be viewed by opening browser devtools and inspecting the POST body to `/api/run`.
