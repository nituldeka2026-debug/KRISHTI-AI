/* =========================================================
   KRISHTI AI — FRONTEND
   Chat + Streaming + Mobile + Voice
   ========================================================= */

const input = document.querySelector(".input-area input");
const inputForm = document.querySelector(".input-area");
const sendButton = document.querySelector(".send");
const voiceButton = document.querySelector(".voice");

const chatArea = document.querySelector(".chat-area");
const welcome = document.querySelector(".welcome");
const messagesContainer = document.querySelector(".messages");

const newChatButton = document.querySelector(".new-chat");
const quickButtons =
    document.querySelectorAll(".quick-actions button");


let isSending = false;


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage(customMessage = null) {

    if (isSending) return;

    const message =
        customMessage !== null
            ? customMessage.trim()
            : input.value.trim();

    if (!message) return;


    isSending = true;

    setSendingState(true);


    /* Hide welcome */

    if (welcome) {
        welcome.style.display = "none";
    }


    /* Add user message */

    addMessage(
        "You",
        message,
        "user"
    );


    /* Clear input */

    input.value = "";


    /* Create AI message */

    const aiMessage =
        addMessage(
            "🤖 Krishti AI",
            "",
            "ai"
        );

    const aiText =
        aiMessage.querySelector("p");


    /* Typing indicator */

    aiText.innerHTML = `
        <span class="typing">
            <span></span>
            <span></span>
            <span></span>
        </span>
    `;


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


        /* =========================================
           SERVER ERROR
        ========================================= */

        if (!response.ok) {

            let errorText =
                `Server error (${response.status})`;

            try {

                const text =
                    await response.text();

                if (text.trim()) {
                    errorText = text.trim();
                }

            } catch (_) {
                // Ignore body read error
            }

            throw new Error(errorText);
        }


        /* =========================================
           STREAM CHECK
        ========================================= */

        if (!response.body) {

            throw new Error(
                "No streaming response received from server."
            );
        }


        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder("utf-8");


        let fullText = "";

        let firstChunk = true;


        /* =========================================
           READ STREAM
        ========================================= */

        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            if (!value) {
                continue;
            }


            const chunk =
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            if (firstChunk) {

                aiText.textContent = "";

                firstChunk = false;
            }


            fullText += chunk;


            aiText.textContent =
                fullText;


            scrollToBottom();
        }


        /* Flush decoder */

        const finalChunk =
            decoder.decode();


        if (finalChunk) {

            fullText += finalChunk;

            aiText.textContent =
                fullText;
        }


        /* =========================================
           EMPTY RESPONSE
        ========================================= */

        if (!fullText.trim()) {

            aiText.textContent =
                "No response received from Krishti AI.";
        }


    } catch (error) {

        console.error(
            "Krishti AI Error:",
            error
        );


        aiMessage.classList.add("error");


        aiText.textContent =
            getFriendlyErrorMessage(error);
    }


    setSendingState(false);

    isSending = false;

    scrollToBottom();
}


/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessage(
    sender,
    message,
    type = "ai"
) {

    const messageBox =
        document.createElement("div");

    messageBox.className =
        `message ${type}`;


    const content =
        document.createElement("div");

    content.className =
        "message-content";


    const senderElement =
        document.createElement("strong");

    senderElement.textContent =
        sender;


    const textElement =
        document.createElement("p");

    textElement.textContent =
        message;


    content.appendChild(
        senderElement
    );

    content.appendChild(
        textElement
    );


    messageBox.appendChild(
        content
    );


    messagesContainer.appendChild(
        messageBox
    );


    scrollToBottom();


    return messageBox;
}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function getFriendlyErrorMessage(error) {

    const message =
        error && error.message
            ? error.message
            : "";


    if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
    ) {

        return (
            "Krishti AI server connection failed. " +
            "Please check the server and try again."
        );
    }


    if (
        message.includes("Gemini API key") ||
        message.includes("API key")
    ) {

        return (
            "Gemini API key is not configured correctly on the server."
        );
    }


    if (
        message.includes("429") ||
        message.toLowerCase().includes("limit")
    ) {

        return (
            "AI request limit reached. Please try again later."
        );
    }


    return (
        message ||
        "Krishti AI could not process your request."
    );
}


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

    if (!messagesContainer) {
        return;
    }


    requestAnimationFrame(() => {

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

    });
}


/* =========================================================
   SEND STATE
========================================================= */

function setSendingState(sending) {

    if (!sendButton) {
        return;
    }


    sendButton.disabled =
        sending;


    if (sending) {

        sendButton.textContent =
            "…";

        sendButton.setAttribute(
            "aria-label",
            "Sending"
        );

    } else {

        sendButton.textContent =
            "➤";

        sendButton.setAttribute(
            "aria-label",
            "Send message"
        );
    }
}


/* =========================================================
   FORM SUBMIT
========================================================= */

if (inputForm) {

    inputForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            sendMessage();
        }
    );
}


/* =========================================================
   ENTER KEY
========================================================= */

if (input) {

    input.addEventListener(
        "keydown",
        function (event) {

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


/* =========================================================
   QUICK ACTIONS
========================================================= */

quickButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function () {

                const prompt =
                    button.dataset.prompt ||
                    button.textContent.trim();


                if (input) {

                    input.value =
                        prompt;

                    input.focus();
                }


                sendMessage(
                    prompt
                );
            }
        );
    }
);


/* =========================================================
   NEW CHAT
========================================================= */

if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        function () {

            messagesContainer.innerHTML =
                "";


            if (welcome) {

                welcome.style.display =
                    "";
            }


            if (input) {

                input.value = "";

                input.focus();
            }


            isSending = false;

            setSendingState(false);

            scrollToBottom();
        }
    );
}


/* =========================================================
   VOICE INPUT
========================================================= */

if (voiceButton) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        voiceButton.addEventListener(
            "click",
            function () {

                alert(
                    "Voice input is not supported by this browser."
                );
            }
        );

    } else {

        const recognition =
            new SpeechRecognition();


        recognition.lang =
            navigator.language || "en-IN";


        recognition.continuous =
            false;


        recognition.interimResults =
            false;


        recognition.maxAlternatives =
            1;


        let listening = false;


        recognition.onstart =
            function () {

                listening = true;

                voiceButton.textContent =
                    "🔴";
            };


        recognition.onresult =
            function (event) {

                const result =
                    event.results[0][0].transcript;


                if (input) {

                    input.value =
                        result;

                    input.focus();
                }
            };


        recognition.onerror =
            function (event) {

                console.error(
                    "Voice recognition error:",
                    event.error
                );
            };


        recognition.onend =
            function () {

                listening = false;

                voiceButton.textContent =
                    "🎤";
            };


        voiceButton.addEventListener(
            "click",
            function () {

                if (listening) {

                    recognition.stop();

                    return;
                }


                try {

                    recognition.start();

                } catch (error) {

                    console.error(
                        "Voice start error:",
                        error
                    );
                }
            }
        );
    }
}


/* =========================================================
   INITIAL FOCUS
========================================================= */

if (input) {

    input.focus();
}
