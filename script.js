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
let firebaseDb = null;

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
function mapFirebaseError(error) {
    return friendlyAuthError(error);
}

function friendlyAuthError(error) {
    const map = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account was found with this email.",
        "auth/wrong-password": "Incorrect password. If you created this account with Google, use Google login or create an email/password account.",
        "auth/invalid-credential": "Email or password is incorrect. Check the password, or use Create an account if this email has no password login.",
        "auth/email-already-in-use": "An account already exists with this email.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
        "auth/operation-not-allowed": "Firebase rejected this sign-in method. For Phone login, check that Phone is enabled AND India is allowed in Authentication → Settings → SMS region policy.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/invalid-phone-number": "Enter a valid mobile number with country code, e.g. +919876543210.",
        "auth/missing-phone-number": "Enter your mobile number first.",
        "auth/quota-exceeded": "SMS limit reached. Please try again later.",
        "auth/captcha-check-failed": "reCAPTCHA verification failed. Please try again.",
        "auth/app-not-authorized": "This website domain is not authorized in Firebase Authentication. Add the current domain in Firebase Authentication → Settings → Authorized domains.",
        "auth/code-expired": "That OTP has expired. Please request a new OTP.",
        "auth/invalid-verification-code": "The OTP is incorrect. Please check and try again.",
        "auth/provider-already-linked": "This sign-in method is already linked to the account.",
        "auth/account-exists-with-different-credential": "An account already exists with another sign-in method. Sign in with that method first.",
        "auth/network-request-failed": "Network error. Check your internet connection and try again.",
        "auth/missing-or-invalid-nonce": "Google sign-in could not be verified. Please try again.",
        "auth/invalid-verification-id": "The OTP session expired. Request a new OTP."
    };
    return map[error?.code] || error?.message || "Authentication failed. Please try again.";
}

function authDiagnostic(error, context = "Authentication") {
    const code = error?.code || "unknown";
    const domain = window.location.hostname || "unknown";
    const project = FIREBASE_CONFIG.projectId || "unknown";
    console.error(`[Krishti Auth Diagnostic] ${context}`, {
        code, message: error?.message || "", domain, project, authDomain: FIREBASE_CONFIG.authDomain
    });
    if (context === "Phone OTP" && code === "auth/operation-not-allowed") {
        return `Phone OTP was rejected by Firebase (code: ${code}). Phone is enabled, so also check Authentication → Settings → SMS region policy and allow India. Domain: ${domain} · Project: ${project}`;
    }
    if (context === "Phone OTP" && code === "auth/unauthorized-domain") {
        return `Firebase rejected this domain (code: ${code}). Current domain: ${domain}. Add it under Authentication → Settings → Authorized domains.`;
    }
    if (context === "Phone OTP" && code === "auth/quota-exceeded") {
        return `Firebase SMS quota is exhausted (code: ${code}). Use a Firebase test phone number while developing or wait for the quota to reset.`;
    }
    if (context === "Phone OTP" && code === "auth/captcha-check-failed") {
        return `reCAPTCHA verification failed (code: ${code}). Reload the page and try again; also confirm the current domain is authorized.`;
    }
    return `${friendlyAuthError(error)} [${code}]`;
}

let recaptchaVerifier = null;
let phoneConfirmationResult = null;
let phoneLastNumber = "";
let otpTimerId = null;
let otpSeconds = 0;

function resetRecaptcha() {
    if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch {}
    }
    recaptchaVerifier = null;
    const box = document.getElementById("recaptcha-container");
    if (box) box.innerHTML = "";
}

async function setupRecaptcha() {
    if (!firebaseAuth) throw new Error("Firebase authentication is not ready.");
    resetRecaptcha();
    const container = document.getElementById("recaptcha-container");
    if (!container) throw new Error("reCAPTCHA container is missing.");
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(container, {
        size: "normal",
        callback: () => clearAuthError(),
        "expired-callback": () => showAuthError("reCAPTCHA expired. Please verify again."),
        "error-callback": () => showAuthError("reCAPTCHA could not load. Check your internet connection and Firebase authorized domain.")
    });
    await recaptchaVerifier.render();
    return recaptchaVerifier;
}

function getPhoneNumber() {
    const code = (document.getElementById("phone-country")?.value || "+91").trim();
    let number = (document.getElementById("phone-number")?.value || "").trim();
    number = number.replace(/[\s()-]/g, "");
    if (number.startsWith("+")) return number;
    return code + number.replace(/^0+/, "");
}

function startOtpTimer(seconds = 30) {
    clearInterval(otpTimerId);
    otpSeconds = seconds;
    const timer = document.getElementById("otpTimer");
    const resend = document.getElementById("resendPhoneOtpButton");
    if (resend) resend.disabled = true;
    const tick = () => {
        if (timer) timer.textContent = otpSeconds > 0 ? `(${otpSeconds}s)` : "";
        if (otpSeconds <= 0) {
            clearInterval(otpTimerId);
            if (resend) resend.disabled = false;
            return;
        }
        otpSeconds -= 1;
    };
    tick();
    otpTimerId = setInterval(tick, 1000);
}

function setPhoneBusy(busy, buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.disabled = busy;
    if (buttonId === "sendPhoneOtpButton") button.textContent = busy ? "Sending OTP…" : "📱 Send OTP";
    if (buttonId === "verifyPhoneOtpButton") button.textContent = busy ? "Verifying…" : "Verify & Login";
}

async function sendPhoneOTP() {
    clearAuthError();
    if (!firebaseConfigured() || !firebaseAuth) {
        showAuthError("Firebase login is not ready. Please reload the page.");
        return;
    }
    const phone = getPhoneNumber();
    if (!/^\+\d{8,15}$/.test(phone)) {
        showAuthError("Enter a valid mobile number. For India, enter 10 digits after +91.");
        document.getElementById("phone-number")?.focus();
        return;
    }
    setPhoneBusy(true, "sendPhoneOtpButton");
    try {
        const verifier = await setupRecaptcha();
        phoneConfirmationResult = await firebaseAuth.signInWithPhoneNumber(phone, verifier);
        phoneLastNumber = phone;
        document.getElementById("phone-otp-section")?.classList.remove("hidden");
        const otp = document.getElementById("phone-otp");
        if (otp) { otp.value = ""; otp.focus(); }
        startOtpTimer(30);
        showToast("OTP sent successfully.");
    } catch (error) {
        console.error("Phone OTP error:", error);
        phoneConfirmationResult = null;
        resetRecaptcha();
        showAuthError(authDiagnostic(error, "Phone OTP"));
        showToast(authDiagnostic(error, "Phone OTP"));
    } finally {
        setPhoneBusy(false, "sendPhoneOtpButton");
    }
}

async function verifyPhoneOTP() {
    clearAuthError();
    const otp = (document.getElementById("phone-otp")?.value || "").replace(/\D/g, "").trim();
    if (!phoneConfirmationResult) {
        showAuthError("Request an OTP first.");
        return;
    }
    if (!/^\d{6}$/.test(otp)) {
        showAuthError("Enter the 6-digit OTP.");
        return;
    }
    setPhoneBusy(true, "verifyPhoneOtpButton");
    try {
        await phoneConfirmationResult.confirm(otp);
        phoneConfirmationResult = null;
        clearInterval(otpTimerId);
        resetRecaptcha();
        document.getElementById("phone-otp-section")?.classList.add("hidden");
        showToast("Phone login successful.");
    } catch (error) {
        console.error("Phone verification error:", error);
        showAuthError(authDiagnostic(error, "Phone verification"));
        showToast(authDiagnostic(error, "Phone verification"));
    } finally {
        setPhoneBusy(false, "verifyPhoneOtpButton");
    }
}

