module.exports.config = {
    name: "kick",
    version: "2.1.0",
    hasPermssion: 1,
    credits: "pcoder",
    description: "Kick người dùng bằng tag/reply hoặc lọc 'Người dùng Facebook'.",
    commandCategory: "Nhóm",
    usages: "[tag/reply/ndfb]",
    cooldowns: 3
};

module.exports.run = async function({ args, api, event, Threads }) {
    try {
        const threadInfo = await api.getThreadInfo(event.threadID);
        const botID = api.getCurrentUserID();
        const isBotAdmin = threadInfo.adminIDs.map(e => e.id).includes(botID);
        
        // Chỉ gửi message khi bot chưa có QTV
        if (!isBotAdmin) {
            return api.sendMessage(
                "❌ Bot không phải là quản trị viên, vui lòng cấp quyền QTV cho bot để sử dụng lệnh này.",
                event.threadID,
                event.messageID
            );
        }
        
        // Kick theo tag
        if (args.join(" ").includes("@")) {
            const mention = Object.keys(event.mentions);
            for (let id of mention) {
                if (id != botID && id != event.senderID) {
                    setTimeout(() => api.removeUserFromGroup(id, event.threadID), 1000);
                }
            }
            return;
        }
        
        // Kick theo reply
        if (event.type === "message_reply") {
            const uid = event.messageReply.senderID;
            if (uid != botID && uid != event.senderID) {
                return api.removeUserFromGroup(uid, event.threadID);
            }
            return; // Bỏ message cảnh báo
        }
        
        // Kick người dùng Facebook
        if (args[0] === "ndfb") {
            let arr = [];
            for (const u of threadInfo.userInfo) {
                if (u.gender === undefined && u.id != botID && u.id != event.senderID) {
                    arr.push(u.id);
                }
            }
            
            if (arr.length === 0) return; // Bỏ message thông báo
            
            // Kick thẳng không thông báo
            for (const id of arr) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await api.removeUserFromGroup(id, event.threadID);
                } catch {}
            }
            return;
        }
        
        // Không nhập gì thì không làm gì cả
        return;
        
    } catch (err) {
        console.error(err);
    }
};