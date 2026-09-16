# KRISHTI AI Security Notes

- Never put `GEMINI_API_KEY` or Firebase service-account private keys in frontend files.
- Firebase Web API keys are identifiers, but Firestore/Auth security rules must still be configured correctly.
- Production API endpoints require Firebase ID-token authentication in V16.
- Render must have Firebase Admin credentials configured or protected APIs will return 503.
- Rate limiting is in-memory per server instance. For multi-instance production, move rate limiting to a shared store.
- Firestore rules are owner-only for user data.
