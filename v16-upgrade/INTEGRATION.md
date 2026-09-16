# KRISHTI AI V16 — Integration

## 1. Cloud chat history
Copy `cloud-history.js` into your frontend and import it from the main authenticated chat module.

After each completed assistant response:
```js
await saveChat(currentChatId, currentChatTitle, messages);
```

On login:
```js
const chats = await listChats();
```

When a user opens a previous conversation:
```js
const chat = await loadChat(chatId);
```

When deleting:
```js
await deleteChat(chatId);
```

## 2. Firestore
Deploy `firestore.rules`.

Do NOT put Gemini API keys or Firebase Admin credentials in frontend code.

## 3. Production checklist
- Keep API secrets in Render Environment Variables.
- Verify Firebase ID tokens on the server for protected API routes.
- Add request size limits and rate limiting.
- Validate MIME type and maximum upload size.
- Never trust a client-provided userId.
- Add account deletion that removes the user's cloud data.
- Add privacy policy and terms pages.
- Test login, chat, PDF, image, web search and logout on real Android devices.

## 4. Android / Play Store
The web/PWA can remain the primary frontend. For Play Store packaging, create a dedicated Android wrapper
(e.g. Capacitor) and produce a signed AAB. Set the Android target SDK to the current Google Play requirement
before release, and complete Play Console Data Safety, privacy policy, content declarations and testing.
