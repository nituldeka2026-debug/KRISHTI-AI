const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    saveMemory,
    getRecentMemory
} = require("./memory");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "llama3.2:3b";

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
};

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(data));
}

async function handleChat(req, res) {

    let body = "";

    req.on("data", chunk => {
        body += chunk;
    });

    req.on("end", async () => {

        try {

            const data = JSON.parse(body);
            const message = data.message || "";

            if (!message.trim()) {
                return sendJSON(res, 400, {
                    reply: "Please enter a message."
                });
            }

            const memories = getRecentMemory(6);

            const messages = [
                {
                    role: "system",
                    content:
                        "You are Krishti AI, a helpful and intelligent AI assistant. " +
                        "Answer clearly, naturally and concisely."
                }
            ];

            for (const memory of memories) {

                messages.push({
                    role: "user",
                    content: memory.user
                });

                messages.push({
                    role: "assistant",
                    content: memory.assistant
                });
            }

            messages.push({
                role: "user",
                content: message
            });

            // Ollama STREAMING
            const ollamaResponse = await fetch(OLLAMA_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: MODEL,
                    messages: messages,
                    stream: true
                })
            });

            if (!ollamaResponse.ok) {

                const errorText = await ollamaResponse.text();

                throw new Error(
                    errorText || "Ollama request failed"
                );
            }

            // Streaming response headers
            res.writeHead(200, {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Transfer-Encoding": "chunked"
            });

            let fullResponse = "";

            const reader = ollamaResponse.body.getReader();
            const decoder = new TextDecoder();

            while (true) {

                const { value, done } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, {
                    stream: true
                });

                const lines = chunk
                    .split("\n")
                    .filter(line => line.trim());

                for (const line of lines) {

                    try {

                        const json = JSON.parse(line);

                        if (json.message?.content) {

                            const text = json.message.content;

                            fullResponse += text;

                            // Send token immediately
                            res.write(text);
                        }

                    } catch (error) {
                        // Ignore incomplete JSON chunks
                    }
                }
            }

            // Save complete conversation
            saveMemory(message, fullResponse);

            res.end();

        } catch (error) {

            console.error("AI ERROR:", error.message);

            if (!res.headersSent) {

                sendJSON(res, 500, {
                    reply: "Krishti AI error: " + error.message
                });

            } else {

                res.write(
                    "\n\n[Krishti AI Error: " +
                    error.message +
                    "]"
                );

                res.end();
            }
        }
    });
}

const server = http.createServer((req, res) => {

    // AI CHAT API
    if (
        req.method === "POST" &&
        req.url === "/api/chat"
    ) {
        handleChat(req, res);
        return;
    }

    // WEBSITE FILES
    if (req.method === "GET") {

        let urlPath = req.url.split("?")[0];

        if (urlPath === "/") {
            urlPath = "/index.html";
        }

        const filePath = path.join(ROOT, urlPath);

        fs.readFile(filePath, (err, data) => {

            if (err) {

                res.writeHead(404, {
                    "Content-Type": "text/plain"
                });

                res.end("404 - File Not Found");

                return;
            }

            const ext = path.extname(filePath).toLowerCase();

            res.writeHead(200, {
                "Content-Type":
                    mimeTypes[ext] ||
                    "application/octet-stream"
            });

            res.end(data);
        });

        return;
    }

    res.writeHead(404);
    res.end("404 - Not Found");
});

server.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("       KRISHTI AI SERVER");
    console.log("=================================");
    console.log("Website: http://localhost:3000");
    console.log("Model: " + MODEL);
    console.log("Memory: ENABLED");
    console.log("Streaming: ENABLED");
    console.log("Ollama: " + OLLAMA_URL);
    console.log("=================================");
});