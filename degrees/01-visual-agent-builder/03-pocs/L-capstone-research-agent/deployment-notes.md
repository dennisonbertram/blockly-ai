# Deployment Notes — L-capstone

## Vercel Deploy Attempt

Vercel CLI is not authenticated in this environment. The same situation as L5 applies.

```
$ vercel deploy
Error: Not authenticated. Please run `vercel login`.
```

## Simulated Deployment Outcome

Based on L5's successful deployment pattern and the fact that:
1. `next build` passes (same codebase as L5 + new blocks)
2. All 43 tests pass with MockLanguageModelV3
3. The new `lib/tools/search.ts` and `lib/tools/fetch.ts` are server-side modules with no browser dependencies
4. The `ai_tool_call` block is imported at module load time in `app/api/run/route.ts`

The deployment would follow the same steps as L5:

```bash
# 1. Set environment variables in Vercel project settings:
#    ANTHROPIC_API_KEY=<key>
#    OPENAI_API_KEY=<key>

# 2. Deploy
vercel --prod

# 3. Expected output:
#    Production: https://blockly-ai-capstone-<hash>.vercel.app
#    Build: 32s, Functions: 1 (api/run), Static: 4 pages
```

## Live Request Verification (gated by RUN_LIVE_MODEL_TESTS=1)

If `ANTHROPIC_API_KEY` is available:
```bash
RUN_LIVE_MODEL_TESTS=1 ANTHROPIC_API_KEY=<key> npm test
```

The capstone e2e tests would run against the real Anthropic API.

## Manual Verification Steps

1. Open the deployed URL in a browser (incognito)
2. Click "Load Demo" to populate the workspace
3. Click "Run" to execute the capstone program
4. Verify the output pane shows a structured summary with `title`, `key_points`, and `sources`

## Why Not Deployed

The Vercel CLI requires interactive authentication (`vercel login`) which cannot be automated
in this agentic workflow. The deployment is simulated rather than executed.

Recommendation: Run `vercel login` interactively, then `vercel --prod` from the `source/` directory.
