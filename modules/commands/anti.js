const { readJsonSync, writeJsonSync, ensureDirSync, existsSync } = require("fs-extra");
const path = require('path');
const axios = require('axios');

// --- Cấu hình đường dẫn ---
const cacheDir = path.join(__dirname, "cache");
const antiPath = path.join(cacheDir, "anti_settings.json");
const chongCuopBoxDir = path.join(cacheDir, "chongcuopbox");
const monitoringPath = path.join(chongCuopBoxDir, "monitoring.json");
const blacklistPath = path.join(chongCuopBoxDir, "blacklist.json");

// --- Khởi tạo thư mục và file cần thiết ---
ensureDirSync(cacheDir);
ensureDirSync(chongCuopBoxDir);
if (!existsSync(antiPath)) writeJsonSync(antiPath, {});
if (!existsSync(monitoringPath)) writeJsonSync(monitoringPath, {});
if (!existsSync(blacklistPath)) writeJsonSync(blacklistPath, {});

// --- Class Catbox Uploader (Cần cho việc lưu ảnh khi bật anti) ---
class Catbox {
    async uploadImage(url) {
        try {
            const response = await axios.get(`https://catbox-mnib.onrender.com/upload?url=${encodeURIComponent(url)}`);
            if (response.data && response.data.url) return response.data.url;
            throw new Error("API response không hợp lệ từ Catbox");
        } catch (error) {
            console.error("[CATBOX ERROR] Lỗi khi upload ảnh:", error.message);
            return null;
        }
    }
}

module.exports.config = {
    name: "anti",
    version: "15.1.0", // Tăng version
    hasPermssion: 1,
    credits: "Pcoder & Gemini",
    description: "Cấu hình các tính năng bảo vệ nhóm, bao gồm anti-spam.",
    commandCategory: "Nhóm",
    usages: "[blacklist view] | [spam <số tin> <giây>]",
    cooldowns: 5,
    dependencies: { "axios": "", "fs-extra": "", "path": "" }
};

// --- HÀM QUẢN LÝ DỮ LIỆU ---
const getThreadData = (threadID) => readJsonSync(antiPath, { throws: false })?.[threadID] || {};
const saveThreadData = (threadID, data) => {
    const allSettings = readJsonSync(antiPath, { throws: false }) || {};
    allSettings[threadID] = { ...allSettings[threadID], ...data };
    writeJsonSync(antiPath, allSettings, { spaces: 4 });
};