async function resendPhoneOTP() {
    if (otpSeconds > 0) return;
    await sendPhoneOTP();
}

document.getElementById("sendPhoneOtpButton")?.addEventListener("click", sendPhoneOTP);
document.getElementById("verifyPhoneOtpButton")?.addEventListener("click", verifyPhoneOTP);
document.getElementById("resendPhoneOtpButton")?.addEventListener("click", resendPhoneOTP);
document.getElementById("phone-number")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/[^0-9+]/g, "").replace(/(?!^)\+/g, "");
    clearAuthError();
});
document.getElementById("phone-otp")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
});

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
    phoneConfirmationResult = null;
    clearInterval(otpTimerId);
    resetRecaptcha();
    document.getElementById("phone-otp-section")?.classList.add("hidden");
}
function initAuth() {
    if (!firebaseConfigured()) {
        showAuthError("Firebase login is not configured yet. Add your Firebase Web App config in script.js.");
        return;
    }
    try {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        firebaseAuth = firebase.auth();
        if (firebase.firestore) {
            firebaseDb = firebase.firestore();
            try { firebaseDb.settings({ experimentalForceLongPolling: false }); } catch (_) {}
            try { firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (_) {}
        }
        firebaseAuth.languageCode = "en";
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
    window.loadKrishtiSettings?.();
    // Switch history namespace to this authenticated user.
    if (typeof loadHistory === "function") {
        loadHistory();
        const latest = chats.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
        currentChatId = latest ? latest.id : null;
        currentMessages = latest && Array.isArray(latest.messages) ? latest.messages.slice() : [];
        if (typeof renderHistory === "function") renderHistory();
        if (typeof updateCurrentTitle === "function") updateCurrentTitle();
        window.krishtiCloudSync?.();
        window.syncCloudMemoryToLocal?.();
    }
};


// =========================================================
// KRISHTI V15 — USER + ADMIN DASHBOARD
// =========================================================
const KRISHTI_ADMIN_EMAIL = "nitul.deka2026@gmail.com";
function isKrishtiAdmin(user = window.KRISHTI_USER) {
    return String(user?.email || "").trim().toLowerCase() === KRISHTI_ADMIN_EMAIL;
}
async function recordActivity(action="login") {
    try {
        if (!firebaseAuth?.currentUser) return;
        const token = await firebaseAuth.currentUser.getIdToken();
        await fetch("/api/activity", { method:"POST", headers:{"Content-Type":"application/json", "Authorization":"Bearer "+token}, body:JSON.stringify({action}) });
    } catch (e) { console.debug("Krishti activity tracking unavailable", e); }
}
function addDashboardButton() {
    const bottom=document.querySelector(".sidebar-bottom");
    if(!bottom || document.getElementById("dashboardButton")) return;
    const btn=document.createElement("button"); btn.id="dashboardButton"; btn.type="button"; btn.className="settings-button dashboard-button";
    btn.textContent=isKrishtiAdmin()?"📊 Admin Dashboard":"👤 My Dashboard";
    btn.addEventListener("click",openKrishtiDashboard); bottom.insertBefore(btn,bottom.querySelector(".settings-button"));
}
function closeKrishtiDashboard(){ document.getElementById("dashboardView")?.setAttribute("hidden",""); }
async function openKrishtiDashboard(){
    const view=document.getElementById("dashboardView"); if(!view) return;
    view.hidden=false;
    const admin=isKrishtiAdmin();
    document.getElementById("generalDashboard").hidden=admin;
    document.getElementById("adminDashboard").hidden=!admin;
    document.getElementById("dashboardTitle").textContent=admin?"Admin Dashboard":"My Dashboard";
    document.getElementById("dashboardSubtitle").textContent=admin?"Krishti control center for users and usage.":"Your personal Krishti activity at a glance.";
    if(admin) await loadAdminDashboard(); else await loadMyDashboard();
}
async function loadMyDashboard(){
    const u=window.KRISHTI_USER;
    document.getElementById("myDashName").textContent=u?.displayName || "Krishti User";
    document.getElementById("myDashEmail").textContent=u?.email || "Signed in";
    document.getElementById("myDashLastSeen").textContent="Last activity: just now";
    const avatar=document.getElementById("myDashAvatar");
    if(u?.photoURL) avatar.innerHTML=`<img src="${u.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; else avatar.textContent=(u?.displayName||u?.email||"K").charAt(0).toUpperCase();
    // Counts are stored locally for the personal view; no other users are exposed.
    const key="krishti_usage_"+(u?.uid||u?.email||"local"); const usage=JSON.parse(localStorage.getItem(key)||"{}");
    document.getElementById("myChats").textContent=usage.chats||0; document.getElementById("myImages").textContent=usage.images||0; document.getElementById("mySearches").textContent=usage.searches||0; document.getElementById("myDocuments").textContent=usage.documents||0;
}
function bumpPersonalUsage(action){
    const u=window.KRISHTI_USER; if(!u) return; const key="krishti_usage_"+(u.uid||u.email||"local"); const x=JSON.parse(localStorage.getItem(key)||"{}"); const map={chat:"chats",image:"images",search:"searches",document:"documents"}; if(map[action]) x[map[action]]=(x[map[action]]||0)+1; localStorage.setItem(key,JSON.stringify(x));
}
function fmtLastSeen(value){ if(!value) return "—"; const d=new Date(value), diff=Date.now()-d.getTime(); if(diff<60000) return "Just now"; if(diff<3600000) return Math.floor(diff/60000)+"m ago"; if(diff<86400000) return Math.floor(diff/3600000)+"h ago"; return d.toLocaleDateString(); }
async function loadAdminDashboard(){
    const tbody=document.getElementById("adminUsersTable"); if(tbody) tbody.innerHTML='<tr><td colspan="6">Loading secure admin data…</td></tr>';
    try{
        const token=await firebaseAuth.currentUser.getIdToken(true); const r=await fetch("/api/admin/stats",{headers:{Authorization:"Bearer "+token},cache:"no-store"}); const data=await r.json(); if(!r.ok) throw new Error(data.error||"Admin dashboard unavailable");
        document.getElementById("adminEmailLabel").textContent=data.adminEmail||KRISHTI_ADMIN_EMAIL; document.getElementById("adminTotalUsers").textContent=data.totalUsers; document.getElementById("adminActiveUsers").textContent=data.activeUsers; document.getElementById("adminDailyUsers").textContent=data.dailyUsers; document.getElementById("adminTotalChats").textContent=data.totals.chats; document.getElementById("adminTotalImages").textContent=data.totals.images; document.getElementById("adminTotalSearches").textContent=data.totals.searches; document.getElementById("adminTotalDocuments").textContent=data.totals.documents;
        if(tbody) tbody.innerHTML=data.users.length?data.users.map(u=>`<tr><td><div class="admin-user-name">${escapeHtml(u.displayName||"Unnamed user")}</div><div class="admin-user-meta">${escapeHtml(u.uid||"")}</div></td><td>${escapeHtml(u.email||"—")}</td><td>${fmtLastSeen(u.lastSeen)}</td><td>${u.totalChats||0}</td><td>${u.totalImages||0}</td><td>${u.totalSearches||0}</td></tr>`).join(""): '<tr><td colspan="6">No user activity recorded yet.</td></tr>';
    }catch(e){ if(tbody) tbody.innerHTML=`<tr><td colspan="6">${escapeHtml(e.message)}<br><small>Add Firebase Admin server credentials on Render to enable secure analytics.</small></td></tr>`; }
}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
document.getElementById("dashboardClose")?.addEventListener("click",closeKrishtiDashboard);
document.getElementById("adminRefresh")?.addEventListener("click",loadAdminDashboard);
const oldAddAccountControls=addAccountControls;
addAccountControls=function(){ oldAddAccountControls(); addDashboardButton(); recordActivity("login"); };
const oldSendPhone=sendPhoneOTP;
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

const fileAttachment = document.getElementById("fileAttachment");
const fileAttachmentName = document.getElementById("fileAttachmentName");
const fileAttachmentMeta = document.getElementById("fileAttachmentMeta");
const removeFileAttachmentButton = document.getElementById("removeFileAttachment");


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
let activeKrishtiMode = localStorage.getItem("krishti_ai_mode") || "smart";
const MEMORY_KEY = "krishti_ai_memory_v1_";
const LIBRARY_KEY = "krishti_ai_library_v1_";
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

function getMemoryKey(){ return MEMORY_KEY + (window.KRISHTI_USER?.uid || "guest"); }
function getLocalMemory(){ try{return JSON.parse(localStorage.getItem(getMemoryKey())||"[]");}catch{return [];} }
function saveLocalMemory(items){ try{localStorage.setItem(getMemoryKey(),JSON.stringify(items.slice(-50)));}catch{}}
function rememberFromText(text){
    const t=String(text||"").trim();
    const m=t.match(/^(?:remember|please remember|note that)\s*[:,-]?\s*(.+)$/i);
    if(!m) return false;
    const items=getLocalMemory(); items.push({text:m[1].trim().slice(0,300),time:Date.now()}); saveLocalMemory(items); cloudSaveMemory(m[1].trim().slice(0,500));
    addMessage("🧠 Moi eta kotha memory-t save korilu.","ai"); return true;
}
function getLibraryKey(){return LIBRARY_KEY+(window.KRISHTI_USER?.uid||"guest");}
function getLibrary(){try{return JSON.parse(localStorage.getItem(getLibraryKey())||"[]");}catch{return []}}
function saveLibrary(items){try{localStorage.setItem(getLibraryKey(),JSON.stringify(items.slice(-100)));}catch{}}
function addLibraryItem(type,title,meta=""){const a=getLibrary();a.unshift({id:Date.now()+Math.random(),type,title,meta,time:Date.now()});saveLibrary(a);renderLibrary();}
function renderLibrary(){const el=document.getElementById("libraryList");if(!el)return;const a=getLibrary();el.innerHTML=a.length?a.map(i=>`<div class="library-item"><span>${i.type==="image"?"🖼️":i.type==="chat"?"💬":"📌"}</span><div><strong>${escapeHtml(i.title)}</strong><small>${escapeHtml(i.meta||new Date(i.time).toLocaleString())}</small></div></div>`).join(""):"<div class='history-empty'>Library empty. Export a backup or create content to see items here.</div>";}
function escapeHtml(v){const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML;}

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
    cloudSaveChat(chat);
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
    cloudDeleteChat(id);
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

    // Text -> image / Past / Future generation mode.
    if (!hasImage && imageGenerateMode) {
        const prompt = message;
        if (!prompt) return;
        addMessage(prompt, "user");
        if (userInput) { userInput.value = ""; autoResizeInput(); }
        const mode = imageGenerateMode;
        imageGenerateMode = "";
        const typing = showTyping();
        setSendingState(true);
        try {
            bumpPersonalUsage("image"); recordActivity("image");
            const response = await fetch("/api/image-generate", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({prompt, era: mode})
            });
            if (typing) typing.remove();
            let data = null; try { data = await response.json(); } catch (_) {}
            if (!response.ok || !data?.success) {
                addMessage((data && data.error) || "Krishti could not generate the image.", "ai");
                return;
            }
            addImageMessage(data.image, data.mimeType || "image/png");
            addLibraryItem("image", "Generated image", `${mode || "create"} mode`);
        } catch (error) {
            console.error("Image generation error:", error);
            if (typing) typing.remove();
            addMessage("Connection error while generating the image. Please try again.", "ai");
        } finally {
            setSendingState(false);
            if (userInput) userInput.focus();
        }
        return;
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
            bumpPersonalUsage("image"); recordActivity("image");
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

    // Web search mode uses Gemini's grounded Google Search tool.
    if (webSearchMode) {
        addMessage(message, "user");
        if (userInput) { userInput.value = ""; autoResizeInput(); }
        const typing = showTyping();
        setSendingState(true);
        try {
            bumpPersonalUsage("search"); recordActivity("search");
            const response = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            });
            if (typing) typing.remove();
            const aiBubble = addMessage("", "ai");
            const text = await response.text();
            if (!response.ok) { aiBubble.textContent = text || "Web search failed."; return; }
            aiBubble.textContent = text || "No search result was returned.";
            const lastMessage = currentMessages[currentMessages.length - 1];
            if (lastMessage && lastMessage.sender === "ai") lastMessage.text = aiBubble.textContent;
            persistMessages();
        } catch (error) {
            console.error("Web search error:", error);
            if (typing) typing.remove();
            addMessage("Connection error while searching the web. Please try again.", "ai");
        } finally {
            setSendingState(false);
            setWebSearchMode(false);
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
        const modeInstruction = activeKrishtiMode === "fast" ? "Answer quickly and concisely." : activeKrishtiMode === "deep" ? "Reason carefully, verify assumptions, and provide a thorough answer." : activeKrishtiMode === "creative" ? "Be creative, original, and idea-rich while staying accurate." : activeKrishtiMode === "research" ? "Act like a web research assistant; prioritize current, sourced information." : "Be helpful, balanced, clear, and practical.";
        const ks = window.KRISHTI_SETTINGS || {};
        const personalization = [
            ks.personality?.style ? `Personality: ${ks.personality.style}.` : '',
            ks.personality?.customInstructions ? `Custom instructions: ${ks.personality.customInstructions}` : '',
            ks.preferences?.language && ks.preferences.language !== 'Auto' ? `Preferred reply language: ${ks.preferences.language}.` : '',
            ks.preferences?.responseLength ? `Preferred answer length: ${ks.preferences.responseLength}.` : '',
            ks.brain?.memoryEnabled === false ? 'Do not use saved personalization memory.' : ''
        ].filter(Boolean).join('\n');
        const enrichedMessage = `[Krishti ${activeKrishtiMode} mode] ${modeInstruction}\n${personalization ? `\n${personalization}\n` : ''}\nUser: ${message}`;
        bumpPersonalUsage("chat"); recordActivity("chat");
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: enrichedMessage,
                memory: ks.brain?.memoryEnabled === false ? [] : getLocalMemory().slice(-10).map(x=>x.text),
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
        if (event.key === "Enter" && !event.shiftKey && (window.KRISHTI_SETTINGS?.experience?.sendWithEnter !== false)) {
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

            if (fileAttachment) {
                fileAttachment.hidden = false;
                if (fileAttachmentName) fileAttachmentName.textContent = file.name;
                if (fileAttachmentMeta) fileAttachmentMeta.textContent = `${String(file.type || "File").split("/").pop().toUpperCase()} • ${formatFileSize(file.size)}`;
            }
            if (userInput) userInput.focus();

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
    if (fileAttachment) fileAttachment.hidden = true;
    if (fileAttachmentName) fileAttachmentName.textContent = "Document";
    if (fileAttachmentMeta) fileAttachmentMeta.textContent = "Ready to analyse";
}

if (removeFileAttachmentButton) {
    removeFileAttachmentButton.addEventListener("click", removeSelectedDocument);
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
                if (window.innerWidth <= 700) closeSidebar?.();


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
// KRISHTI UI CONTROLS
// =========================================================
const attachmentMenu = document.getElementById("attachmentMenu");
const modeIndicator = document.getElementById("modeIndicator");
let webSearchMode = false;
let imageGenerateMode = "";

function setWebSearchMode(enabled) {
    webSearchMode = !!enabled;
    if (modeIndicator) {
        modeIndicator.hidden = !webSearchMode;
        modeIndicator.textContent = webSearchMode ? "🌐 Web Search mode enabled" : "";
    }
    if (userInput) {
        userInput.placeholder = webSearchMode ? "Search the web with Krishti..." : "Ask Krishti anything...";
    }
}

const sidebarEl = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarClose = document.getElementById("sidebarClose");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileNewChat = document.getElementById("mobileNewChat");

function closeAttachmentMenu() {
    if (attachmentMenu) attachmentMenu.hidden = true;
}
function toggleAttachmentMenu() {
    if (!attachmentMenu || isSending) return;
    attachmentMenu.hidden = !attachmentMenu.hidden;
}
if (attachButton) {
    attachButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleAttachmentMenu();
    };
}
if (attachmentMenu) {
    attachmentMenu.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-attach]");
        if (!button) return;
        const action = button.dataset.attach;
        closeAttachmentMenu();
        if (action === "camera") {
            if (!isSending && imageInput) { imageInput.setAttribute("capture", "environment"); imageInput.click(); }
        } else if (action === "photos") {
            if (!isSending && imageInput) { imageInput.removeAttribute("capture"); imageInput.click(); }
        } else if (action === "files") {
            if (!isSending && documentInput) documentInput.click();
        } else if (action === "web") {
            setWebSearchMode(true);
            imageGenerateMode = "";
            showToast("Web Search mode enabled. Ask Krishti for current information.");
            if (userInput) userInput.focus();
        } else if (action === "generate" || action === "past" || action === "future") {
            imageGenerateMode = action === "past" ? "past" : action === "future" ? "future" : "generate";
            setWebSearchMode(false);
            if (modeIndicator) {
                modeIndicator.hidden = false;
                modeIndicator.textContent = action === "past" ? "⏪ Past Photo mode" : action === "future" ? "⏩ Future Photo mode" : "✨ Create Image mode";
            }
            if (userInput) {
                userInput.placeholder = action === "past" ? "Describe the past photo..." : action === "future" ? "Describe the future photo..." : "Describe the image to create...";
                userInput.focus();
            }
        } else if (action === "plugins") {
            showToast("Plugins panel is ready for connected tools.");
        } else if (action === "think") {
            showToast("Think harder mode selected.");
        }
    });
}
document.addEventListener("click", (event) => {
    if (attachmentMenu && !attachmentMenu.hidden && !event.target.closest(".composer-wrap")) closeAttachmentMenu();
});
function openSidebar() {
    sidebarEl?.classList.add("open");
    sidebarOverlay?.classList.add("show");
}
function closeSidebar() {
    sidebarEl?.classList.remove("open");
    sidebarOverlay?.classList.remove("show");
}
sidebarToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openSidebar();
});
sidebarClose?.addEventListener("click", closeSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);
mobileNewChat?.addEventListener("click", () => { startFreshChat(true); closeSidebar(); });


// =========================================================
// V13 CORE UPGRADE
// =========================================================
const modePicker=document.getElementById("modePicker");
const libraryView=document.getElementById("libraryView");
function setKrishtiMode(mode){activeKrishtiMode=mode;localStorage.setItem("krishti_ai_mode",mode);if(modePicker)modePicker.hidden=true;if(modeIndicator){modeIndicator.hidden=false;modeIndicator.textContent={fast:"⚡ Fast mode",smart:"✨ Smart mode",deep:"🧠 Deep mode",creative:"🎨 Creative mode",research:"🌐 Web Research mode"}[mode]||"✨ Smart mode";}showToast(`Krishti ${mode} mode selected`);}
modePicker?.addEventListener("click",e=>{const b=e.target.closest("button[data-mode]");if(b)setKrishtiMode(b.dataset.mode);});
document.querySelector('[data-attach="modes"]')?.addEventListener("click",()=>{if(modePicker)modePicker.hidden=false;});
function openLibrary(){renderLibrary();if(libraryView)libraryView.hidden=false;}
document.getElementById("libraryButton")?.addEventListener("click",openLibrary);
document.getElementById("libraryClose")?.addEventListener("click",()=>{if(libraryView)libraryView.hidden=true;});
function downloadJson(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
document.getElementById("exportKrishti")?.addEventListener("click",()=>window.exportCloudBackup?.());
document.getElementById("importKrishti")?.addEventListener("click",()=>document.getElementById("importKrishtiInput")?.click());
document.getElementById("importKrishtiInput")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(Array.isArray(data.chats)){chats=data.chats;saveHistory();renderHistory();}if(Array.isArray(data.memory))saveLocalMemory(data.memory);if(Array.isArray(data.library))saveLibrary(data.library);if(data.mode)setKrishtiMode(data.mode);showToast("Krishti backup imported");}catch{showToast("Invalid Krishti backup file");}e.target.value="";});

// Pin/archive controls are stored with each chat.
const oldRenderHistory=renderHistory;
renderHistory=function(filter=""){oldRenderHistory(filter);document.querySelectorAll(".history-item").forEach(row=>{const title=row.querySelector(".history-item-title")?.textContent;const chat=chats.find(c=>c.title===title);if(chat?.pinned)row.classList.add("pinned");});};

// Voice: speech recognition input + spoken Krishti replies.
let krishtiRecognitionV13=null;
if(voiceButton&&typeof SpeechRecognition!=="undefined"){krishtiRecognitionV13=new SpeechRecognition();krishtiRecognitionV13.lang="en-IN";krishtiRecognitionV13.interimResults=false;krishtiRecognitionV13.maxAlternatives=1;krishtiRecognitionV13.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||"";if(userInput){userInput.value+=(userInput.value?" ":"")+text;autoResizeInput();}};krishtiRecognitionV13.onerror=()=>showToast("Voice input unavailable");voiceButton.addEventListener("click",()=>{try{krishtiRecognitionV13.start();showToast("Listening…");}catch{}});}
function speakKrishti(text){if(!localStorage.getItem("krishti_voice_reply"))return;if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text).replace(/https?:\/\/\S+/g,"").slice(0,1200));u.lang="en-IN";speechSynthesis.speak(u);}}
const originalAddMessage=addMessage;
addMessage=function(text,sender){const r=originalAddMessage(text,sender);if(sender==="ai")speakKrishti(text);return r;};

// Mobile drawer reliability: inline styles remove old CSS conflicts.
function forceOpenSidebar(){if(sidebarEl){sidebarEl.classList.add("open");sidebarEl.style.transform="translateX(0)";sidebarEl.style.visibility="visible";}sidebarOverlay?.classList.add("show");}
function forceCloseSidebar(){if(sidebarEl){sidebarEl.classList.remove("open");sidebarEl.style.transform="translateX(-105%)";}sidebarOverlay?.classList.remove("show");}
sidebarToggle?.addEventListener("click",forceOpenSidebar,true);
sidebarOverlay?.addEventListener("click",forceCloseSidebar,true);
renderLibrary();

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


// =========================================================
// KRISHTI V17 — CLOUD SYNC / MEMORY / BACKUP
// =========================================================
async function krishtiAuthHeaders() {
    if (!firebaseAuth?.currentUser) return {"Content-Type":"application/json"};
    const token = await firebaseAuth.currentUser.getIdToken();
    return {"Content-Type":"application/json", "Authorization":"Bearer " + token};
}

function cloudUserDoc() {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!firebaseDb || !uid) return null;
    return firebaseDb.collection("users").doc(uid);
}

async function cloudSaveChat(chat) {
    try {
        const ref = cloudUserDoc();
        if (!ref || !chat?.id) return;
        await ref.collection("chats").doc(String(chat.id)).set({
            ...chat,
            updatedAt: Number(chat.updatedAt || Date.now()),
            createdAt: Number(chat.createdAt || Date.now()),
            syncedAt: Date.now()
        }, {merge:true});
    } catch (e) { console.warn("Cloud chat sync failed:", e.message); }
}

async function cloudDeleteChat(chatId) {
    try {
        const ref = cloudUserDoc();
        if (ref && chatId) await ref.collection("chats").doc(String(chatId)).delete();
    } catch (e) { console.warn("Cloud chat delete failed:", e.message); }
}

async function cloudLoadChats() {
    try {
        const ref = cloudUserDoc();
        if (!ref) return [];
        const snap = await ref.collection("chats").orderBy("updatedAt", "desc").limit(100).get();
        return snap.docs.map(d => ({id:d.id, ...d.data()}));
    } catch (e) { console.warn("Cloud chat load failed:", e.message); return []; }
}

async function krishtiCloudSync() {
    if (!firebaseDb || !firebaseAuth?.currentUser) return;
    try {
        const cloud = await cloudLoadChats();
        const local = Array.isArray(chats) ? chats : [];
        const map = new Map(local.map(c => [String(c.id), c]));
        cloud.forEach(c => {
            const old = map.get(String(c.id));
            if (!old || Number(c.updatedAt || 0) >= Number(old.updatedAt || 0)) map.set(String(c.id), c);
        });
        chats = Array.from(map.values()).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0)).slice(0,100);
        saveHistory();
        if (!currentChatId && chats[0]) {
            currentChatId = chats[0].id;
            currentMessages = Array.isArray(chats[0].messages) ? chats[0].messages.slice() : [];
            renderStoredMessages(currentMessages);
        }
        renderHistory(); updateCurrentTitle();
        showToast("☁️ Cloud history synced");
    } catch (e) { console.warn("Krishti cloud sync:", e.message); }
}

async function cloudSaveMemory(text) {
    try {
        const ref = cloudUserDoc();
        if (!ref || !text) return;
        await ref.collection("memory").add({text:String(text).slice(0,500), createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    } catch (e) { console.warn("Cloud memory save failed:", e.message); }
}

async function cloudLoadMemory() {
    try {
        const ref = cloudUserDoc();
        if (!ref) return [];
        const snap = await ref.collection("memory").orderBy("createdAt", "desc").limit(50).get();
        return snap.docs.map(d => ({id:d.id, text:d.data().text || "", time:d.data().createdAt?.toMillis?.() || Date.now()}));
    } catch (e) { console.warn("Cloud memory load failed:", e.message); return []; }
}

async function syncCloudMemoryToLocal() {
    const cloud = await cloudLoadMemory();
    if (cloud.length) saveLocalMemory(cloud);
    return cloud;
}

async function exportCloudBackup() {
    const cloudChats = await cloudLoadChats();
    const cloudMemory = await cloudLoadMemory();
    const backup = {version:17, app:"Krishti AI", exportedAt:new Date().toISOString(), chats:cloudChats.length ? cloudChats : chats, memory:cloudMemory.length ? cloudMemory : getLocalMemory(), settings:window.KRISHTI_SETTINGS || {}};
    const blob = new Blob([JSON.stringify(backup,null,2)], {type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`krishti-ai-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    showToast("Backup exported");
}

async function importCloudBackup(file) {
    const text=await file.text(); const data=JSON.parse(text);
    if (!data || !Array.isArray(data.chats)) throw new Error("Invalid Krishti backup file.");
    chats=data.chats.slice(0,100); saveHistory();
    for (const chat of chats) await cloudSaveChat(chat);
    if (Array.isArray(data.memory)) for (const item of data.memory.slice(-50)) await cloudSaveMemory(item.text || item);
    renderHistory(); showToast("Backup restored to cloud");
}
window.krishtiCloudSync = krishtiCloudSync;
window.exportCloudBackup = exportCloudBackup;
window.importCloudBackup = importCloudBackup;
window.syncCloudMemoryToLocal = syncCloudMemoryToLocal;

// =========================================================
// V10.7 — SETTINGS / PROFILE / MORE
// =========================================================
// =========================================================
// KRISHTI SETTINGS 2.0 — FRONTEND + BACKEND SYNC
// =========================================================
(function initKrishtiSettingsV14(){
    const moreButton = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.trim().includes('More'));
    const moreMenu = document.getElementById('moreMenu');
    const settingsView = document.getElementById('settingsView');
    const settingsContent = document.getElementById('settingsContent');
    const settingsNav = document.querySelector('.settings-nav');
    const settingsBack = document.getElementById('settingsBack');
    const settingsMobileBack = document.getElementById('settingsMobileBack');
    const profileRow = document.querySelector('.profile-row');
    const profileMenu = document.getElementById('profileMenu');
    const profileSettings = document.getElementById('profileSettings');
    const profileLogout = document.getElementById('profileLogout');
    const profileEmail = document.getElementById('profileMenuEmail');
    const sectionButtons = Array.from(document.querySelectorAll('.settings-nav-item'));

    const DEFAULTS = {
        profile:{displayName:'Krishti User',aiNickname:'Krishti'},
        personality:{style:'Friendly',customInstructions:''},
        preferences:{language:'Auto',responseLength:'Balanced'},
        brain:{memoryEnabled:true,recallEnabled:true,knowledgeEnabled:true},
        experience:{theme:'dark',accent:'#8b5cf6',compactMode:false,sendWithEnter:true,voiceReply:false,voiceRate:1},
        tools:{webEnabled:true,imageEnabled:true,documentEnabled:true,pluginsEnabled:false},
        trust:{saveConversations:true,localAnalytics:false,safeMode:true},
        app:{mobileOptimized:true,notifications:true,offlineMode:true,autoUpdate:true}
    };
    let settings = JSON.parse(localStorage.getItem('krishti_settings_v14') || 'null') || structuredClone(DEFAULTS);
    window.KRISHTI_SETTINGS = settings;

    function cloneDefaults(){ return JSON.parse(JSON.stringify(DEFAULTS)); }
    function deepMerge(base, incoming){
        const out = {...base};
        Object.keys(incoming || {}).forEach(k => {
            if (incoming[k] && typeof incoming[k] === 'object' && !Array.isArray(incoming[k]) && base[k] && typeof base[k] === 'object') out[k] = deepMerge(base[k], incoming[k]);
            else if (incoming[k] !== undefined) out[k] = incoming[k];
        });
        return out;
    }
    function currentUserKey(){ return window.KRISHTI_USER?.uid || window.KRISHTI_USER?.email || 'local-user'; }
    function persistLocal(){ localStorage.setItem('krishti_settings_v14', JSON.stringify(settings)); window.KRISHTI_SETTINGS=settings; applySettings(); }
    async function syncSettings(method='GET'){
        try{
            const key=encodeURIComponent(currentUserKey());
            if(method==='GET'){
                const r=await fetch('/api/settings',{headers:await krishtiAuthHeaders(),cache:'no-store'});
                if(!r.ok) throw new Error('settings get failed');
                const data=await r.json();
                settings=deepMerge(cloneDefaults(),data.settings||{}); persistLocal(); return settings;
            }
            const r=await fetch('/api/settings',{method:'PUT',headers:await krishtiAuthHeaders(),body:JSON.stringify({settings})});
            if(!r.ok) throw new Error('settings save failed');
            return await r.json();
        }catch(e){ console.warn('Krishti settings sync:',e.message); return null; }
    }
    async function setSetting(path,value,save=true){
        const parts=path.split('.'); let obj=settings;
        for(let i=0;i<parts.length-1;i++){ if(!obj[parts[i]]) obj[parts[i]]={}; obj=obj[parts[i]]; }
        obj[parts.at(-1)]=value; persistLocal();
        if(save) await syncSettings('PUT');
        showToast('Krishti setting saved');
    }
    function val(path,fallback=''){
        return path.split('.').reduce((o,k)=>o?.[k],settings) ?? fallback;
    }
    function esc(v){ return typeof escapeHTML==='function' ? escapeHTML(String(v)) : String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function checked(v){ return v ? 'checked' : ''; }
    function selected(a,b){ return a===b?'selected':''; }
    function card(title,desc,control){ return `<div class="setting-row"><div class="setting-row-main"><strong>${title}</strong><span>${desc}</span></div>${control}</div>`; }
    function toggle(id,path,descTitle,desc){ return card(descTitle,desc,`<label class="switch"><input id="${id}" data-setting-path="${path}" type="checkbox" ${checked(val(path))}><span></span></label>`); }
    function selectControl(id,path,options){ return `<select id="${id}" class="setting-select" data-setting-path="${path}">${options.map(x=>`<option ${selected(val(path),x)}>${esc(x)}</option>`).join('')}</select>`; }
    function textControl(id,path,placeholder){ return `<input id="${id}" class="setting-input" data-setting-path="${path}" value="${esc(val(path))}" placeholder="${esc(placeholder)}">`; }

    const info = {
      'Krishti Profile': ['👤 Krishti Profile','Make the assistant feel like your own Krishti space.', `<div class="setting-card">${card('Your display name','Shown inside your personal Krishti experience.',textControl('displayName','profile.displayName','Your name'))}${card('AI nickname','What you call your assistant.',textControl('aiNickname','profile.aiNickname','Krishti'))}</div><div class="settings-note">Account: ${esc(window.KRISHTI_USER?.email||'Signed in')}</div>`],
      'Krishti Personality':['✨ Krishti Personality','Choose how Krishti speaks and follows your instructions.', `<div class="setting-card">${card('Personality', 'Choose the default tone of replies.',selectControl('personalityStyle','personality.style',['Friendly','Professional','Creative','Tutor','Direct']))}${card('Custom instructions','Extra instructions are added to your chat requests.',`<textarea id="customInstructions" class="setting-textarea" data-setting-path="personality.customInstructions" placeholder="Example: Keep answers concise and use Assamese-English mix when I do.">${esc(val('personality.customInstructions'))}</textarea>`)}</div>`],
      'My Preferences':['📝 My Preferences','Set language and answer density without copying another app.', `<div class="setting-card">${card('Reply language','Auto follows the language you use.',selectControl('language','preferences.language',['Auto','English','Assamese','Hindi','Bengali']))}${card('Answer length','Control how much detail Krishti normally gives.',selectControl('responseLength','preferences.responseLength',['Short','Balanced','Detailed']))}</div>`],
      'Krishti Memory':['🧠 Krishti Memory','Control what Krishti can use to personalize future chats.', `<div class="setting-card">${toggle('memoryEnabled','brain.memoryEnabled','Memory','Use saved preferences in future chats.')}${toggle('recallEnabled','brain.recallEnabled','Conversation Recall','Use recent conversation context when available.')}${toggle('knowledgeEnabled','brain.knowledgeEnabled','Krishti Knowledge','Use your local Library items as a knowledge source.')}</div>`],
      'Conversation Recall':['💬 Conversation Recall','Choose how much previous chat context Krishti should use.', `<div class="setting-card">${toggle('recallEnabled2','brain.recallEnabled','Use recent conversations','Allow recent conversation context in chat requests.')}${card('Local history','Your chat list is stored by the current V13/V14 browser build.','<span class="setting-value">'+(Array.isArray(window.chats)?window.chats.length:'Ready')+' chats</span>')}</div>`],
      'Krishti Knowledge':['📚 Krishti Knowledge','Your Library is the local knowledge shelf for notes, backups and generated items.', `<div class="setting-card">${toggle('knowledgeEnabled2','brain.knowledgeEnabled','Library knowledge','Allow Library metadata to guide future features.')}${card('Open Library','Review saved items and backup tools.','<button class="setting-button" data-action="library">Open</button>')}</div>`],
      'Krishti Look':['🎨 Krishti Look','Control the overall visual mode of Krishti AI.', `<div class="setting-card">${card('Theme','Dark is the default Krishti signature look.',selectControl('theme','experience.theme',['dark','light']))}${toggle('compactMode','experience.compactMode','Compact chat','Reduce spacing for a denser chat layout.')}</div>`],
      'Krishti Colors':['🌈 Krishti Colors','Pick the accent used by buttons, switches and highlights.', `<div class="setting-card">${card('Accent','Saved locally and synced to the Krishti backend.',`<div class="accent-options">${['#8b5cf6','#14b8a6','#3b82f6','#e879f9','#f59e0b','#ef4444'].map(c=>`<button type="button" class="accent-dot ${val('experience.accent')===c?'active':''}" data-accent="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`)}</div>`],
      'Chat Experience':['💫 Chat Experience','Control composer behaviour and everyday chat feel.', `<div class="setting-card">${toggle('sendWithEnter','experience.sendWithEnter','Send with Enter','Press Enter to send a message; Shift+Enter stays a new line.')}${card('Current mode','Fast, Smart, Deep, Creative or Web Research.',`<span class="setting-value">${esc(typeof activeKrishtiMode!=='undefined'?activeKrishtiMode:'smart')}</span>`)}</div>`],
      'Voice & Sound':['🎙️ Voice & Sound','Configure voice replies and browser voice input.', `<div class="setting-card">${toggle('voiceReply','experience.voiceReply','Speak AI replies','Use browser speech synthesis after Krishti replies.')}${card('Voice speed','Controls spoken reply speed.',`<input id="voiceRate" data-setting-path="experience.voiceRate" class="setting-range" type="range" min="0.7" max="1.5" step="0.1" value="${val('experience.voiceRate',1)}"><span id="voiceRateValue" class="setting-value">${val('experience.voiceRate',1)}×</span>`)}</div>`],
      'Web Explorer':['🌐 Web Explorer','Turn Krishti web research access on or off.', `<div class="setting-card">${toggle('webEnabled','tools.webEnabled','Web Search','Allow the Web Search mode to send requests to the search backend.')}</div>`],
      'Vision & Images':['🖼️ Vision & Images','Control image generation and photo editing features.', `<div class="setting-card">${toggle('imageEnabled','tools.imageEnabled','Image Studio','Allow Create Image, Past Photo and Future Photo actions.')}</div>`],
      'Document Brain':['📄 Document Brain','Control uploaded document analysis.', `<div class="setting-card">${toggle('documentEnabled','tools.documentEnabled','Document analysis','Allow documents to be included in chat requests.')}</div>`],
      'Connected Tools':['🔌 Connected Tools','Manage optional integrations without pretending they are connected.', `<div class="setting-card">${toggle('pluginsEnabled','tools.pluginsEnabled','Connected tools','Enable the integration layer for plugins you add later.')}${card('Plugin status','No third-party plugin is connected in this build.','<span class="setting-value">Local / ready</span>')}</div>`],
      'Privacy Center':['🛡️ Privacy Center','Choose what Krishti keeps on the device and sends to its backend.', `<div class="setting-card">${toggle('saveConversations','trust.saveConversations','Save conversations','Keep chat history in the browser.')}${toggle('localAnalytics','trust.localAnalytics','Local diagnostics','Allow non-identifying local diagnostics for troubleshooting.')}</div><div class="settings-note">This V14 build does not sell your data or expose a third-party analytics dashboard.</div>`],
      'Memory Control':['🧹 Memory Control','Review and clear the local Krishti memory store.', `<div class="setting-card">${card('Saved memories','Current local memory items.',`<span class="setting-value">${Array.isArray(getLocalMemory?.())?getLocalMemory().length:0}</span>`)}${card('Clear local memory','Remove saved memory entries from this browser.','<button class="setting-button danger" data-action="clear-memory">Clear memory</button>')}</div>`],
      'Security':['🔐 Security','Your Firebase login remains the identity layer for the app.', `<div class="setting-card">${card('Signed-in account','Current account.',`<span class="setting-value">${esc(window.KRISHTI_USER?.email||'Signed in')}</span>`)}${card('Session','Firebase authentication session.',`<span class="setting-value">Active</span>`)}${card('Log out','End the current login session.','<button class="setting-button danger" data-action="logout">Log out</button>')}</div>`],
      'Data & Storage':['💾 Data & Storage','Export, import or clear local Krishti data.', `<div class="setting-card">${card('Chat history','Stored locally when enabled.',`<span class="setting-value">${Array.isArray(window.chats)?window.chats.length:0} chats</span>`)}${card('Backup','Portable JSON backup for chats, memory and Library.','<button class="setting-button" data-action="export">Export</button> <button class="setting-button" data-action="import">Import</button>')}${card('Clear chat history','Remove all chats from this browser.','<button class="setting-button danger" data-action="clear-history">Clear</button>')}</div>`],
      'Safety':['❤️ Safety','Krishti safety controls for responsible use.', `<div class="setting-card">${toggle('safeMode','trust.safeMode','Krishti Safe Mode','Keep responsible-use guardrails enabled in the product experience.')}${card('Important information','Krishti can make mistakes. Check consequential information before relying on it.','<span class="setting-value">Always on</span>')}</div>`],
      'Mobile Experience':['📱 Mobile Experience','Mobile-first controls for Android and small screens.', `<div class="setting-card">${toggle('mobileOptimized','app.mobileOptimized','Mobile layout','Use Krishti mobile drawer and compact utility views.')}${card('Installable app','PWA manifest and service worker are included.', '<span class="setting-value">Prepared</span>')}</div>`],
      'Notifications':['🔔 Notifications','Control local Krishti status messages.', `<div class="setting-card">${toggle('notifications','app.notifications','Krishti notifications','Show helpful status messages and confirmations.')}</div>`],
      'Offline & Network':['📶 Offline & Network','Choose how Krishti behaves when the network is unavailable.', `<div class="setting-card">${toggle('offlineMode','app.offlineMode','Offline shell','Keep the app shell and cached assets available offline.')}${card('AI requests','Gemini chat, web search and image generation require a network.', '<span class="setting-value">Online required</span>')}</div>`],
      'App Updates':['🚀 App Updates','Keep the installable Krishti app current.', `<div class="setting-card">${toggle('autoUpdate','app.autoUpdate','Automatic app refresh','Allow the service worker to refresh cached assets.')}${card('Current release','Krishti AI V14 Settings 2.0', '<span class="setting-value">V14.0</span>')}</div>`],
      "What's New":['✨ What’s New','Recent Krishti improvements in this build.', `<div class="setting-card"><div class="settings-release"><b>V14.0 — Krishti Settings 2.0</b><span>Custom Control Center • backend settings sync • mobile-first settings • real persistence</span></div><div class="settings-release"><b>V13.0</b><span>Modes • local memory • Library • voice • PWA preparation</span></div></div>`],
      'Krishti Labs':['🧪 Krishti Labs','Experimental features that may change.', `<div class="setting-card">${toggle('pluginsEnabled2','tools.pluginsEnabled','Connected Tools beta','Keep future integrations available for testing.')}${toggle('offlineMode2','app.offlineMode','Offline shell beta','Use the service-worker cache when possible.')}</div>`],
      'Help':['❓ Help','Quick help for using Krishti AI.', `<div class="setting-card">${card('How to chat','Type a message and press Send. Use the + menu for files, images and tools.','<button class="setting-button" data-action="help-chat">Show</button>')}${card('Mobile sidebar','Tap the menu icon to open the Krishti drawer.','<button class="setting-button" data-action="help-mobile">Show</button>')}</div>`],
      'Report a Problem':['🐞 Report a Problem','Send a bug report to the Krishti backend.', `<div class="setting-card"><textarea id="bugReport" class="setting-textarea" placeholder="What happened? Include steps to reproduce."></textarea><button id="sendBugReport" class="setting-button primary" type="button">Send report</button></div>`],
      'About Krishti AI':['💜 About Krishti AI','Your custom AI assistant.', `<div class="setting-card">${card('Version','Current Krishti release.','<span class="setting-value">V14.0</span>')}${card('Frontend','Custom Krishti Settings 2.0 UI.','<span class="setting-value">Connected</span>')}${card('Backend','Node.js settings API with per-user storage key.','<span class="setting-value">Connected</span>')}</div>`],
      'Log out':['↪ Log out','End your current Krishti AI session.', `<div class="setting-card">${card('Log out of Krishti','You can sign in again anytime.','<button class="setting-button danger" data-action="logout">Log out</button>')}</div>`]
    };

    function renderSettingsSection(section){
        const d=info[section]||info['Krishti Profile'];
        return `<div class="settings-panel"><div class="settings-kicker">KRISHTI AI • V14</div><h1>${d[0]}</h1><p>${d[1]}</p>${d[2]}</div>`;
    }
    function applySettings(){
        const light=val('experience.theme')==='light';
        document.body.classList.toggle('light-mode',light);
        document.documentElement.style.setProperty('--krishti-accent',val('experience.accent','#8b5cf6'));
        document.documentElement.style.setProperty('--krishti-compact',val('experience.compactMode')?'1':'0');
        localStorage.setItem('krishti_voice_reply',String(!!val('experience.voiceReply')));
        const hint=document.querySelector('.composer-hint'); if(hint && val('app.notifications')===false) hint.style.opacity='.65';
    }
    function toggleMobileSettingsContent(){
        if(window.innerWidth<=700){ settingsNav.style.display='none'; settingsContent.classList.add('mobile-active'); }
        else { settingsNav.style.display=''; settingsContent.classList.remove('mobile-active'); }
    }
    function openSettings(section='Krishti Profile'){
        if(!settingsView)return;
        profileMenu?.setAttribute('hidden',''); moreMenu?.setAttribute('hidden',''); settingsView.hidden=false; document.body.classList.add('settings-open'); selectSection(section);
    }
    function closeSettings(){ if(!settingsView)return; settingsView.hidden=true; document.body.classList.remove('settings-open'); settingsContent?.classList.remove('mobile-active'); if(settingsNav)settingsNav.style.display=''; }
    function selectSection(section){ sectionButtons.forEach(b=>b.classList.toggle('active',b.dataset.settingSection===section)); if(!settingsContent)return; settingsContent.innerHTML=renderSettingsSection(section); toggleMobileSettingsContent(); bindSettingsContent(section); }
    async function bindSettingsContent(section){
        settingsContent.querySelectorAll('[data-setting-path]').forEach(el=>{
            const handler=async()=>{
                let value;
                if(el.type==='checkbox') value=el.checked; else if(el.type==='range') value=Number(el.value); else value=el.value;
                await setSetting(el.dataset.settingPath,value);
                if(el.id==='voiceRateValue') return;
                if(el.id==='voiceRate'){ const out=document.getElementById('voiceRateValue'); if(out)out.textContent=value+'×'; }
            };
            el.addEventListener(el.type==='range'||el.tagName==='SELECT'?'input':'change',handler);
            if(el.tagName==='SELECT')el.addEventListener('change',handler);
            if(el.tagName==='INPUT' && el.type==='text')el.addEventListener('change',handler);
            if(el.tagName==='TEXTAREA')el.addEventListener('change',handler);
        });
        document.querySelectorAll('.accent-dot').forEach(btn=>btn.addEventListener('click',async()=>{await setSetting('experience.accent',btn.dataset.accent);selectSection('Krishti Colors');}));
        settingsContent.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',async()=>{
            const a=btn.dataset.action;
            if(a==='logout') return logout();
            if(a==='library'){ closeSettings(); document.getElementById('libraryView')?.removeAttribute('hidden'); if(typeof renderLibrary==='function')renderLibrary(); return; }
            if(a==='export'){ document.getElementById('exportKrishti')?.click(); return; }
            if(a==='import'){ document.getElementById('importKrishti')?.click(); return; }
            if(a==='clear-history'){ if(!confirm('Clear all saved chats on this device?'))return; chats=[];currentChatId=null;currentMessages=[];saveHistory();renderHistory();startFreshChat(false);showToast('Chat history cleared'); return; }
            if(a==='clear-memory'){ if(!confirm('Clear local Krishti memory?'))return; localStorage.removeItem(typeof MEMORY_KEY!=='undefined'?MEMORY_KEY:'krishti_ai_memory_v1_');showToast('Local memory cleared');selectSection('Memory Control');return; }
            if(a==='help-chat') return showToast('Type your question, then Send. Use + for tools.');
            if(a==='help-mobile') return showToast('Use the top-left menu icon to open the Krishti drawer.');
        }));
        const report=document.getElementById('sendBugReport');
        report?.addEventListener('click',async()=>{
            const message=document.getElementById('bugReport')?.value.trim(); if(!message)return showToast('Write the problem first.');
            try{const r=await fetch('/api/feedback',{method:'POST',headers:await krishtiAuthHeaders(),body:JSON.stringify({message,type:'bug'})});if(!r.ok)throw new Error();document.getElementById('bugReport').value='';showToast('Bug report sent');}catch{showToast('Could not send report');}
        });
        if(section==='Krishti Profile') document.getElementById('displayName')?.addEventListener('change',()=>{const n=document.getElementById('displayName').value.trim();document.querySelectorAll('.profile-info strong').forEach(x=>{if(n)x.textContent=n;});});
    }
    async function logout(){ if(firebaseAuth) await firebaseAuth.signOut(); else showAuth(); }

    window.loadKrishtiSettings=async()=>{ await syncSettings('GET'); applySettings(); if(!settingsView?.hidden)selectSection(document.querySelector('.settings-nav-item.active')?.dataset.settingSection||'Krishti Profile'); };
    sectionButtons.forEach(btn=>btn.addEventListener('click',()=>selectSection(btn.dataset.settingSection)));
    moreButton?.addEventListener('click',()=>{if(moreMenu)moreMenu.hidden=!moreMenu.hidden;});
    moreMenu?.querySelectorAll('[data-more]').forEach(btn=>btn.addEventListener('click',()=>{moreMenu.hidden=true;showToast(btn.dataset.more+' selected');}));
    document.getElementById('settingsButton')?.addEventListener('click',()=>openSettings());
    profileRow?.addEventListener('click',()=>{if(!profileMenu)return;const email=window.KRISHTI_USER?.email||'Signed in';if(profileEmail)profileEmail.textContent=email;profileMenu.hidden=!profileMenu.hidden;});
    profileSettings?.addEventListener('click',()=>openSettings()); profileLogout?.addEventListener('click',logout); settingsBack?.addEventListener('click',closeSettings);
    settingsMobileBack?.addEventListener('click',()=>{settingsContent?.classList.remove('mobile-active');if(settingsNav)settingsNav.style.display='';});
    document.addEventListener('click',e=>{if(!e.target.closest('.profile-row')&&!e.target.closest('#profileMenu'))profileMenu?.setAttribute('hidden','');if(!e.target.closest('.more-menu')&&!e.target.closest('.more-dots')&&!e.target.closest('.sidebar-nav-item'))moreMenu?.setAttribute('hidden','');});
    applySettings();
    if(window.KRISHTI_USER) window.loadKrishtiSettings();
})();
