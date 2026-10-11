// File: modules/commands/addbox.js
const fs = require("fs");

module.exports.config = {
    name: "addbox",
    version: "1.0.0",
    hasPermssion: 3, // chỉ admin/NDH dùng được
    credits: "Gemini",
    description: "Thêm 1 UID vào tất cả nhóm bot có trong danh sách",
    commandCategory: "Quản trị viên",
    usages: "{prefix}addbox <uid>",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    const uid = args[0];
    if (!uid || isNaN(uid)) return api.sendMessage("⚠️ Vui lòng nhập UID hợp lệ.", event.threadID, event.messageID);

    const botID = api.getCurrentUserID();

    // lấy toàn bộ nhóm bot đang ở
    const listThread = await api.getThreadList(100, null, ["INBOX"]);
    const groupThreads = listThread.filter(t => t.isGroup);

    api.sendMessage(`🔄 Đang thêm UID ${uid} vào ${groupThreads.length} nhóm...`, event.threadID);

    let success = 0, fail = 0, promoted = 0;

    for (const thread of groupThreads) {
        try {
            await api.addUserToGroup(uid, thread.threadID);

            success++;

            // check bot có QTV trong nhóm đó không
            const threadInfo = await api.getThreadInfo(thread.threadID);
            const isBotQTV = threadInfo.adminIDs.some(ad => ad.id == botID);

            if (isBotQTV) {
                try {
                    await api.changeAdminStatus(thread.threadID, uid, true);
                    promoted++;
                } catch (e) {
                    console.log(`Không thể set QTV tại nhóm ${thread.threadID}`);
                }
            }

        } catch (e) {
            fail++;
            console.log(`Lỗi thêm vào nhóm ${thread.threadID}: ${e.error}`);
        }
    }

    return api.sendMessage(
        `✅ Thêm xong!\n\n✔️ Thành công: ${success}\n❌ Thất bại: ${fail}\n👑 Set QTV: ${promoted}`,
        event.threadID
    );
};
