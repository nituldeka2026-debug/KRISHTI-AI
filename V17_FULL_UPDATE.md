# KRISHTI AI V17 — Full pre-Android update

Integrated before Android packaging:
- Cloud Firestore chat history sync
- Cloud memory sync
- Cloud backup export/import
- Firebase-authenticated settings API client
- Backend API protection/rate limiting hooks
- Security headers and request validation
- PWA/mobile readiness polish

Required Firebase/Render setup:
1. Enable Firestore Database.
2. Publish firestore.rules.
3. Keep Firebase Web App config in script.js.
4. Add FIREBASE_SERVICE_ACCOUNT_JSON (or supported Firebase Admin secret) to Render.
5. Set KRISHTI_REQUIRE_AUTH=true on Render.

Do not put service-account JSON in GitHub.
