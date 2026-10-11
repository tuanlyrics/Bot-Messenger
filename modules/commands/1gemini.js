const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "gemini",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "Kenne400k (mod by Gemini)",
    description: "Hỏi Gemini AI, có hỗ trợ ảnh.",
    commandCategory: "AI",
    usages: "[câu hỏi] hoặc reply ảnh + [câu hỏi]",
    cooldowns: 4,
};

// --- CONFIG API (Bạn nên giấu key này kỹ hơn) ---
const GEMINI_API_KEY = "AIzaSyAIrHT8PlzLDfRwV3HAwcTapkILpH322So";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- CÁC HÀM XỬ LÝ ẢNH (Giữ nguyên) ---
function imageToBase64(filePath) { return fs.readFileSync(filePath, { encoding: "base64" }); }
function getImageMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
}

// --- CÁC HÀM GỬI YÊU CẦU ĐẾN GEMINI (Giữ nguyên) ---
async function geminiVisionRequest({ prompt, imagePath }) {
    const reqBody = {
        contents: [{
            parts: [
                { text: prompt || "Phân tích nội dung ảnh này." },
                { inline_data: { mime_type: getImageMimeType(imagePath), data: imageToBase64(imagePath) } }
            ]
        }]
    };
    const { data } = await axios.post(GEMINI_API_URL, reqBody);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function geminiTextRequest(prompt) {
    const reqBody = { contents: [{ parts: [{ text: prompt }] }] };
    const { data } = await axios.post(GEMINI_API_URL, reqBody);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}


// --- HÀM CHÍNH (ĐÃ CẬP NHẬT) ---
module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, senderID } = event;
    const prompt = args.join(" ").trim();
    let responseText = "ủa alo, hỏi gì quên rồi? 🤔"; // Tin nhắn mặc định hài hước

    try {
        // Trường hợp 1: Reply ảnh
        if (messageReply?.attachments?.[0]?.type === "photo") {
            const imageUrl = messageReply.attachments[0].url;
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
            
            const imagePath = path.join(cacheDir, `${Date.now()}_${senderID}.jpg`);
            const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
            fs.writeFileSync(imagePath, imageResponse.data);

            responseText = await geminiVisionRequest({ prompt, imagePath: imagePath });
            try { fs.unlinkSync(imagePath); } catch (e) {} // Dọn dẹp file ảnh tạm

        // Trường hợp 2: Chỉ hỏi text
        } else if (prompt) {
            responseText = await geminiTextRequest(prompt);

        // Trường hợp 3: Không có gì cả
        } else {
            return api.sendMessage("Hỏi gì đi chứ sếp, im lặng đáng sợ lắm...", threadID, messageID);
        }

        // Gửi phản hồi cuối cùng
        if (responseText) {
            api.sendMessage(responseText, threadID, messageID);
        } else {
            api.sendMessage("Gemini ngơ rồi, không nghĩ ra gì để trả lời sếp luôn. 😅", threadID, messageID);
        }

    } catch (e) {
        console.error("[GEMINI] Lỗi:", e.response?.data || e.message);
        api.sendMessage("Ái chà, có vẻ Gemini đang bận đi pha cà phê. Sếp thử lại sau nhé! ☕", threadID, messageID);
    }
};