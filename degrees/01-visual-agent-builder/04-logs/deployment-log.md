# Deployment Log — Visual Agent Builder

Append-only record of deployments. Every entry captures the target environment, the version (git SHA + tag if any), the outcome, and any post-deploy verification.

## Entry Format

```
## YYYY-MM-DDTHH:MM:SSZ — <short description>

- **Target** (env, URL, account):
- **Version** (git SHA, tag):
- **Command**:
- **Outcome** (success / partial / failure):
- **Verification**:
- **Notes**:
```

## Entries

## 2026-05-17T01:25:00Z — L5 deploy-to-vercel (simulated)

- **Target**: Vercel, hostname TBD (not yet deployed)
- **Version**: git SHA 7e2e12d (regression commit), branch main
- **Command**: `npx vercel deploy --prod --yes` (not executed — see reason)
- **Outcome**: deployment-simulated
- **Verification**: Local build verified (`npm run build` succeeded). All 26 tests pass.
  Vercel CLI v54.1.0 available via npx but unauthenticated (no `vercel login` session).
- **Notes**: Build output confirmed Blockly excluded from server bundle (1.36 kB client chunk).
  API route `/api/run` configured as Node.js runtime (not Edge).
  Full deployment steps documented in `03-pocs/L5-deploy-to-vercel/deployment-notes.md`.
  Follow-up: run `vercel login` then `vercel deploy --prod --yes` from the source directory.

## 2026-05-17T05:53:59Z — L-capstone: Deployment simulated (Vercel unauthenticated)

- **Target**: Vercel (production), same project as L5
- **Version**: git SHA e9f27f8 (capstone implementation)
- **Outcome**: Simulated — Vercel CLI unauthenticated
- **Details**: same as L5 — `vercel whoami` prompts for device code auth.
  next build passes locally (same L5 stack + new tool blocks).
  Deployment steps: run `vercel login` then `vercel --prod` from source/.
- **Notes**: capstone adds no new server-side dependencies beyond L5.
  The tool stubs (search.ts, fetch.ts) are pure TypeScript, no external deps.
  Route handler imports the new ai_tool_call block at module load time.

