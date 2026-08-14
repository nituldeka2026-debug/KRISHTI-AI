const fs = require("fs");
const path = require("path");

const dataFolder = path.join(__dirname, "..", "data");
const memoryFile = path.join(dataFolder, "conversations.json");

// Create data folder if it doesn't exist
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

// Create memory file if it doesn't exist
if (!fs.existsSync(memoryFile)) {
    fs.writeFileSync(memoryFile, "[]", "utf8");
}

// Get all conversations
function getMemory() {
    try {
        const data = fs.readFileSync(memoryFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Memory read error:", error.message);
        return [];
    }
}

// Save one conversation
function saveMemory(userMessage, aiResponse) {
    try {
        const memories = getMemory();

        memories.push({
            user: userMessage,
            assistant: aiResponse,
            time: new Date().toISOString()
        });

        // Keep latest 100 conversations
        const latestMemories = memories.slice(-100);

        fs.writeFileSync(
            memoryFile,
            JSON.stringify(latestMemories, null, 2),
            "utf8"
        );

        return true;
    } catch (error) {
        console.error("Memory save error:", error.message);
        return false;
    }
}

// Get recent conversations for AI
function getRecentMemory(limit = 10) {
    const memories = getMemory();
    return memories.slice(-limit);
}

// Clear all memory
function clearMemory() {
    try {
        fs.writeFileSync(memoryFile, "[]", "utf8");
        return true;
    } catch (error) {
        console.error("Memory clear error:", error.message);
        return false;
    }
}

module.exports = {
    getMemory,
    saveMemory,
    getRecentMemory,
    clearMemory
};