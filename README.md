# KRISHTI AI V6

Krishti AI with:
- ChatGPT-style interface
- Persistent chat history in the browser
- New Chat / rename / delete / search chats
- PDF/TXT/DOC/DOCX upload support from the existing V4 flow
- Natural-language photo editing through Gemini
- No FAL.ai fallback in this version

## Run

```bash
npm install
npm start
```

Set `GEMINI_API_KEY` in the server environment.

## Render

Keep the existing Start Command:

```text
npm start
```

Environment variable:

```text
GEMINI_API_KEY=your_gemini_api_key
```

## Chat history note

V6 stores chat history in the user's browser `localStorage`. This means history is available on the same browser/device, but it is not yet synced between devices or accounts. A real email login + cloud-synced history is the next phase.


## V7 Login setup
V7 adds real Firebase Authentication with:
- Email/password sign up and login
- Google login
- Forgot-password email
- Persistent browser login session
- Logout
- Local chat history separated by Firebase user UID

### Firebase setup
1. Create a project in Firebase Console.
2. Enable Authentication -> Sign-in method -> Email/Password and Google.
3. Add a Web App and copy its Firebase configuration.
4. Open `script.js` and replace the `YOUR_...` values in `FIREBASE_CONFIG`.
5. In Firebase Authentication -> Settings -> Authorized domains, add your Render domain.
6. Commit/push the project and redeploy on Render.

The Firebase web config is not a password or Gemini API key. Keep `GEMINI_API_KEY` only on the server/Render environment.

Note: this V7 keeps chat history in the user's browser, namespaced by Firebase UID. Cloud-synced history/database is the next phase.


## Firebase Console steps still required
1. Authentication -> Sign-in method -> enable **Email/Password**.
2. Enable **Google** sign-in.
3. Authentication -> Settings -> Authorized domains -> add your deployed Render domain if it is not already listed.
4. Do not enable billing just for these authentication methods.


### Phone OTP login
Phone provider must be enabled in Firebase Authentication > Sign-in method. Test phone numbers are optional for development; real phone numbers can be used for OTP subject to Firebase limits.

## V10 Sidebar Update
The V10 polished build now uses a ChatGPT-inspired left navigation layout: brand/header tools, New chat, Images, Library, Scheduled, Plugins, Projects, Codex, More, Recents, profile area and Settings. The existing app IDs and backend endpoints are preserved.
