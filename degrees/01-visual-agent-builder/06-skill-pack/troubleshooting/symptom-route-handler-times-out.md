# Troubleshooting: Route Handler Times Out on Vercel

## Symptom

The app works locally but the Vercel deployment returns a `504 Gateway Timeout` for `/api/run` requests, particularly for multi-step agent programs or programs with many tool calls.

## Cause Table

| Cause | How to identify | Fix |
|---|---|---|
| `maxDuration` not set | Route handler has no export for `maxDuration` | Add `export const maxDuration = 60` |
| `maxDuration` exceeds plan limit | Function logs show timeout at 10s (Hobby default) | Upgrade plan or reduce agent step count |
| Edge runtime instead of Node.js | Build logs show route on edge runtime | Add `export const runtime = 'nodejs'` |
| Real AI call too slow | Local test with real API key times out at ~60s | Use `stopWhen: stepCountIs(N)` with N ≤ 3 |
| `streamText` awaited | Stream consumed before being piped to response | Remove `await` from `streamText` call |

## Fix — Add Both Exports to the Route Handler

```ts
// app/api/run/route.ts
export const runtime = 'nodejs'       // required — Edge runtime lacks Node.js APIs
export const maxDuration = 60         // Vercel Hobby: 60s max; Pro: up to 800s
```

## Vercel Plan Limits

| Plan | Max function duration |
|---|---|
| Hobby | 60 seconds |
| Pro | 800 seconds |
| Enterprise | Configurable |

## Reducing Agent Step Count

For demo deployments on Hobby plan, limit the agent to 3–5 steps:

```ts
// The Agent block should emit:
stopWhen: stepCountIs(3)   // not 10 or unlimited
```

## Testing Timeout Locally

To simulate a slow response locally:

```bash
curl -X POST http://localhost:3000/api/run \
  -H 'Content-Type: application/json' \
  -d '{"workspaceJson": {...}}' \
  --max-time 60
```

If it completes within 60s locally, the Vercel timeout is due to the plan limit or network latency to the AI provider.

---

## Links

- [Lesson 05: Deploy to Vercel](../lessons/05-deploy-to-vercel.md)
- [Recipe: Server-Side Execution Route Handler](../recipes/recipe-server-side-execution-route-handler.md)
- [Checklist: Pre-Deploy](../checklists/pre-deploy-checklist.md)
- [Back to Index](../index.md)
