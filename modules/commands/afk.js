const fs = require("fs-extra");
const path = __dirname + '/cache/afk.json';

// Helper function để chuyển đổi mili giây sang định dạng Giờ:Phút:Giây
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    let formattedString = "";
    if (hours > 0) formattedString += `${hours} giờ `;
    if (minutes > 0) formattedString += `${minutes} phút `;
    if (seconds > 0) formattedString += `${seconds} giây`;

    return formattedString.trim() || "vài giây";
}

module.exports.config = {
    name: "afk",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Mirai Team & D-Jukie (nâng cấp)",
    description: "Tự động thông báo bạn đang AFK khi có người tag, có lưu trữ trạng thái.",
    commandCategory: "Nhóm",
    usages: "[lý do]",
    cooldowns: 5
};

module.exports.onLoad = () => {
    // Tạo file nếu chưa tồn tại
    if (!fs.existsSync(path)) fs.writeFileSync(path, "{}");
}

module.exports.run = async ({ event, api, args, Users }) => {
    const { threadID, senderID, messageID } = event;
    const afkData = JSON.parse(fs.readFileSync(path));

    const reason = args.join(" ") || "Không có lý do";
    const name = await Users.getNameUser(senderID);

    afkData[senderID] = {
        reason: reason,
        time: Date.now()
    };

    fs.writeFileSync(path, JSON.stringify(afkData, null, 4));

    return api.sendMessage(`✅ Đã bật chế độ AFK cho ${name}.\n📝 Lý do: ${reason}`, threadID, messageID);
};

module.exports.handleEvent = async ({ event, api, Users }) => {
    const { threadID, senderID, messageID, mentions, body } = event;

    // Đọc dữ liệu AFK từ file
    if (!fs.existsSync(path)) return;
    const afkData = JSON.parse(fs.readFileSync(path));

    // 1. Tự động tắt AFK khi người dùng nhắn tin
    if (afkData[senderID]) {
        const name = await Users.getNameUser(senderID);
        const { time } = afkData[senderID];
        const afkTime = formatTime(Date.now() - time);

        // Xóa người dùng khỏi danh sách AFK
        delete afkData[senderID];
        fs.writeFileSync(path, JSON.stringify(afkData, null, 4));

        return api.sendMessage(`👋 Chào mừng ${name} đã quay trở lại sau ${afkTime} AFK.`, threadID);
    }

    // 2. Kiểm tra nếu có ai đó tag người đang AFK
    if (mentions && Object.keys(mentions).length > 0) {
        const afkUsersInfo = [];

        for (const userID in mentions) {
            if (afkData[userID]) {
                const { reason, time } = afkData[userID];
                const afkTime = formatTime(Date.now() - time);
                const mentionedName = mentions[userID].replace('@', '');
                
                afkUsersInfo.push(
                    `👤 ${mentionedName} đang bận với lý do: "${reason}"\n⏰ Đã AFK được: ${afkTime}.`
                );
            }
        }

        // Nếu có người AFK được tag, gửi một thông báo duy nhất
        if (afkUsersInfo.length > 0) {
            const message = `🚫 Người bạn tag hiện không có mặt:\n\n${afkUsersInfo.join('\n\n')}`;
            return api.sendMessage(message, threadID, messageID);
        }
    }
};