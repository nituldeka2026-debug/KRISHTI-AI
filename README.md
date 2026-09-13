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
