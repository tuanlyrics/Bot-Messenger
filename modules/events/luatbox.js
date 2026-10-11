const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Cần có config riêng cho file event
module.exports.config = {
    name: "luatboxEvent",
    version: "1.0.0",
    credits: "pcoder & Gemini",
    description: "Lắng nghe sự kiện để tự động gửi luật nhóm (noprefix và welcome).",
};

// --- Các hàm hỗ trợ (sao chép lại những hàm cần thiết) ---
const DATA_DIR = path.join(__dirname, "..", "cache", "luatbox_data");
async function getStreamFromURL(url) { try { const r = await axios.get(url, { responseType: 'stream' }); return r.data; } catch (e) { return null; } }
function dataFile(threadID) { return path.join(DATA_DIR, `${threadID}.json`); }
function readData(threadID) { try { const file = dataFile(threadID); if (!fs.existsSync(file)) return null; return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; } }

// --- Hàm hiển thị luật (phiên bản cho event, im lặng khi không có luật) ---
async function displayRules(api, event, Users) {
    const { threadID, messageID } = event;
    const data = readData(threadID);

    // Noprefix sẽ im lặng nếu không có luật
    if (!data || (!data.text && (!data.media || data.media.length === 0))) {
        return;
    }

    const userName = (await Users.getData(data.setBy))?.name || data.setBy;
    let msg = `⚜️ 『 𝗟𝗨Ậ𝗧 / 𝗤𝗨𝗬 ĐỊ𝗡𝗛 𝗡𝗛Ó𝗠 』 ⚜️\n\n`;
    if (data.text) msg += `📝 ${data.text}\n\n`;
    msg += `──────────────────\n`;
    msg += `👑 Cập nhật bởi: ${userName}\n🕒 Lúc: ${new Date(data.time).toLocaleString("vi-VN")}`;
    let attachments = [];
    if (data.media && data.media.length > 0) {
        api.sendMessage("⏳ Đang tải media, vui lòng chờ...", threadID);
        for (const url of data.media) {
            const stream = await getStreamFromURL(url);
            if (stream) attachments.push(stream);
        }
    }
    api.sendMessage({ body: msg, attachment: attachments }, threadID, messageID);
}

// --- Xử lý sự kiện (Noprefix & Welcome) ---
// Với file event, ta dùng module.exports.run thay vì handleEvent
module.exports.run = async function({ api, event, Users }) {
    const { threadID, body, logMessageData, type } = event;

    // 1. NOPREFIX: Lắng nghe tin nhắn "luật" hoặc "luật box"
    if (type === "message" || type === "message_reply") {
        const lowerBody = body?.toLowerCase();
        if (lowerBody === "luật" || lowerBody === "luật box") {
            return displayRules(api, event, Users);
        }
    }

    // 2. WELCOME: Lắng nghe sự kiện có thành viên mới
    if (type === "subscribe") {
        const data = readData(threadID);
        if (!data || data.autoWelcome === false || !data.text) {
            return;
        }

        const newMembers = logMessageData.addedParticipants;
        for (const member of newMembers) {
            if (member.userFbId === api.getCurrentUserID()) continue;

            const userName = member.fullName;
            let msg = `👋 Chào mừng ${userName} đã đến với nhóm!\n\n`;
            msg += `Vui lòng đọc qua nội quy của nhóm nhé:\n\n📝 ${data.text}`;
            if (data.media && data.media.length > 0) {
                msg += `\n\n(Luật có đính kèm media, gõ "luật" để xem đầy đủ)`;
            }
            
            api.sendMessage({
                body: msg,
                mentions: [{
                    tag: userName,
                    id: member.userFbId
                }]
            }, threadID);
        }
    }
};