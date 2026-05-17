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
