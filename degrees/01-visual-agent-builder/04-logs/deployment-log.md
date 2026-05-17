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

No entries yet.
