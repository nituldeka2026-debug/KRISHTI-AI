// =========================================================
// KRISHTI AI V7 — FIREBASE AUTHENTICATION
// =========================================================
// Replace these values with your Firebase Web App config.
// Firebase Console -> Project settings -> Your apps -> Web app.
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBv2id8Z1Hgl-XpZ7vLI2PCj8RBHei4aLI",
    authDomain: "krishti-ai.firebaseapp.com",
    projectId: "krishti-ai",
    storageBucket: "krishti-ai.firebasestorage.app",
    messagingSenderId: "310942594582",
    appId: "1:310942594582:web:c46a9a49595d7c54e52737"
};

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const emailAuthForm = document.getElementById("emailAuthForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const emailLoginButton = document.getElementById("emailLoginButton");
const googleLoginButton = document.getElementById("googleLoginButton");
const authModeButton = document.getElementById("authModeButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const togglePassword = document.getElementById("togglePassword");
const authError = document.getElementById("authError");
let authMode = "login";
let firebaseAuth = null;

function showAuthError(message) {
    if (!authError) return;
    authError.textContent = message;
    authError.hidden = false;
}
function clearAuthError() { if (authError) authError.hidden = true; }
function setAuthMode(mode) {
    authMode = mode;
    clearAuthError();
    emailLoginButton.textContent = mode === "login" ? "Log in" : "Create account";
    authModeButton.textContent = mode === "login" ? "Create an account" : "Already have an account? Log in";
    forgotPasswordButton.hidden = mode !== "login";
}
function friendlyAuthError(error) {
    const map = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account was found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/email-already-in-use": "An account already exists with this email.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
        "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase yet.",
        "auth/too-many-requests": "Too many attempts. Please try again later."
    };
    return map[error?.code] || error?.message || "Authentication failed. Please try again.";
}

let recaptchaVerifier = null;
let phoneConfirmationResult = null;

function setupRecaptcha() {
    if (!firebaseConfigured() || recaptchaVerifier) return;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
        size: "invisible",
        callback: () => {}
    });
    recaptchaVerifier.render().catch(() => {});
}

async function sendPhoneOTP() {
    if (!firebaseConfigured()) {
        showToast("Firebase login is not configured.");
        return;
    }
    const phone = (document.getElementById("phone-number")?.value || "").trim();
    if (!/^\+\d{8,15}$/.test(phone)) {
        showToast("Enter phone number with country code, e.g. +919876543210");
        return;
    }
    try {
        setupRecaptcha();
        phoneConfirmationResult =
            await firebaseAuth.signInWithPhoneNumber(phone, recaptchaVerifier);
        document.getElementById("phone-otp-section")?.classList.remove("hidden");
        showToast("OTP sent successfully.");
    } catch (error) {
        console.error(error);
        if (recaptchaVerifier) {
            try { recaptchaVerifier.clear(); } catch {}
            recaptchaVerifier = null;
        }
        showToast(mapFirebaseError(error));
    }
}

async function verifyPhoneOTP() {
    const otp = (document.getElementById("phone-otp")?.value || "").trim();
    if (!phoneConfirmationResult) {
        showToast("First request an OTP.");
        return;
    }
    if (!/^\d{6}$/.test(otp)) {
        showToast("Enter the 6-digit OTP.");
        return;
    }
    try {
        await phoneConfirmationResult.confirm(otp);
        phoneConfirmationResult = null;
        showToast("Phone login successful.");
    } catch (error) {
        console.error(error);
        showToast(mapFirebaseError(error));
    }
}

