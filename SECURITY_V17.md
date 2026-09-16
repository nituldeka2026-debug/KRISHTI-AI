# KRISHTI AI V17 Security

- Firebase ID tokens protect AI, search, image, activity, settings and feedback APIs when KRISHTI_REQUIRE_AUTH=true.
- Per-user/IP in-memory rate limits protect high-cost endpoints.
- Firestore rules restrict chats and memory to the signed-in user's UID.
- Request size and message length are validated.
- Service-account credentials belong only in Render secrets/environment variables.

For a multi-instance production deployment, move rate limiting and analytics from local JSON/in-memory storage to a managed database/Redis layer.
