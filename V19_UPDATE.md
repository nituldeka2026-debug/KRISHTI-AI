# KRISHTI AI V19 — Production Foundation

V19 is based on the latest `KRISHTI-AI-main (4).zip`. It keeps the existing ChatGPT-like UI, Firebase authentication, PDF chat, image tools, web search, memory and admin dashboard while adding server-side usage protection.

## Added
- Server-side Free / Plus / Pro limit definitions.
- `/api/usage` authenticated endpoint.
- Persistent local usage counters in `data/usage.json`.
- Daily + monthly chat limits.
- Monthly PDF/document, image and web-search limits.
- Structured `429` responses when Krishti or Gemini is rate-limited.
- Gemini `429` errors are no longer retried three times.
- Personal Dashboard now displays plan and server usage.
- Default model updated to the stable `gemini-3.6-flash`; override with `GEMINI_MODEL`.
- Version updated to 19.0.0.

## Default limits
| Plan | Chats/day | Chats/month | PDFs/month | Images/month | Searches/month | Ads |
|---|---:|---:|---:|---:|---:|---|
| Free | 10 | 100 | 10 | 10 | 20 | Yes |
| Plus | 40 | 1,000 | 50 | 50 | 100 | No |
| Pro | 100 | 3,000 | 200 | 200 | 500 | No |

## Testing Plus/Pro without payment
For development only, you can set Render environment variables:
- `KRISHTI_PREMIUM_EMAILS=user@example.com`
- `KRISHTI_PRO_EMAILS=pro@example.com`

These are manual test entitlements, not a payment system. Do not use them as a production subscription mechanism. V20+ should connect real billing and server-side entitlement verification before charging users.

## Important Render note
`data/usage.json` is server-side, but a normal Render filesystem may not be a durable database across service replacement/redeploy. For production, move usage counters to Firestore/Postgres before relying on them for billing or strict quotas.

## Gemini limit message
Gemini API rate limits are project-level and can include RPM, TPM and RPD. A `429` should be treated as a quota/rate-limit condition, not as a frontend/PDF UI failure.
