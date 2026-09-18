# KRISHTI AI V18 Plan System

Starting server-side quota foundation:
- Free: 10 chats/day, 100 chats/month, 10 PDF/month, 10 image operations/month, 20 searches/month; ads flag enabled.
- Plus: 40 chats/day, 1,000 chats/month, 50 PDF/month, 50 image operations/month, 100 searches/month; ads flag disabled.
- Pro: 100 chats/day, 3,000 chats/month, 200 PDF/month, 200 image operations/month, 500 searches/month; ads flag disabled.

These are starting limits. They must be recalculated from actual Gemini/image/search/hosting/storage/payment costs before public monetization.

Authenticated `GET /api/usage` returns plan, usage and limits. Chat/image/search endpoints return HTTP 429 when the relevant quota is exhausted.

V18 does NOT pretend to have a payment processor. Paid plans must only be activated after a verified payment/Google Play Billing entitlement is implemented server-side.
