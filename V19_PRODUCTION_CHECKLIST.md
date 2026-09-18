# V19 Deployment Checklist

1. Deploy this ZIP to the KRISHTI-AI GitHub repository.
2. Confirm Render has `GEMINI_API_KEY` set as a secret.
3. Confirm Firebase Admin service-account credentials are configured.
4. Open `/api/health` and verify version `19.0.0`.
5. Sign in and open My Dashboard → verify Plan & Usage.
6. Test normal chat.
7. Test PDF summary/Q&A.
8. Test image generation/editing.
9. Test web search.
10. Intentionally exceed a local plan limit to verify the friendly 429 message.
11. Do not advertise Plus/Pro as purchasable until real payment and server-side entitlement verification are added.
12. Move usage counters to Firestore/Postgres before production billing.