function firebaseConfigured() {
    return window.firebase && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("YOUR_") && FIREBASE_CONFIG.projectId && !FIREBASE_CONFIG.projectId.startsWith("YOUR_");
}
function showApp(user) {
    if (authScreen) authScreen.hidden = true;
    if (appShell) appShell.hidden = false;
    window.KRISHTI_USER = user;
}
function showAuth() {
    if (appShell) appShell.hidden = true;
    if (authScreen) authScreen.hidden = false;
}
function initAuth() {
    if (!firebaseConfigured()) {
        showAuthError("Firebase login is not configured yet. Add your Firebase Web App config in script.js.");
        return;
    }
    try {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        firebaseAuth = firebase.auth();
        firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        firebaseAuth.onAuthStateChanged(user => user ? showApp(user) : showAuth());
    } catch (error) {
        console.error(error);
        showAuthError("Could not start login. Please check the Firebase configuration.");
    }
}
emailAuthForm?.addEventListener("submit", async (event) => {
    event.preventDefault(); clearAuthError();
    if (!firebaseAuth) return showAuthError("Firebase login is not configured yet.");
    const email = authEmail.value.trim(); const password = authPassword.value;
    try {
        emailLoginButton.disabled = true;
        if (authMode === "login") await firebaseAuth.signInWithEmailAndPassword(email, password);
        else await firebaseAuth.createUserWithEmailAndPassword(email, password);
    } catch (error) { showAuthError(friendlyAuthError(error)); }
    finally { emailLoginButton.disabled = false; }
});

