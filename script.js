const input = document.querySelector(".input-area input");
const sendButton = document.querySelector(".send");
const chatArea = document.querySelector(".chat-area");
const welcome = document.querySelector(".welcome");

async function sendMessage() {

    const message = input.value.trim();

    if (!message) return;

    if (welcome) {
        welcome.style.display = "none";
    }

    addMessage("You", message);

    input.value = "";

    // Create AI message
    const aiMessage = addMessage(
        "🤖 Krishti AI",
        "Thinking..."
    );

    const aiText = aiMessage.querySelector("p");

    try {

        // Render deployed server
        const response = await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Server error: " + response.status
            );
        }

        if (!response.body) {
            throw new Error(
                "No response from server."
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let fullText = "";
        let firstChunk = true;

        while (true) {

            const { value, done } =
                await reader.read();

            if (done) break;

            const chunk =
                decoder.decode(value, {
                    stream: true
                });

            if (firstChunk) {
                aiText.textContent = "";
                firstChunk = false;
            }

            fullText += chunk;

            aiText.textContent = fullText;

            scrollToBottom();
        }

        if (!fullText.trim()) {

            aiText.textContent =
                "No response received.";

        }

    } catch (error) {

        console.error(
            "Krishti AI Error:",
            error
        );

        aiText.textContent =
            "Krishti AI server connection failed.";
    }

    scrollToBottom();
}


function addMessage(sender, message) {

    const messageBox =
        document.createElement("div");

    messageBox.className = "message";

    messageBox.innerHTML = `
        <div class="message-content">
            <strong>${escapeHTML(sender)}</strong>
            <p>${escapeHTML(message)}</p>
        </div>
    `;

    chatArea.insertBefore(
        messageBox,
        document.querySelector(".input-area")
    );

    scrollToBottom();

    return messageBox;
}


function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


function scrollToBottom() {

    chatArea.scrollTop =
        chatArea.scrollHeight;
}


sendButton.addEventListener(
    "click",
    sendMessage
);


input.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            sendMessage();
        }

    }
);
