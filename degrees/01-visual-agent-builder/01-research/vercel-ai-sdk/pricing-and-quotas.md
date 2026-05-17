# Pricing and Quotas — Snapshot (2026-05-16)

**Disclaimer:** Pricing changes frequently. Always verify at provider pricing pages before production decisions.

## Anthropic Models

**Source:** `platform.claude.com/docs/en/docs/about-claude/models` (accessed 2026-05-16)

| Model | API ID | Input ($/MTok) | Output ($/MTok) | Context | Max Output |
|-------|--------|----------------|-----------------|---------|-----------|
| Claude Opus 4.7 | `claude-opus-4-7` | $5 | $25 | 1M tokens | 128k tokens |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | $3 | $15 | 1M tokens | 64k tokens |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | 200k tokens | 64k tokens |

MTok = per million tokens.

**Recommended for POC (cheapest Anthropic):** `claude-haiku-4-5` at $1/$5 per MTok.

**SDK string:** `anthropic('claude-haiku-4-5')` or `anthropic('claude-haiku-4-5-20251001')` (pinned).

### Anthropic Additional Pricing Features
- Prompt Caching: reduces input costs for repeated system prompts (check docs for rates)
- Message Batches API: 50% discount for async/batch workloads
- Extended thinking: thinking tokens billed as output tokens

---

## OpenAI Models

**Source:** OpenAI pricing page (403 restricted at time of research; prices below from general knowledge, verify at platform.openai.com/pricing)

| Model | Input ($/MTok) | Output ($/MTok) | Context | Notes |
|-------|----------------|-----------------|---------|-------|
| gpt-4o | ~$2.50 | ~$10 | 128k | Vision, function calling |
| gpt-4o-mini | ~$0.15 | ~$0.60 | 128k | Cheapest general-purpose |
| o3-mini | ~$1.10 | ~$4.40 | 200k | Reasoning model |
| gpt-4.1 | verify | verify | 1M | Latest |

**Recommended for POC (cheapest OpenAI):** `gpt-4o-mini`

**SDK string:** `openai('gpt-4o-mini')`

**Note:** OpenAI pricing was NOT accessible during research (403 error). Numbers above are approximate from training data. Verify at openai.com/api/pricing.

---

## Cost Estimation Formula

```
cost = (inputTokens / 1,000,000) * inputPrice 
     + (outputTokens / 1,000,000) * outputPrice

// Example: Haiku, 500 input + 200 output tokens
// = (500/1M * $1) + (200/1M * $5)
// = $0.0000005 + $0.000001
// = $0.0000015 per call
// = $1.50 per million such calls
```

For multi-step agents, remember:
- Each step re-sends full conversation history
- `result.totalUsage` (not `result.usage`) gives true cumulative tokens
- A 5-step agent can easily use 5-10x the tokens of a single-step call

---

## Rate Limits (Approximate)

### Anthropic (varies by tier and model)
- Free tier: very limited
- Build tier: varies by model (check usage dashboard)
- Common limits: requests per minute (RPM), tokens per minute (TPM), tokens per day (TPD)
- Example: Claude Haiku on Tier 1 — 5 RPM, 25K TPM

### OpenAI
- Tier 1 ($5 spent): 500 RPM for most models
- Rate limit headers: `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests`
- Handle 429 errors with exponential backoff

### SDK Built-in Retries
The AI SDK retries up to `maxRetries: 2` (default) times on retryable errors (isRetryable=true on APICallError). This includes 429 responses. Increase/decrease with the `maxRetries` option.

---

## Cost Optimization Tips

1. **Use cheap models for classification and routing** — `gpt-4o-mini` or `claude-haiku-4-5` for intent detection; expensive model only for actual complex work.
2. **Cap `maxOutputTokens`** — prevents runaway generation costs.
3. **Cap `stopWhen: stepCountIs(N)`** — prevents infinite loops from billing you.
4. **Use `totalUsage` not `usage`** for accurate accounting in multi-step agents.
5. **Prompt caching** — for long system prompts that repeat across requests (Anthropic feature).
6. **Batch API** — for non-realtime workloads (Anthropic offers 50% discount).
7. **Mock in development** — use `MockLanguageModelV3` for all development; only hit real APIs in production.

---

## AI Gateway Pricing

Vercel's AI Gateway may add a small markup on top of provider costs. Check `vercel.com/pricing` for current Gateway pricing. The benefit is a single API key and automatic failover.
