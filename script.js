// =========================================================
// KRISHTI AI V2 — FRONTEND SCRIPT
// =========================================================

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");

const messagesContainer =
    document.querySelector(".messages");

const welcomeSection =
    document.querySelector(".welcome");

const newChatButton =
    document.getElementById("newChat");

const quickButtons =
    document.querySelectorAll("[data-prompt]");

let isSending = false;


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

    messageDiv.appendChild(bubble);

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

        sendButton.disabled =
            state;
    }

    if (userInput) {

        userInput.disabled =
            state;
    }

    if (voiceButton) {

        voiceButton.disabled =
            state;
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


    // Hide welcome screen
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

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: message
                    })
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


        // Create AI message
        const aiBubble =
            addMessage(
                "",
                "ai"
            );


        // Check streaming
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

                userInput.value = "";

                userInput.focus();
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
        navigator.language || "en-US";


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
                event.results[0][0].transcript;


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
        ".sidebar div"
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

                    addMessage(
                        "📄 Document upload feature is coming in the next V2 step.",
                        "ai"
                    );
                }

                else if (
                    text.includes("images")
                ) {

                    addMessage(
                        "🖼️ Image analysis feature is coming in the next V2 step.",
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