// --- LOGIC LỆNH CHÍNH ---
module.exports.run = async ({ api, event, args, Users }) => {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();
    const threadSettings = getThreadData(threadID); // Lấy cài đặt sớm

    // --- Cài đặt Anti-Spam ---
    if (command === 'spam') {
        const count = parseInt(args[1]);
        const time = parseInt(args[2]);

        if (isNaN(count) || isNaN(time) || count <= 0 || time <= 0) {
            const currentConfig = threadSettings.antiSpamConfig || { count: 5, time: 10 }; // Default
            return api.sendMessage(
                `❌ Cú pháp không hợp lệ.\n` +
                `👉 Dùng: anti spam <số tin nhắn> <thời gian (giây)>\n` +
                `Ví dụ: anti spam 5 10 (cho 5 tin nhắn trong 10 giây)\n` +
                `Hiện tại: ${currentConfig.count} tin / ${currentConfig.time} giây.`,
                threadID,
                messageID
            );
        }

        const newConfig = { count, time };
        // Lưu cả cài đặt cũ và cài đặt antiSpam mới
        saveThreadData(threadID, { ...threadSettings, antiSpamConfig: newConfig });
        
        return api.sendMessage(
            `✅ Đã cập nhật cài đặt Anti-Spam:\n` +
            `Giới hạn: ${count} tin nhắn mỗi ${time} giây.`,
            threadID,
            messageID
        );
    }

    // Các lệnh phụ (blacklist)
    if (command === 'blacklist' && args[1]?.toLowerCase() === 'view') {
        const blacklist = readJsonSync(blacklistPath, { throws: false }) || {};
        if (Object.keys(blacklist).length === 0) return api.sendMessage("✅ Danh sách đen hiện đang trống.", threadID, messageID);
        let msg = "🔐 DANH SÁCH ĐEN:\n\n";
        for (const [uid, data] of Object.entries(blacklist)) {
            const userName = (await Users.getData(uid))?.name || uid;
            msg += `- Tên: ${userName} (UID: ${uid})\n- Lý do: ${data.reason}\n\n`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // --- Menu Anti bằng văn bản ---
    try {
        // threadSettings đã được lấy ở trên
        const options = [
            { name: "Anti đổi tên nhóm", setting: "antiChangeGroupName" },
            { name: "Anti đổi ảnh nhóm", setting: "antiChangeGroupImage" },
            { name: "Anti đổi biệt danh", setting: "antiChangeNickname" },
            { name: "Anti out chùa", setting: "antiOut" },
            { name: "Anti QTV (cướp box)", setting: "antiQTV" },
            { name: "Anti thêm thành viên", setting: "antiJoin" },
            { name: "Anti gửi link", setting: "antiLink" },
            { name: "Anti tag (all/nhiều)", setting: "antiTag" },
            { name: "Anti Spam", setting: "antiSpam" } // Thêm Anti-Spam
        ];

        let menuText = "🛡️ BẢNG ĐIỀU KHIỂN ANTI 🛡️\n\n";
        options.forEach((opt, index) => {
            const statusIcon = threadSettings[opt.setting] ? "✅" : "❌";
            menuText += `${index + 1}. ${statusIcon} ${opt.name}\n`;
        });

        // Thêm thông tin cấu hình spam
        const spamConfig = threadSettings.antiSpamConfig || { count: 5, time: 10 }; // Default
        menuText += `\n📌 Anti-Spam: ${spamConfig.count} tin nhắn / ${spamConfig.time} giây.`;
        menuText += `\n👉 Dùng 'anti spam <số tin> <giây>' để đổi.`;

        menuText += "\n\n👉 Reply tin nhắn này bằng số để Bật/Tắt.\n(Có thể chọn nhiều, ví dụ: 1 2 9)";

        api.sendMessage(menuText, threadID, (err, info) => {
            if (err) return console.error("[ANTI CMD ERROR]", err);
            global.client.handleReply.push({
                name: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                options
            });
        }, messageID);
    } catch (error) {
        console.error("[ANTI CMD CRITICAL]", error);
        api.sendMessage("Đã có lỗi xảy ra, không thể hiển thị menu anti.", threadID, messageID);
    }
};

// --- XỬ LÝ REPLY ---
// Không cần thay đổi gì ở đây, nó sẽ tự động xử lý Bật/Tắt cho "antiSpam"
module.exports.handleReply = async function ({ api, event, handleReply, Threads }) {
    const { threadID, messageID, senderID, body } = event;
    if (senderID !== handleReply.author) return;

    const { options } = handleReply;
    const choices = [...new Set(body.split(/\s+|,/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= options.length))];
    
    if (choices.length === 0) return;

    api.unsendMessage(handleReply.messageID).catch(() => {});

    try {
        let settingsToSave = getThreadData(threadID);
        const changedFeatures = [];
        let threadInfo;

        const needsInfoFetch = choices.some(choice => {
            const settingName = options[choice - 1].setting;
            // Chỉ fetch info nếu BẬT một tính năng cần nó
            return !settingsToSave[settingName] && [
                "antiChangeGroupName", 
                "antiChangeGroupImage", 
                "antiChangeNickname"
            ].includes(settingName);
        });

        if (needsInfoFetch) {
            threadInfo = await Threads.getInfo(threadID);
        }

        for (const choice of choices) {
            const option = options[choice - 1];
            const newStatus = !settingsToSave[option.setting];
            settingsToSave[option.setting] = newStatus;

            if (newStatus && threadInfo) {
                switch (option.setting) {
                    case "antiChangeGroupName": settingsToSave.groupName = threadInfo.threadName; break;
                    case "antiChangeGroupImage":
                        if (threadInfo.imageSrc) {
                            const catbox = new Catbox();
                            settingsToSave.groupImage = await catbox.uploadImage(threadInfo.imageSrc) || threadInfo.imageSrc;
                        }
                        break;
                    case "antiChangeNickname": settingsToSave.nicknames = threadInfo.nicknames; break;
                }
            }
            changedFeatures.push(`- ${option.name}: Đã ${newStatus ? "Bật" : "Tắt"}`);
        }

        saveThreadData(threadID, settingsToSave);
        api.sendMessage(`[ CẬP NHẬT ANTI ]\n\n${changedFeatures.join("\n")}`, threadID, messageID);
    } catch (error) {
        console.error("[ANTI REPLY CRITICAL]", error);
        api.sendMessage("Đã có lỗi xảy ra khi cập nhật cài đặt anti.", threadID, messageID);
    }
};