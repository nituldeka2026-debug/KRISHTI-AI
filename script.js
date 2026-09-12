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


// =========================================================
// STATE
// =========================================================

let isSending = false;

let selectedFile = null;


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
        "message-bubble";

    bubble.textContent =
        text;

    messageDiv.appendChild(
        bubble
    );

    messagesContainer.appendChild(
        messageDiv
    );

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
        <div class="message-bubble typing">
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


    if (!message) {
        return;
    }


    // Hide welcome
    if (welcomeSection) {
        welcomeSection.style.display =
            "none";
    }


    // Add user message
    addMessage(
        message,
        "user"
    );


    // Clear input
    if (userInput) {
        userInput.value = "";
    }


    // Show typing
    const typing =
        showTyping();


    setSendingState(true);


    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    ...(selectedFile
                        ? {}
                        : {
                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }),

                    body: (() => {
                        if (!selectedFile) {
                            return JSON.stringify({
                                message: message
                            });
                        }

                        const formData = new FormData();
                        formData.append("message", message);
                        formData.append("file", selectedFile);
                        return formData;
                    })()
                }
            );


        // Remove typing
        if (typing) {
            typing.remove();
        }


        // Server error
        if (!response.ok) {

            let errorText =
                await response.text();


            if (!errorText) {
                errorText =
                    "Something went wrong.";
            }


            addMessage(
                errorText,
                "ai"
            );

            return;
        }


        // AI message
        const aiBubble =
            addMessage(
                "",
                "ai"
            );


        // No streaming body
        if (!response.body) {

            const text =
                await response.text();

            aiBubble.textContent =
                text;

            return;
        }


        // Read stream
        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder(
                "utf-8"
            );

        let fullText = "";


        while (true) {

            const {
                value,
                done
            } =
                await reader.read();


            if (done) {
                break;
            }


            const chunk =
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            fullText +=
                chunk;


            aiBubble.textContent =
                fullText;


            scrollToBottom();
        }


        // Flush decoder
        const finalChunk =
            decoder.decode();


        if (finalChunk) {

            fullText +=
                finalChunk;

            aiBubble.textContent =
                fullText;
        }


        if (!fullText.trim()) {

            aiBubble.textContent =
                "Sorry, I couldn't generate a response.";
        }

        if (selectedFile) {
            removeSelectedDocument();
        }


    } catch (error) {

        console.error(
            "Chat error:",
            error
        );


        if (typing) {
            typing.remove();
        }


        addMessage(
            "Connection error. Please check your internet connection and try again.",
            "ai"
        );

    } finally {

        setSendingState(false);


        if (userInput) {
            userInput.focus();
        }
    }
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

    userInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
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

                documentUploadArea.style.display =
                    documentUploadArea.style.display === "none"
                        ? "block"
                        : "none";
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


            addMessage(
                `📄 Document selected: ${file.name}`,
                "ai"
            );
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
// NEW CHAT
// =========================================================

if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        () => {

            if (isSending) {
                return;
            }


            messagesContainer.innerHTML =
                "";


            if (welcomeSection) {

                welcomeSection.style.display =
                    "";
            }


            if (userInput) {

                userInput.value =
                    "";

                userInput.focus();
            }


            removeSelectedDocument();


            if (documentUploadArea) {

                documentUploadArea.style.display =
                    "none";
            }
        }
    );
}


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

                        documentUploadArea.style.display =
                            "block";
                    }


                    addMessage(
                        "📄 Choose a document to upload. PDF and text documents are supported in this stage.",
                        "ai"
                    );
                }


                else if (
                    text.includes("images")
                ) {

                    addMessage(
                        "🖼️ Image analysis will be added in the next stage.",
                        "ai"
                    );
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
    "Document upload UI enabled."
);
