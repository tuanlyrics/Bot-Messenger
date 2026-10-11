module.exports = function ({ api, models, Users, Threads, Currencies }) {
    // === Thư viện và Helpers ===
    const stringSimilarity = require('string-similarity');
    const logger = require("../../utils/log.js");
    const fs = require('fs').promises;
    const path = require('path');
    const moment = require("moment-timezone");

    function getTimeVN() {
        return moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");
    }

    async function sendTempMessage(msg, threadID, delay = 15, messageID = null) {
        try {
            const info = await api.sendMessage(msg, threadID, messageID);
            setTimeout(() => api.unsendMessage(info.messageID).catch(() => {}), delay * 1000);
        } catch (e) {
            console.error("Lỗi khi gửi tin nhắn tự xóa:", e);
        }
    }

    async function readJsonFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    // Hàm xử lý sự kiện chính
    return async function ({ event }) {
        const { allowInbox, PREFIX, ADMINBOT, NDH, DeveloperMode, adminOnly, qtvOnlyPath } = global.config;
        const { userBanned, threadBanned, commandBanned, threadData } = global.data;
        const { commands, cooldowns } = global.client;
        const { body, senderID, threadID, messageID, type } = event;

        if (!body || senderID === api.getCurrentUserID()) return;

        // --- XỬ LÝ SỰ KIỆN GỠ TIN NHẮN ---
        if (type === "message_unsend") {
            for (const cmd of commands.values()) {
                if (typeof cmd.handleUnsend === "function") {
                    try {
                        await cmd.handleUnsend({ api, event, Users, Threads, Currencies });
                    } catch (e) {
                        console.error(`Lỗi khi xử lý onUnsend cho lệnh "${cmd.config.name}":`, e);
                    }
                }
            }
            return;
        }

        const threadSetting = threadData.get(threadID) || {};
        const prefix = threadSetting.PREFIX || PREFIX;
        
        // --- XỬ LÝ NOPREFIX ---
        for (const cmd of commands.values()) {
            if (cmd.config.handleEvent && typeof cmd.config.name === 'string' && body.startsWith(cmd.config.name)) {
                try {
                    await cmd.handleEvent({ api, event, Users, Threads, Currencies });
                } catch (e) {
                    console.error(`Lỗi khi thực thi handleEvent của lệnh "${cmd.config.name}":`, e);
                }
            }
        }

        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        const command = commands.get(commandName) || commands.find(cmd => cmd.config.aliases && cmd.config.aliases.includes(commandName));

        // --- NẾU KHÔNG PHẢI LỆNH HỢP LỆ THÌ DỪNG LẠI ---
        if (!command) {
            const allCommandNames = Array.from(commands.keys());
            const { bestMatch } = stringSimilarity.findBestMatch(commandName, allCommandNames);
            if (bestMatch.rating >= 0.5) {
                return sendTempMessage(`Lệnh "${commandName}" không tồn tại. Có phải bạn muốn dùng lệnh "${bestMatch.target}" không?`, threadID, 15, messageID);
            }
            return;
        }

        // --- CÁC TẦNG KIỂM TRA QUYỀN HẠN (CHỈ CHẠY KHI LỆNH HỢP LỆ) ---
        const threadInfo = await api.getThreadInfo(threadID);
        const isAdminBox = threadInfo.adminIDs.some(item => item.id == senderID);

        // 1. Nếu user bị ban -> chỉ chặn user đó
if (userBanned.has(senderID) && !ADMINBOT.includes(senderID)) {
    return sendTempMessage("Bạn đã bị cấm sử dụng bot.", threadID, 15, messageID);
}

// 2. Nếu box bị ban -> chặn tất cả trong box trừ admin bot
if (threadBanned.has(threadID) && !ADMINBOT.includes(senderID)) {
    return sendTempMessage("Nhóm này đã bị cấm sử dụng bot.", threadID, 15, messageID);
}


        // 2. Chế độ Admin Only
        if (adminOnly === true && !ADMINBOT.includes(senderID)) {
            return sendTempMessage("Hiện tại chỉ Admin Bot mới có thể sử dụng bot.", threadID, 10, messageID);
        }
        
        // 3. Chế độ QTV Only
        if (qtvOnlyPath) {
            const qtvOnlyData = await readJsonFile(qtvOnlyPath);
            if (qtvOnlyData[threadID]?.enabled === true && !ADMINBOT.includes(senderID) && !isAdminBox) {
                return sendTempMessage("Nhóm đang bật chế độ qtvonly, chỉ quản trị viên mới có thể sử dụng bot.", threadID, 10, messageID);
            }
        }
        
        // 4. Kiểm tra quyền hạn lệnh (hasPermssion)
        let permssion = 0;
        if (NDH.includes(senderID)) permssion = 3;
        else if (ADMINBOT.includes(senderID)) permssion = 2;
        else if (isAdminBox) permssion = 1;

        if (command.config.hasPermssion > permssion) {
            return sendTempMessage("Bạn không đủ quyền hạn để sử dụng lệnh này.", threadID, 10, messageID);
        }
        
        // 5. Chặn lệnh trong nhóm (command ban)
        if (commandBanned.get(threadID)?.includes(commandName) && !ADMINBOT.includes(senderID) && !isAdminBox) {
            return sendTempMessage(`Lệnh "${commandName}" đã bị cấm trong nhóm này.`, threadID, 10, messageID);
        }
        
        // 6. Chặn NSFW
        if (command.config.commandCategory?.toLowerCase() === 'nsfw' && !global.data.threadAllowNSFW.includes(threadID) && !ADMINBOT.includes(senderID)) {
            return sendTempMessage("Nhóm của bạn chưa bật chế độ NSFW.", threadID, 15, messageID);
        }

        // --- XỬ LÝ COOLDOWN ---
        if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Map());
        const timestamps = cooldowns.get(commandName);
        const cooldownAmount = (command.config.cooldowns || 1) * 1000;
        
        if (timestamps.has(senderID) && !ADMINBOT.includes(senderID)) {
            const expirationTime = timestamps.get(senderID) + cooldownAmount;
            if (Date.now() < expirationTime) {
                const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(1);
                return sendTempMessage(`Vui lòng chờ ${timeLeft} giây nữa để có thể dùng lại lệnh "${commandName}".`, threadID, 10, messageID);
            }
        }

        // --- THỰC THI LỆNH ---
        try {
            const getText = (key, ...args) => {
                const lang = command.languages?.[global.config.language]?.[key] || '';
                return lang.replace(/%(\d+)/g, (_, i) => args[i - 1] || '');
            };

            await command.run({ api, event, args, models, Users, Threads, Currencies, permssion, getText });
            timestamps.set(senderID, Date.now());
            
            if (DeveloperMode === true) {
                logger(`${getTimeVN()} | ${commandName} | ${senderID} | ${threadID} | ${args.join(" ")}`, "[DEV MODE]");
            }
        } catch (e) {
            console.error(`Lỗi khi thực thi lệnh "${commandName}":`, e);
            return api.sendMessage(`Đã xảy ra lỗi khi thực thi lệnh "${commandName}".\nChi tiết: ${e.message}`, threadID, messageID);
        }
    };
};