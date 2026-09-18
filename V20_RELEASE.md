# KRISHTI AI V20

V20 is based on the user-supplied KRISHTI-AI-main (4) source.

## Included
- Gemini AI remains the AI provider.
- Firebase authentication remains protected by server-side ID-token verification.
- Persistent JSON-backed Free/Plus/Pro usage controls.
- Monthly Plus (₹99) and Pro (₹299) plan definitions.
- User dashboard with plan, usage and auto-renew status.
- Razorpay subscription API structure with live payment disabled until keys and plan IDs are configured.
- Razorpay webhook signature verification.
- Subscription cancellation flow.
- Existing chat, memory, PDF, image, web search and admin features retained.

## Razorpay environment variables
Set these only after creating the merchant account and plans:
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_PLUS_PLAN_ID
- RAZORPAY_PRO_PLAN_ID
- RAZORPAY_WEBHOOK_SECRET

Without these variables, payment endpoints return a clear `PAYMENT_NOT_CONFIGURED` response and do not charge users.

## Important
Usage data is stored in `data/usage.json` and subscriptions in `data/subscriptions.json`. For multi-instance production scaling, move these records to Firestore/Postgres before large-scale launch.
