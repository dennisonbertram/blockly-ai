# L-capstone — Research-and-Summarize Agent

**Status:** Complete (test-verified with MockLanguageModelV3)

## What This POC Demonstrates

The capstone wires together every block category from L2-L4 into a single working program:

| Block Category | Block Type | Used In |
|---|---|---|
| Model | `ai_model` | Agent + GenerateObject |
| Prompt | `ai_prompt` | Agent prompt + GenerateObject prompt |
| Tool | `ai_tool` + `ai_tool_call` | search + fetch stubs |
| Tool Wiring | `ai_use_tools` | Agent tools map |
| Schema | `ai_zod_object` + `ai_zod_field` | Tool inputSchemas + GenerateObject output schema |
| Agent | `ai_agent` + `ai_stop_condition` | Multi-step research loop |
| Structured Output | `ai_generate_object` | Final summary |
| Output | `ai_output_sink` | Stream result to UI |

## Block Program (demo-program.json)

```
OutputSink("summary")
  └── GenerateObject(model=anthropic/claude-haiku-4-5,
                     schema={title, key_points[], sources[]},
                     prompt="Summarize research notes...")

OutputSink("agent_result")
  └── Agent(model=anthropic/claude-haiku-4-5,
            stopWhen=stepCountIs(5),
            prompt="Research visual programming with LLMs...",
            tools=UseTools(
              search: Tool(desc="Web-search...", schema={query}, body=await __tools.search(input.query)),
              fetch:  Tool(desc="Fetch a URL...", schema={url},   body=await __tools.fetch(input.url))
            ))
```

## Tool Stubs

`lib/tools/search.ts` and `lib/tools/fetch.ts` return canned data. No real HTTP or search API calls are made. This makes tests deterministic and keeps the POC cost-free.

The stubs are injected into emitted code via `__tools` (executor parameter injection pattern).

## Running

```bash
npm test                        # all 43 tests (MockLanguageModelV3 only)
npm run dev                     # start Next.js dev server
# visit http://localhost:3000
# click "Load Demo" to pre-populate workspace
# click "Run" to execute
```

For live model testing (requires `ANTHROPIC_API_KEY` in `.env.local`):
```bash
RUN_LIVE_MODEL_TESTS=1 npm test
```
