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
            removeSelectedImage();

            if (documentUploadArea) {
                documentUploadArea.hidden = true;
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
