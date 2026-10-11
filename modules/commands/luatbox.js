const fs = require("fs");
const path = require("path");
const axios = require("axios");

const DATA_DIR = path.join(__dirname, "..", "cache", "luatbox_data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

module.exports.config = {
    name: "luatbox",
    version: "8.1.0",
    hasPermssion: 0,
    credits: "pcoder (chỉnh sửa bởi Gemini)",
    description: "Quản lý và cài đặt luật lệ cho nhóm. Gõ 'luật' hoặc 'luật box' để xem.",
    commandCategory: "Tiện ích",
    usages: "[set/add/clear/autowelcome/help]",
    cooldowns: 5,
    dependencies: { "axios": "" },
    aliases: ["luật", "rules"] // Thêm alias để có thể dùng .luật
};

// --- Các hàm hỗ trợ ---
async function getStreamFromURL(url) { try { const r = await axios.get(url, { responseType: 'stream' }); return r.data; } catch (e) { console.error(e); return null; } }
async function uploadToCatbox(url) { try { const r = await axios.get(`https://catbox-mnib.onrender.com/upload?url=${encodeURIComponent(url)}`); return r.data.url; } catch (e) { return null; } }
function dataFile(threadID) { return path.join(DATA_DIR, `${threadID}.json`); }
function readData(threadID) { try { const file = dataFile(threadID); if (!fs.existsSync(file)) return null; return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; } }
function writeData(threadID, data) { try { fs.writeFileSync(dataFile(threadID), JSON.stringify(data, null, 2), "utf8"); } catch (e) {} }
function isAdmin(event) { if (!event.isGroup) return false; return (event.threadAdminIDs || []).some(i => i.id == event.senderID); }
function extractMediaFromMsg(msg) { let urls = []; if (msg.attachments) { for (const att of msg.attachments) { if (["photo", "video", "animated_image"].includes(att.type) && att.url) urls.push(att.url); } } return urls; }

// --- Hàm hiển thị luật ---
async function displayRules(api, event, Users) {
    const { threadID, messageID } = event;
    const data = readData(threadID);
    if (!data || (!data.text && (!data.media || data.media.length === 0))) {
        return api.sendMessage(`⚠️ Nhóm này chưa đặt luật. QTV dùng "${global.config.PREFIX}luatbox set" để đặt luật.`, threadID, messageID);
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

// --- Logic chính khi gọi lệnh (khi có prefix) ---
module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID, senderID, isGroup } = event;
    const command = args[0]?.toLowerCase();
    const prefix = global.config.PREFIX || ".";

    // Nếu không có args (vd: .luatbox) thì vẫn hiện luật
    if (!command) return displayRules(api, event, Users);

    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    const isGroupAdmin = isAdmin(event);
    if (["set", "add", "clear", "autowelcome"].includes(command)) {
        if (!isGroup) return api.sendMessage("⚠️ Lệnh này chỉ dành cho nhóm.", threadID, messageID);
        if (!isGroupAdmin && !isBotAdmin) return api.sendMessage("⚠️ Bạn phải là Quản trị viên nhóm để dùng lệnh này.", threadID, messageID);
    }

    switch (command) {
        case "set": {
            const text = args.slice(1).join(" ").trim();
            let tempMediaUrls = event.messageReply ? extractMediaFromMsg(event.messageReply) : [];
            if (!text && tempMediaUrls.length === 0) return api.sendMessage("⚠️ Vui lòng nhập nội dung hoặc reply media.", threadID, messageID);
            let permanentMediaUrls = [];
            if (tempMediaUrls.length > 0) {
                api.sendMessage(`⏳ Đang xử lý và upload ${tempMediaUrls.length} media...`, threadID, messageID);
                for (const url of tempMediaUrls) {
                    const catboxUrl = await uploadToCatbox(url);
                    if (catboxUrl) permanentMediaUrls.push(catboxUrl);
                }
            }
            const dataToWrite = readData(threadID) || {};
            dataToWrite.text = text;
            dataToWrite.media = permanentMediaUrls;
            dataToWrite.setBy = senderID;
            dataToWrite.time = Date.now();
            if (typeof dataToWrite.autoWelcome !== 'boolean') dataToWrite.autoWelcome = true;
            writeData(threadID, dataToWrite);
            let successMsg = "✅ Đã lưu luật nhóm thành công!";
            if (dataToWrite.autoWelcome) successMsg += `\nℹ️ Tự động gửi luật cho thành viên mới đang BẬT. Dùng "${prefix}luatbox autowelcome off" để tắt.`;
            else successMsg += `\nℹ️ Tự động gửi luật cho thành viên mới đang TẮT. Dùng "${prefix}luatbox autowelcome on" để bật.`;
            return api.sendMessage(successMsg, threadID, messageID);
        }
        case "autowelcome": {
            let data = readData(threadID) || {};
            let status = args[1]?.toLowerCase();
            if (status === "on") {
                if (!data.text && (!data.media || data.media.length === 0)) return api.sendMessage("⚠️ Không thể bật! Nhóm chưa có luật.", threadID, messageID);
                data.autoWelcome = true;
                writeData(threadID, data);
                return api.sendMessage("✅ Đã BẬT tính năng tự động gửi luật cho thành viên mới.", threadID, messageID);
            } else if (status === "off") {
                data.autoWelcome = false;
                writeData(threadID, data);
                return api.sendMessage("✅ Đã TẮT tính năng tự động gửi luật cho thành viên mới.", threadID, messageID);
            } else {
                const currentStatus = (data.autoWelcome !== false) ? "BẬT" : "TẮT";
                return api.sendMessage(`⚠️ Sai cú pháp. Trạng thái hiện tại: ${currentStatus}\n\nDùng: "${prefix}luatbox autowelcome on" hoặc "${prefix}luatbox autowelcome off"`, threadID, messageID);
            }
        }
        case "add": { if (!event.messageReply) return api.sendMessage("⚠️ Vui lòng reply media để thêm.", threadID, messageID); let tempMediaUrls = extractMediaFromMsg(event.messageReply); if (tempMediaUrls.length === 0) return api.sendMessage("⚠️ Không tìm thấy media hợp lệ.", threadID, messageID); api.sendMessage(`⏳ Đang xử lý và upload ${tempMediaUrls.length} media...`, threadID, messageID); const data = readData(threadID) || { media: [] }; let addedCount = 0; for (const url of tempMediaUrls) { const catboxUrl = await uploadToCatbox(url); if (catboxUrl && !data.media.includes(catboxUrl)) { data.media.push(catboxUrl); addedCount++; } } if (addedCount > 0) { data.setBy = senderID; data.time = Date.now(); writeData(threadID, data); return api.sendMessage(`✅ Đã thêm thành công ${addedCount} media vào luật nhóm.`, threadID, messageID); } return api.sendMessage("ℹ️ Media này đã có hoặc không thể upload.", threadID, messageID); }
        case "clear": { if (fs.existsSync(dataFile(threadID))) { fs.unlinkSync(dataFile(threadID)); return api.sendMessage("✅ Đã xóa toàn bộ luật của nhóm.", threadID, messageID); } return api.sendMessage("ℹ️ Nhóm này chưa có luật để xóa.", threadID, messageID); }
        case "help": { return api.sendMessage(`╔═════『 𝗛ƯỚ𝗡𝗚 𝗗Ẫ𝗡 𝗟𝗨Ậ𝗧𝗕𝗢𝗫 』═════╗\n\n• Gõ "luật" hoặc "luật box" để xem.\n\n• ${prefix}luatbox set <nd>\n→ Đặt luật (reply media để đính kèm).\n\n• ${prefix}luatbox add\n→ Thêm media (reply media).\n\n• ${prefix}luatbox clear\n→ Xóa luật nhóm.\n\n• ${prefix}luatbox autowelcome [on/off]\n→ Bật/tắt tự động gửi luật cho thành viên mới.\n\n╚════════════════════════════╝`, threadID, messageID); }
        default: return displayRules(api, event, Users); // Nếu gõ lệnh lạ thì cũng hiện luật
    }
};

// --- Xử lý sự kiện (để chạy noprefix) ---
module.exports.handleEvent = async function({ api, event, Users }) {
    const { body } = event;
    if (!body) return;

    // Các từ khóa để trigger (viết thường)
    const triggerWords = ["luật", "luật box"];

    // Kiểm tra nếu nội dung tin nhắn là một trong các từ khóa
    if (triggerWords.includes(body.toLowerCase())) {
        return displayRules(api, event, Users);
    }
};

// --- Logic chào mừng thành viên mới ---
module.exports.handleEvent.onUserJoined = async ({ api, event }) => {
    const { threadID, logMessageData } = event;
    const data = readData(threadID);
    if (!data || data.autoWelcome !== true) return;
    
    const userNames = logMessageData.addedParticipants.map(p => p.fullName).join(', ');
    
    let msg = `Chào mừng ${userNames} đã đến với nhóm!\n\nVui lòng đọc qua luật/quy định của nhóm nhé:\n──────────────────\n`;
    if (data.text) msg += `${data.text}`;
    
    let attachments = [];
    if (data.media && data.media.length > 0) {
        for (const url of data.media) {
            const stream = await getStreamFromURL(url);
            if (stream) attachments.push(stream);
        }
    }
    api.sendMessage({ body: msg, attachment: attachments }, threadID);
};