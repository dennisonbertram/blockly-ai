# Multi-Step Agents — Complete Reference

## Core Concept

A "multi-step agent" in the AI SDK is `generateText` or `streamText` with:
1. `tools` — what actions the agent can take
2. `stopWhen` — when to stop the loop
3. The model decides the loop progression (call tool → get result → decide next action)

No separate agent loop code is needed — the SDK handles it.

---

## stopWhen — The Loop Controller (v6)

**Evidence (source code):** `packages/ai/src/generate-text/stop-condition.ts`:

```ts
import { stepCountIs, isLoopFinished, hasToolCall } from 'ai';

// Stop after exactly N steps
stopWhen: stepCountIs(5)

// Never stop (loop until natural termination)
stopWhen: isLoopFinished()

// Stop when a specific tool is called (use for explicit "done" signals)
stopWhen: hasToolCall('finalAnswer')

// Custom stop condition
stopWhen: ({ steps }) => {
  return steps.some(s => s.text.includes('COMPLETE'));
}

// Combine: stop at 10 steps OR when 'done' tool fires
stopWhen: [stepCountIs(10), hasToolCall('submitReport')]
```

**Natural termination** (always applies, regardless of `stopWhen`):
- `finishReason !== 'tool-calls'` — model generates text without calling a tool
- Tool with no `execute` is called (human-in-the-loop)
- Tool with `needsApproval: true` is called

**Key semantics:** `stepCountIs(N)` stops after N steps have COMPLETED. So with `stepCountIs(3)`, the loop runs steps 0, 1, 2 and stops before step 3.

---

## ToolLoopAgent — Reusable Agent (v6)

For production, prefer `ToolLoopAgent` over repeated `generateText` for the same agent config:

```ts
import { ToolLoopAgent, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';

export const researchAgent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  instructions: 'You are a research assistant. Use tools to find information, then summarize your findings.',
  tools: {
    search: searchTool,
    summarize: summarizeTool,
    save: saveTool,
  },
  stopWhen: stepCountIs(10),
  temperature: 0,
});

// Generate (non-streaming)
const result = await researchAgent.generate({
  prompt: 'Research the history of transformer neural networks.',
});

// Stream
const stream = researchAgent.stream({
  messages: [{ role: 'user', content: 'Research quantum computing.' }],
});
```

**Key difference from `generateText`:** `ToolLoopAgent` is instantiated ONCE and called many times. `generateText` is called each time. For route handlers serving many requests, `ToolLoopAgent` avoids repeated config.

**Evidence:** `examples/next-agent/agent/weather-agent.ts` — `new ToolLoopAgent({ model: openai('gpt-4o'), instructions: '...', tools: { weather: weatherTool } })`.

---

## 3-Step Agent Example: Research → Summarize → Save

```ts
import { generateText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Simulated tools
const researchTool = tool({
  description: 'Search and retrieve information about a topic from the knowledge base.',
  inputSchema: z.object({
    query: z.string().describe('The research query'),
    depth: z.enum(['quick', 'thorough']).describe('Research depth'),
  }),
  execute: async ({ query, depth }) => ({
    query,
    findings: `[Simulated ${depth} research results for: ${query}]`,
    sources: ['source1.com', 'source2.edu'],
    wordCount: depth === 'thorough' ? 1500 : 300,
  }),
});

const summarizeTool = tool({
  description: 'Create a structured summary from raw research findings.',
  inputSchema: z.object({
    content: z.string().describe('The raw research content to summarize'),
    maxWords: z.number().describe('Target word count for summary'),
  }),
  execute: async ({ content, maxWords }) => ({
    summary: `[Simulated ${maxWords}-word summary of: ${content.substring(0, 50)}...]`,
    keyPoints: ['Point 1', 'Point 2', 'Point 3'],
  }),
});

const saveTool = tool({
  description: 'Save the final report to the database.',
  inputSchema: z.object({
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()),
  }),
  execute: async ({ title, content, tags }) => ({
    saved: true,
    id: `report-${Date.now()}`,
    title,
    tags,
  }),
});

async function runResearchAgent(topic: string) {
  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    tools: { research: researchTool, summarize: summarizeTool, save: saveTool },
    stopWhen: stepCountIs(8),  // generous budget for 3-tool chain
    system: `You are a research agent. When given a topic:
1. First use the 'research' tool to gather information (use 'thorough' depth)
2. Then use the 'summarize' tool to condense findings to 200 words
3. Finally use the 'save' tool to persist the report with relevant tags
4. Then provide a brief confirmation message`,
    prompt: `Research and document: ${topic}`,
    temperature: 0,
    onStepFinish: async ({ steps, toolResults }) => {
      console.log(`Step ${steps.length} complete. Tools called: ${toolResults.map(r => r.toolName).join(', ')}`);
    },
  });

  console.log('\nAgent completed!');
  console.log(`Steps taken: ${result.steps.length}`);
  console.log(`Tools used: ${result.toolCalls.map(tc => tc.toolName).join(' → ')}`);
  console.log(`Final message: ${result.text}`);
  
  return result;
}

// Usage
runResearchAgent('the future of quantum computing');
```

---

## State Management Across Steps

The SDK manages state via the `messages` array — each step appends its output to the conversation:

```ts
// After each step, the messages array grows:
// Step 1: [user, assistant(tool-call)]
// Step 2: [user, assistant(tool-call), tool(result), assistant(text/tool-call)]
// etc.

// Access intermediate state via result.steps
result.steps.forEach((step, i) => {
  console.log(`Step ${i}: ${step.toolCalls.map(tc => tc.toolName)}`);
  console.log(`  Text: ${step.text.substring(0, 100)}`);
  console.log(`  Usage: ${step.usage.inputTokens}→${step.usage.outputTokens}`);
});

// The full accumulated message history:
result.response.messages  // all messages including tool calls/results
```

To continue a conversation after the run, save `result.response.messages` and pass them back as `messages` in the next call.

---

## prepareStep: Modifying Params Per Step

```ts
const result = await generateText({
  model: openai('gpt-4o'),
  tools: { ... },
  stopWhen: stepCountIs(10),
  prompt: 'Do a complex task.',
  prepareStep: async ({ steps, model, messages }) => {
    // Called before each step
    // Return modified params for this step
    const stepCount = steps.length;
    if (stepCount > 5) {
      // Switch to more capable model for later steps
      return { model: openai('gpt-4o') };
    }
    // Return empty object to use defaults
    return {};
  },
});
```

---

## Reasoning Models: Caveats (o1, Claude extended thinking)

- o1/o3: these models do NOT support tool calling in the same way as GPT-4o. Tool calls are supported but structured differently. Verify with the specific model.
- Anthropic extended thinking: requires `providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: N } } }`. Thinking tokens count toward context and cost.
- Both reasoning model types generate significantly more tokens per step — set `maxOutputTokens` carefully and budget `stepCountIs` conservatively.
- Reasoning content appears in `result.reasoning` / `result.reasoningText`, separate from `result.text`.
- With `streamText`, reasoning arrives in `fullStream` as `'reasoning'` typed chunks.

---

## Token Accumulation Warning

In multi-step loops, each step re-sends the full conversation history. With 5 steps:
- Step 1: ~100 input tokens
- Step 2: ~300 input tokens (step 1 messages added)
- Step 3: ~600 input tokens
- ...

Total input tokens ≠ just the final step's input. Use `result.totalUsage` (not `result.usage`) for the true total across all steps.

**Evidence:** `ai-sdk.dev/docs/reference/ai-sdk-core/generate-text` — result includes both `usage` (last step) and `totalUsage` (across all steps).