googleLoginButton?.addEventListener("click", async () => {
    clearAuthError();
    if (!firebaseAuth) return showAuthError("Firebase login is not configured yet.");
    try { await firebaseAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
    catch (error) { showAuthError(friendlyAuthError(error)); }
});
authModeButton?.addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
togglePassword?.addEventListener("click", () => { authPassword.type = authPassword.type === "password" ? "text" : "password"; });
forgotPasswordButton?.addEventListener("click", async () => {
    clearAuthError(); const email = authEmail.value.trim();
    if (!email) return showAuthError("Enter your email first, then tap Forgot password.");
    if (!firebaseAuth) return showAuthError("Firebase login is not configured yet.");
    try { await firebaseAuth.sendPasswordResetEmail(email); showAuthError("Password reset email sent. Check your inbox."); }
    catch (error) { showAuthError(friendlyAuthError(error)); }
});

// Add account controls to the existing sidebar.
function addAccountControls() {
    const bottom = document.querySelector(".sidebar-bottom");
    if (!bottom || document.getElementById("accountControls")) return;
    const box = document.createElement("div"); box.id = "accountControls"; box.className = "account-controls";
    box.innerHTML = `<div class="account-email" id="accountEmail"></div><button type="button" id="logoutButton" class="logout-button">↪ Log out</button>`;
    bottom.prepend(box);
    const email = document.getElementById("accountEmail"); if (email) email.textContent = window.KRISHTI_USER?.email || "Signed in";
    document.getElementById("logoutButton")?.addEventListener("click", async () => { if (firebaseAuth) await firebaseAuth.signOut(); });
}
const _showApp = showApp;
showApp = function(user) {
    _showApp(user);
    addAccountControls();
    // Switch history namespace to this authenticated user.
    if (typeof loadHistory === "function") {
        loadHistory();
        const latest = chats.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
        currentChatId = latest ? latest.id : null;
        currentMessages = latest && Array.isArray(latest.messages) ? latest.messages.slice() : [];
        if (typeof renderHistory === "function") renderHistory();
        if (typeof updateCurrentTitle === "function") updateCurrentTitle();
    }
};

initAuth();

// =========================================================
// KRISHTI AI V2 — FRONTEND SCRIPT
// =========================================================

const chatForm =
    document.getElementById("chatForm");

const userInput =
    document.getElementById("userInput");

const sendButton =
    document.getElementById("sendButton");

const voiceButton =
    document.getElementById("voiceButton");

const messagesContainer =
    document.querySelector(".messages");

const welcomeSection =
    document.querySelector(".welcome");

const newChatButton =
    document.getElementById("newChat");

const quickButtons =
    document.querySelectorAll("[data-prompt]");


// =========================================================
// DOCUMENT ELEMENTS
// =========================================================

const attachButton =
    document.getElementById("attachButton");

const documentInput =
    document.getElementById("documentInput");

const documentUploadArea =
    document.getElementById("documentUploadArea");

const chooseDocument =
    document.getElementById("chooseDocument");

const selectedDocument =
    document.getElementById("selectedDocument");


const photoButton =
    document.getElementById("photoButton");

const imageInput =
    document.getElementById("imageInput");

const imageAttachment =
    document.getElementById("imageAttachment");

const imagePreview =
    document.getElementById("imagePreview");

const imageName =
    document.getElementById("imageName");

const removeImageButton =
    document.getElementById("removeImage");


// =========================================================
// STATE
// =========================================================

let isSending = false;

let selectedFile = null;
let selectedImage = null;

// =========================================================
// LOCAL CHAT HISTORY V6
// =========================================================
const HISTORY_KEY_BASE = "krishti_ai_chat_history_v2_";
function getHistoryKey() { return HISTORY_KEY_BASE + (window.KRISHTI_USER?.uid || "guest"); }
const historyList = document.getElementById("chatHistoryList");
const historySearch = document.getElementById("historySearch");
const historySearchButton = document.getElementById("historySearchButton");
const renameChatButton = document.getElementById("renameChatButton");
const currentChatTitle = document.getElementById("currentChatTitle");
const toast = document.getElementById("toast");
const settingsButton = document.getElementById("settingsButton");

let chats = [];
let currentChatId = null;
let currentMessages = [];
let historySearchOpen = false;
let restoringChat = false;

function loadHistory() {
    try {
        const raw = localStorage.getItem(getHistoryKey());
        chats = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(chats)) chats = [];
    } catch (error) {
        console.error("History load error:", error);
        chats = [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem(getHistoryKey(), JSON.stringify(chats));
    } catch (error) {
        console.warn("History could not be saved:", error);
    }
}

function makeChatId() {
    return "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function createChat() {
    const chat = {
        id: makeChatId(),
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    };
    chats.unshift(chat);
    currentChatId = chat.id;
    currentMessages = [];
    saveHistory();
    renderHistory();
    updateCurrentTitle();
    return chat;
}

function getCurrentChat() {
    return chats.find(chat => chat.id === currentChatId) || null;
}

function ensureCurrentChat() {
    let chat = getCurrentChat();
    if (!chat) chat = createChat();
    return chat;
}

function deriveTitle(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "New Chat";
    return clean.length > 42 ? clean.slice(0, 42).trimEnd() + "…" : clean;
}

function persistMessages() {
    if (restoringChat) return;
    const chat = ensureCurrentChat();
    chat.messages = currentMessages.slice(-100);
    chat.updatedAt = Date.now();
    const firstUser = chat.messages.find(m => m.sender === "user" && m.text);
    if (firstUser && chat.title === "New Chat") chat.title = deriveTitle(firstUser.text);
    saveHistory();
    renderHistory();
    updateCurrentTitle();
}

function updateCurrentTitle() {
    const chat = getCurrentChat();
    if (currentChatTitle) currentChatTitle.textContent = chat?.title || "Krishti AI";
}

function renderHistory(filter = "") {
    if (!historyList) return;
    const query = String(filter || "").toLowerCase().trim();
    const visible = chats
        .slice()
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .filter(chat => !query || String(chat.title || "").toLowerCase().includes(query));

    historyList.innerHTML = "";
    if (!visible.length) {
        historyList.innerHTML = `<div class="history-empty">${query ? "No matching chats" : "Your chats will appear here"}</div>`;
        return;
    }

    visible.slice(0, 50).forEach(chat => {
        const row = document.createElement("div");
        row.className = "history-item" + (chat.id === currentChatId ? " active" : "");
        row.title = chat.title || "New Chat";

        const title = document.createElement("span");
        title.className = "history-item-title";
        title.textContent = chat.title || "New Chat";

        const menu = document.createElement("button");
        menu.type = "button";
        menu.className = "history-item-menu";
        menu.textContent = "⋯";
        menu.title = "Chat options";
        menu.addEventListener("click", event => {
            event.stopPropagation();
            const action = window.prompt("Type: rename or delete", "rename");
            if (!action) return;
            if (action.toLowerCase().startsWith("del")) deleteChat(chat.id);
            else if (action.toLowerCase().startsWith("ren")) renameChat(chat.id);
        });

        row.append(title, menu);
        row.addEventListener("click", () => openChat(chat.id));
        historyList.appendChild(row);
    });
}

function renderStoredMessages(messages) {
    messagesContainer.innerHTML = "";
    (messages || []).forEach(item => {
        if (!item || !item.text) return;
        addMessageDOM(item.text, item.sender || "ai");
    });
    scrollToBottom();
}

function addMessageDOM(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    const bubble = document.createElement("div");
    bubble.className = "message-content";
    bubble.textContent = text;
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    return bubble;
}

function openChat(id) {
    if (isSending) return;
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    currentChatId = chat.id;
    currentMessages = Array.isArray(chat.messages) ? chat.messages.slice() : [];
    restoringChat = true;
    renderStoredMessages(currentMessages);
    restoringChat = false;
    if (welcomeSection) welcomeSection.style.display = currentMessages.length ? "none" : "";
    removeSelectedDocument();
    removeSelectedImage();
    if (documentUploadArea) documentUploadArea.hidden = true;
    if (userInput) { userInput.value = ""; autoResizeInput(); userInput.focus(); }
    updateCurrentTitle();
    renderHistory(historySearch?.value || "");
}

function renameChat(id = currentChatId) {
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    const name = window.prompt("Enter a new chat name:", chat.title || "New Chat");
    if (name === null) return;
    const clean = name.trim();
    if (!clean) return;
    chat.title = clean.slice(0, 80);
    chat.updatedAt = Date.now();
    saveHistory();
    renderHistory(historySearch?.value || "");
    updateCurrentTitle();
}

function deleteChat(id) {
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    if (!window.confirm(`Delete "${chat.title || "New Chat"}"?`)) return;
    chats = chats.filter(item => item.id !== id);
    if (currentChatId === id) {
        currentChatId = null;
        currentMessages = [];
        startFreshChat(false);
    }
    saveHistory();
    renderHistory(historySearch?.value || "");
}

function startFreshChat(createHistoryEntry = true) {
    if (isSending) return;
    messagesContainer.innerHTML = "";
    currentMessages = [];
    currentChatId = null;
    if (welcomeSection) welcomeSection.style.display = "";
    if (userInput) { userInput.value = ""; autoResizeInput(); userInput.focus(); }
    removeSelectedDocument();
    removeSelectedImage();
    if (documentUploadArea) documentUploadArea.hidden = true;
    updateCurrentTitle();
    if (createHistoryEntry) createChat();
    renderHistory(historySearch?.value || "");
}

function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

loadHistory();
if (chats.length) {
    const latest = chats.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    currentChatId = latest.id;
    currentMessages = Array.isArray(latest.messages) ? latest.messages.slice() : [];
} else {
    currentChatId = null;
    currentMessages = [];
}
renderHistory();


// =========================================================
// ADD MESSAGE
// =========================================================

function addMessage(text, sender) {

    const messageDiv =
        document.createElement("div");

    messageDiv.className =
        `message ${sender}`;

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-content";

    bubble.textContent =
        text;

    messageDiv.appendChild(
        bubble
    );

    messagesContainer.appendChild(
        messageDiv
    );

    if (!restoringChat) {
        currentMessages.push({ sender, text: String(text ?? "") });
        persistMessages();
    }

    scrollToBottom();

    return bubble;
}


// =========================================================
// SCROLL
// =========================================================

function scrollToBottom() {

    if (!messagesContainer) {
        return;
    }

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


// =========================================================
// TYPING INDICATOR
// =========================================================

function showTyping() {

    const typing =
        document.createElement("div");

    typing.className =
        "message ai typing-message";

    typing.innerHTML = `
        <div class="message-content typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    messagesContainer.appendChild(
        typing
    );

    scrollToBottom();

    return typing;
}


// =========================================================
// SENDING STATE
// =========================================================

function setSendingState(state) {

    isSending = state;

    if (sendButton) {
        sendButton.disabled = state;
    }

    if (userInput) {
        userInput.disabled = state;
    }

    if (voiceButton) {
        voiceButton.disabled = state;
    }

    if (attachButton) {
        attachButton.disabled = state;
    }

    if (photoButton) {
        photoButton.disabled = state;
    }
}


// =========================================================
// SEND MESSAGE
// =========================================================

async function sendMessage(customMessage = null) {

    if (isSending) {
        return;
    }

    const message =
        customMessage !== null
            ? customMessage.trim()
            : userInput.value.trim();

    const hasImage = !!selectedImage;
    const hasDocument = !!selectedFile;

    if (!message && !hasImage && !hasDocument) {
        return;
    }

    if (welcomeSection) {
        welcomeSection.style.display = "none";
    }

    // Image + prompt uses the image editing endpoint.
    if (hasImage) {
        const image = selectedImage;
        const prompt = message || "Edit this photo naturally and realistically.";

        addImageUserMessage(prompt, image);
        if (userInput) userInput.value = "";
        autoResizeInput();
        removeSelectedImage();

        const typing = showTyping();
        setSendingState(true);

        try {
            const payload = await fileToGeminiPayload(image);
            const response = await fetch("/api/image-edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    image: payload.data,
                    mimeType: payload.mimeType
                })
            });

            if (typing) typing.remove();

            let data = null;
            try { data = await response.json(); } catch (_) {}

            if (!response.ok || !data || !data.success) {
                addMessage(
                    (data && data.error) || "The image could not be generated. Please try again.",
                    "ai"
                );
                return;
            }

            addImageMessage(data.image, data.mimeType || "image/png");

        } catch (error) {
            console.error("Image edit error:", error);
            if (typing) typing.remove();
            addMessage(
                "Connection error while generating the image. Please try again.",
                "ai"
            );
        } finally {
            setSendingState(false);
            if (userInput) userInput.focus();
        }

        return;
    }

    // Normal chat / document chat.
    addMessage(message || "Please analyze the uploaded document.", "user");

    if (userInput) {
        userInput.value = "";
        autoResizeInput();
    }

    const typing = showTyping();
    setSendingState(true);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                document: selectedFile
                    ? await fileToGeminiPayload(selectedFile)
                    : null
            })
        });

        if (typing) typing.remove();

        if (!response.ok) {
            let errorText = await response.text();
            if (!errorText) errorText = "Something went wrong.";
            addMessage(errorText, "ai");
            return;
        }

        const aiBubble = addMessage("", "ai");

        if (!response.body) {
            aiBubble.textContent = await response.text();
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            aiBubble.textContent = fullText;
            scrollToBottom();
        }

        fullText += decoder.decode();
        aiBubble.textContent = fullText || "Sorry, I couldn't generate a response.";
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage && lastMessage.sender === "ai") lastMessage.text = aiBubble.textContent;
        persistMessages();

    } catch (error) {
        console.error("Chat error:", error);
        if (typing) typing.remove();
        addMessage(
            "Connection error. Please check your internet connection and try again.",
            "ai"
        );
    } finally {
        setSendingState(false);
        removeSelectedDocument();
        if (userInput) userInput.focus();
    }
}


function addImageUserMessage(text, file) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user";

    const bubble = document.createElement("div");
    bubble.className = "message-content image-message";

    const img = document.createElement("img");
    img.className = "message-image";
    img.src = URL.createObjectURL(file);
    img.alt = "Uploaded photo";

    const caption = document.createElement("div");
    caption.className = "image-message-caption";
    caption.textContent = text;

    bubble.appendChild(img);
    bubble.appendChild(caption);
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    if (!restoringChat) {
        currentMessages.push({ sender: "user", text: `[Photo] ${text}` });
        persistMessages();
    }
    scrollToBottom();
}


function addImageMessage(base64, mimeType) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai";

    const bubble = document.createElement("div");
    bubble.className = "message-content image-result";

    const img = document.createElement("img");
    img.className = "generated-image";
    img.src = `data:${mimeType};base64,${base64}`;
    img.alt = "Generated image";

    const actions = document.createElement("div");
    actions.className = "image-actions";

    const download = document.createElement("a");
    download.className = "download-image";
    download.href = img.src;
    download.download = "krishti-ai-generated.png";
    download.textContent = "↓ Save image";

    actions.appendChild(download);
    bubble.appendChild(img);
    bubble.appendChild(actions);
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    if (!restoringChat) {
        currentMessages.push({ sender: "ai", text: "[Generated image] Image created successfully. Open the original chat session to generate another image." });
        persistMessages();
    }
    scrollToBottom();
}


function autoResizeInput() {
    if (!userInput) return;
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
}


// =========================================================
// FORM SUBMIT
// =========================================================

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            sendMessage();
        }
    );
}


// =========================================================
// ENTER KEY
// =========================================================

if (userInput) {
    userInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    userInput.addEventListener("input", autoResizeInput);
}


// =========================================================
// PHOTO UPLOAD
// =========================================================

if (photoButton && imageInput) {
    photoButton.addEventListener("click", () => {
        if (!isSending) imageInput.click();
    });
}

if (imageInput) {
    imageInput.addEventListener("change", event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            addMessage("❌ Please choose a JPG, PNG or WEBP photo.", "ai");
            imageInput.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            addMessage("❌ Photo is too large. Please choose an image under 10 MB.", "ai");
            imageInput.value = "";
            return;
        }

        selectedImage = file;

        if (imagePreview) {
            imagePreview.src = URL.createObjectURL(file);
        }
        if (imageName) {
            imageName.textContent = file.name;
        }
        if (imageAttachment) {
            imageAttachment.hidden = false;
        }
        if (userInput) userInput.focus();
    });
}

if (removeImageButton) {
    removeImageButton.addEventListener("click", removeSelectedImage);
}

function removeSelectedImage() {
    selectedImage = null;
    if (imageInput) imageInput.value = "";
    if (imageAttachment) imageAttachment.hidden = true;
    if (imagePreview) imagePreview.removeAttribute("src");
}




// =========================================================
// CONVERT SELECTED FILE FOR GEMINI
// =========================================================

function fileToGeminiPayload(file) {

    return new Promise((resolve, reject) => {

        if (!file) {
            resolve(null);
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const result = String(reader.result || "");
                const comma = result.indexOf(",");

                resolve({
                    name: file.name,
                    mimeType: file.type || "application/pdf",
                    data: comma >= 0 ? result.slice(comma + 1) : result
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(reader.error || new Error("Could not read document."));
        reader.readAsDataURL(file);
    });
}


// =========================================================
// QUICK ACTIONS
// =========================================================

quickButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const prompt =
                    button.dataset.prompt;


                if (!prompt) {
                    return;
                }


                sendMessage(
                    prompt
                );
            }
        );
    }
);


// =========================================================
// DOCUMENT UPLOAD
// =========================================================

function openDocumentPicker() {

    if (!documentInput) {
        return;
    }

    documentInput.click();
}


// =========================================================
// ATTACH BUTTON
// =========================================================

if (attachButton) {

    attachButton.addEventListener(
        "click",
        () => {

            if (isSending) {
                return;
            }


            if (documentUploadArea) {

                documentUploadArea.hidden = !documentUploadArea.hidden;
            }
        }
    );
}


// =========================================================
// CHOOSE DOCUMENT BUTTON
// =========================================================

if (chooseDocument) {

    chooseDocument.addEventListener(
        "click",
        openDocumentPicker
    );
}


// =========================================================
// DOCUMENT SELECT
// =========================================================

if (documentInput) {

    documentInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];


            if (!file) {
                return;
            }


            // Maximum 10 MB
            const maxSize =
                10 * 1024 * 1024;


            if (file.size > maxSize) {

                addMessage(
                    "❌ File is too large. Please select a file smaller than 10 MB.",
                    "ai"
                );


                documentInput.value =
                    "";

                selectedFile =
                    null;

                return;
            }


            selectedFile =
                file;


            // Show selected file
            if (selectedDocument) {

                selectedDocument.innerHTML = `
                    <div>
                        📄 <strong>${escapeHTML(file.name)}</strong>
                    </div>

                    <div style="margin-top:6px; opacity:.7;">
                        ${formatFileSize(file.size)}
                    </div>

                    <button
                        type="button"
                        id="removeDocument"
                        style="
                            margin-top:10px;
                            padding:7px 12px;
                            border:0;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >
                        ❌ Remove
                    </button>
                `;


                const removeButton =
                    document.getElementById(
                        "removeDocument"
                    );


                if (removeButton) {

                    removeButton.addEventListener(
                        "click",
                        removeSelectedDocument
                    );
                }
            }


            if (documentUploadArea) {
                documentUploadArea.hidden = false;
            }
        }
    );
}


// =========================================================
// REMOVE DOCUMENT
// =========================================================

function removeSelectedDocument() {

    selectedFile =
        null;


    if (documentInput) {

        documentInput.value =
            "";
    }


    if (selectedDocument) {

        selectedDocument.innerHTML =
            "";
    }
}


// =========================================================
// FILE SIZE
// =========================================================

function formatFileSize(bytes) {

    if (bytes < 1024) {
        return `${bytes} B`;
    }


    if (bytes < 1024 * 1024) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }


    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}


// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHTML(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================================
// NEW CHAT / HISTORY CONTROLS
// =========================================================

if (newChatButton) {
    newChatButton.addEventListener("click", () => startFreshChat(true));
}

if (renameChatButton) {
    renameChatButton.addEventListener("click", () => renameChat());
}

if (historySearchButton) {
    historySearchButton.addEventListener("click", () => {
        historySearchOpen = !historySearchOpen;
        if (historySearch) {
            historySearch.hidden = !historySearchOpen;
            if (historySearchOpen) {
                historySearch.focus();
            } else {
                historySearch.value = "";
                renderHistory();
            }
        }
    });
}

if (historySearch) {
    historySearch.addEventListener("input", () => renderHistory(historySearch.value));
}

if (settingsButton) {
    settingsButton.addEventListener("click", () => showToast("Settings will be added in the next upgrade."));
}

// =========================================================
// RESTORE LAST CHAT ON LOAD
// =========================================================

if (currentMessages.length) {
    restoringChat = true;
    renderStoredMessages(currentMessages);
    restoringChat = false;
    if (welcomeSection) welcomeSection.style.display = "none";
}
updateCurrentTitle();


// =========================================================
// VOICE INPUT
// =========================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (
    voiceButton &&
    SpeechRecognition
) {

    const recognition =
        new SpeechRecognition();


    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.lang =
        navigator.language ||
        "en-US";


    voiceButton.addEventListener(
        "click",
        () => {

            if (isSending) {
                return;
            }


            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Voice already running."
                );
            }
        }
    );


    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                    .transcript;


            userInput.value =
                transcript;


            userInput.focus();
        };


    recognition.onerror =
        error => {

            console.error(
                "Voice error:",
                error.error
            );
        };
}


else if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        () => {

            alert(
                "Voice input is not supported by this browser."
            );
        }
    );
}


// =========================================================
// SIDEBAR MENU
// =========================================================

const sidebarItems =
    document.querySelectorAll(
        ".sidebar .menu-item"
    );


sidebarItems.forEach(
    item => {

        item.addEventListener(
            "click",
            () => {

                const text =
                    item.textContent
                        .trim()
                        .toLowerCase();


                if (
                    text.includes("developer")
                ) {

                    sendMessage(
                        "I want to learn programming and coding. Help me with code step by step."
                    );
                }


                else if (
                    text.includes("documents")
                ) {

                    if (documentUploadArea) {

                        documentUploadArea.hidden = false;
                    }


                    addMessage(
                        "📄 Choose a document to upload. PDF and text documents are supported in this stage.",
                        "ai"
                    );
                }


                else if (
                    text.includes("images")
                ) {
                    if (imageInput) imageInput.click();
                }


                else if (
                    text.includes("web search")
                ) {

                    sendMessage(
                        "I want to search the web. Explain what I should search for."
                    );
                }
            }
        );
    }
);


// =========================================================
// STARTUP
// =========================================================

if (userInput) {

    userInput.focus();
}


console.log(
    "Krishti AI V2 frontend loaded successfully."
);

console.log(
    "Photo upload + natural language image editing enabled."
);

window.sendPhoneOTP = sendPhoneOTP;
window.verifyPhoneOTP = verifyPhoneOTP;
