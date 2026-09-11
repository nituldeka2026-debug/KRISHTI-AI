const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    saveMemory,
    getRecentMemory
} = require("./memory");

const { GoogleGenAI } = require("@google/genai");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";
const ROOT = __dirname;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

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

            if (!GEMINI_API_KEY) {
                throw new Error(
                    "GEMINI_API_KEY is not configured on the server."
                );
            }

            const ai = new GoogleGenAI({
                apiKey: GEMINI_API_KEY
            });

            const memories = getRecentMemory(6);

            let conversation = "";

            for (const memory of memories) {

                conversation +=
                    `User: ${memory.user}\n` +
                    `Krishti AI: ${memory.assistant}\n\n`;
            }

            const prompt =
                `You are Krishti AI, a helpful and intelligent AI assistant.
Answer clearly, naturally and concisely.

Previous conversation:
${conversation}

User's new message:
${message}`;

            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: prompt
            });

            const fullResponse =
                response.text || "Sorry, I could not generate a response.";

            saveMemory(message, fullResponse);

            sendJSON(res, 200, {
                reply: fullResponse
            });

        } catch (error) {

            console.error("AI ERROR:", error);

            sendJSON(res, 500, {
                reply: "Krishti AI error: " + error.message
            });
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

server.listen(PORT, HOST, () => {

    console.log("");
    console.log("=================================");
    console.log("       KRISHTI AI SERVER");
    console.log("=================================");
    console.log(`Website: http://${HOST}:${PORT}`);
    console.log("Model: " + GEMINI_MODEL);
    console.log("Memory: ENABLED");
    console.log("AI: GEMINI");
    console.log("=================================");
});
