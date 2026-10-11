const fs = require("fs");
const path = __dirname + "/cache/autodtv.json";

module.exports.config = {
    name: "autodtv",
    version: "3.0.0", // Nâng cấp phiên bản
    hasPermssion: 1,
    credits: "Thiệu Trung Kiên (Cải tiến bởi AI)",
    description: "Bật/tắt tự động duyệt hoặc duyệt ngay tất cả thành viên đang chờ.",
    commandCategory: "Quản trị nhóm",
    usages: "[on/off]",
    cooldowns: 5
};

module.exports.onLoad = () => {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify([]));
    }
};

module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID } = event;
    let data = JSON.parse(fs.readFileSync(path));

    const { adminIDs } = await api.getThreadInfo(threadID);
    if (!adminIDs.some(item => item.id === api.getCurrentUserID())) {
        return api.sendMessage("⚠️ Bot cần quyền quản trị viên để sử dụng tính năng này.", threadID, messageID);
    }

    const command = args[0]?.toLowerCase();

    // === BẬT VÀ TỰ ĐỘNG DUYỆT NGAY ===
    if (command === "on") {
        if (data.includes(threadID)) {
            return api.sendMessage("👉 Tính năng tự động duyệt đã được bật từ trước.", threadID, messageID);
        }

        // Bật tính năng trước
        data.push(threadID);
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
        
        let msg = "✅ Đã bật tính năng tự động gợi ý duyệt thành viên.\n";

        // Lấy danh sách chờ và duyệt
        const threadInfo = await api.getThreadInfo(threadID);
        const approvalQueue = threadInfo.approvalQueue;

        if (approvalQueue.length > 0) {
            let successCount = 0;
            let failCount = 0;
            let approvedNames = [];

            msg += "\n🚀 Bắt đầu tự động duyệt danh sách chờ...\n";

            for (const user of approvalQueue) {
                try {
                    await api.addUserToGroup(user.requesterID, threadID);
                    const name = await Users.getNameUser(user.requesterID);
                    approvedNames.push(name);
                    successCount++;
                } catch (e) {
                    failCount++;
                    console.error(`Lỗi không thể duyệt ${user.requesterID}:`, e);
                }
            }

            if (successCount > 0) {
                msg += `\n- Đã duyệt thành công ${successCount} thành viên.`;
            }
            if (failCount > 0) {
                msg += `\n- Có ${failCount} thành viên không thể duyệt do lỗi.`;
            }
        } else {
            msg += "\nℹ️ Hiện không có ai trong danh sách chờ để duyệt.";
        }
        
        return api.sendMessage(msg, threadID, messageID);
    }

    // === TẮT TÍNH NĂNG ===
    if (command === "off") {
        if (data.includes(threadID)) {
            data = data.filter(id => id !== threadID);
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
            return api.sendMessage("☑️ Đã tắt tính năng tự động gợi ý duyệt thành viên.", threadID, messageID);
        } else {
            return api.sendMessage("👉 Tính năng này chưa được bật.", threadID, messageID);
        }
    }
    
    // === DUYỆT THỦ CÔNG (NẾU KHÔNG DÙNG ON/OFF) ===
    const threadInfo = await api.getThreadInfo(threadID);
    const approvalQueue = threadInfo.approvalQueue;

    if (approvalQueue.length === 0) {
        return api.sendMessage("✅ Hiện tại không có ai trong danh sách chờ.", threadID, messageID);
    }

    let listMsg = "📝 DANH SÁCH THÀNH VIÊN CHỜ PHÊ DUYỆT:\n\n";
    for (let i = 0; i < approvalQueue.length; i++) {
        const user = approvalQueue[i];
        const name = (await Users.getData(user.requesterID))?.name || "Không rõ";
        listMsg += `[${i + 1}] ${name}\nUID: ${user.requesterID}\n\n`;
    }
    listMsg += "👉 Phản hồi (reply) tin nhắn này theo số thứ tự để duyệt.";

    return api.sendMessage(listMsg, threadID, (error, info) => {
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            queue: approvalQueue,
            type: "approve"
        });
    }, messageID);
};

module.exports.handleEvent = async function({ api, event, Users }) {
    const { threadID } = event;
    const data = JSON.parse(fs.readFileSync(path));

    if (!data.includes(threadID)) return;
    
    if (event.logMessageType === "log:subscribe") {
        const { adminIDs } = await api.getThreadInfo(threadID);
        if (!adminIDs.some(item => item.id === api.getCurrentUserID())) return;

        const approvalQueue = (await api.getThreadInfo(threadID)).approvalQueue;
        if (approvalQueue.length === 0) return;

        let msg = "📝 CÓ YÊU CẦU MỚI CẦN PHÊ DUYỆT:\n\n";
        for (let i = 0; i < approvalQueue.length; i++) {
            const name = await Users.getNameUser(approvalQueue[i].requesterID);
            msg += `[${i + 1}] ${name}\n`;
        }
        msg += "\n👉 Phản hồi (reply) theo số thứ tự để duyệt.";

        return api.sendMessage(msg, threadID, (err, info) => {
            if (err) return console.error(err);
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: event.author,
                queue: approvalQueue,
                type: "approve"
            });
        });
    }
};

module.exports.handleReply = async function({ api, event, handleReply, Users }) {
    const { threadID, messageID, body } = event;
    const { queue, author, type } = handleReply;

    if (event.senderID !== author || type !== "approve") return;

    const index = parseInt(body) - 1;
    if (isNaN(index) || index < 0 || index >= queue.length) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ.", threadID, messageID);
    }

    const userID = queue[index].requesterID;
    const userName = await Users.getNameUser(userID);

    try {
        await api.addUserToGroup(userID, threadID);
        api.unsendMessage(handleReply.messageID);
        return api.sendMessage(`✅ Đã duyệt thành công "${userName}" vào nhóm.`, threadID);
    } catch (e) {
        return api.sendMessage(`💔 Đã xảy ra lỗi, không thể duyệt "${userName}".`, threadID, messageID);
    }
};