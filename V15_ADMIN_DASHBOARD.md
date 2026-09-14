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

On Render, add these environment variables:

- `KRISHTI_ADMIN_EMAIL` = `nitul.deka2026@gmail.com`
- `FIREBASE_PROJECT_ID` = `krishti-ai`
- `FIREBASE_CLIENT_EMAIL` = the `client_email` from your Firebase service-account JSON
- `FIREBASE_PRIVATE_KEY` = the `private_key` from the same JSON. Paste it as a Render secret; escaped `\\n` is supported.

Alternatively, set one secret:

- `FIREBASE_SERVICE_ACCOUNT_JSON` = the complete service-account JSON as one-line JSON.

Get the service account from Firebase Console → Project settings → Service accounts → Generate new private key.

**Never commit or expose this private key.**

## How to use
1. Deploy the V15 project.
2. Sign in with `nitul.deka2026@gmail.com` using Continue with Google.
3. Open **Admin Dashboard** from the sidebar.
4. Other Google accounts will see **My Dashboard** only.

If the server credentials are missing, the app still works normally, but the secure admin analytics endpoint will show a setup message instead of user data.
