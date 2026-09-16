# KRISHTI AI — V16 Step 1–5 Integrated

This build integrates the first five production upgrades in one package.

## Step 1 — Cloud Chat History
- Chats are still cached locally for fast startup.
- Authenticated users also sync chats to Firestore.
- New chat, rename, delete and message updates sync to the user's cloud account.
- Cloud chats are merged on login, enabling cross-device history.

## Step 2 — Cloud Memory
- `remember ...` items sync to Firestore.
- Memory can be cleared from Krishti Control Center.
- Local cache remains available if the network is temporarily unavailable.

## Step 3 — Functional Control Center
- Existing settings remain usable and sync through the authenticated backend.
- Profile, personality, preferences, memory, appearance, chat and tool settings are persisted.
- Library now supports local export/import and latest cloud-backup restore.

## Step 4 — Security
- Chat, search, image, activity, settings and feedback APIs require a valid Firebase ID token.
- Per-user API rate limiting is enabled (default 40 requests/minute; configure `KRISHTI_RATE_LIMIT`).
- The server uses Firebase Admin token verification.
- User IDs for settings/feedback are derived from the verified Firebase token rather than trusted client input.
- Request body size is capped by the existing server limit.

## Step 5 — Backup & Data Management
- Automatic cloud snapshot is created after chat/memory changes when Firestore is available.
- Library supports Export backup, Import backup and Restore cloud backup.
- Cloud backup intentionally stays below Firestore's single-document size limit; use Export backup for large complete archives.

## Required Firebase setup
1. In Firebase Console, create/enable Firestore Database.
2. Publish `firestore.rules` from this project.
3. Keep Firebase Authentication providers enabled as before.
4. On Render, configure Firebase Admin credentials using one of the existing supported methods:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`, or
   - Render Secret File `/etc/secrets/firebase-service-account.json`, or
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
5. Keep `GEMINI_API_KEY` configured on Render.
6. Optional: set `KRISHTI_RATE_LIMIT` to change the per-user requests/minute.

## Important
The cloud backup is Firestore-based. It is not a replacement for a separate long-term database export/Cloud Storage backup strategy. For a Play Store production release, also configure a durable backup policy and test restore before release.
