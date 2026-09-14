# Krishti AI V15 — Admin + User Dashboard

## What changed
- `nitul.deka2026@gmail.com` is the Krishti admin account.
- Admin users get **Admin Dashboard**.
- All other signed-in users get **My Dashboard**.
- Admin dashboard shows total users, active users, daily users, chats, images, web searches, documents and recent user activity.
- User dashboard shows only the signed-in user's own profile/usage.
- Admin API verifies the Firebase ID token server-side before returning analytics.

## Required Render setup for secure admin analytics
The project uses Firebase Admin SDK on the Node server. Do **not** put a service-account JSON file into the ZIP or frontend.

On Render, the easiest setup is a **Secret File**:

- Render → `krishti-ai-1` → Environment → Secret Files → Add Secret File
- Filename: `firebase-service-account.json`
- Contents: paste the complete Firebase service-account JSON

Render mounts secret files at `/etc/secrets/<filename>` at runtime. This V15 build automatically reads `/etc/secrets/firebase-service-account.json`. You can also use `FIREBASE_SERVICE_ACCOUNT_FILE` for a custom path.

Alternative environment-variable setup is still supported:
- `KRISHTI_ADMIN_EMAIL` = `nitul.deka2026@gmail.com`
- `FIREBASE_PROJECT_ID` = `krishti-ai`
- `FIREBASE_CLIENT_EMAIL` = `client_email` from the service-account JSON
- `FIREBASE_PRIVATE_KEY` = `private_key` from the same JSON
- or `FIREBASE_SERVICE_ACCOUNT_JSON` = complete service-account JSON

Get the service account from Firebase Console → Project settings → Service accounts → Generate new private key.

**Never commit or expose this private key.**

## How to use
1. Deploy the V15 project.
2. Sign in with `nitul.deka2026@gmail.com` using Continue with Google.
3. Open **Admin Dashboard** from the sidebar.
4. Other Google accounts will see **My Dashboard** only.

If the server credentials are missing, the app still works normally, but the secure admin analytics endpoint will show a setup message instead of user data.

## V15.1 Firebase Admin fix
- Automatically reads Render Secret File `/etc/secrets/firebase-service-account.json`.
- Admin statistics now use Firebase Authentication `listUsers()` for the real registered-user count, merged with Krishti activity metrics.
- Normal users still cannot call the admin statistics endpoint because the server verifies the Firebase ID token and admin email.
