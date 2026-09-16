# Render V17 environment setup

Required:
- GEMINI_API_KEY=your Gemini API key
- GEMINI_MODEL=gemini-2.5-flash
- KRISHTI_REQUIRE_AUTH=true
- KRISHTI_ADMIN_EMAIL=your admin email
- FIREBASE_SERVICE_ACCOUNT_JSON={...service account JSON...}

Alternative Firebase Admin variables are supported by server.js:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

Never commit Firebase service-account credentials to GitHub.
