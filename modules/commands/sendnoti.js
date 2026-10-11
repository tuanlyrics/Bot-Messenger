const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');

module.exports.config = {
    name: "sendnoti",
    version: "4.2.0",
    hasPermssion: 3,
    credits: "Pcoder & Gemini",
    description: "Gửi thông báo từ admin tới tất cả nhóm và phản hồi hai chiều.",
    commandCategory: "Admin",
    usages: "[nội dung]",
    cooldowns: 5,
};

// --- HÀM TẢI FILE ĐÍNH KÈM ---
async function downloadAttachments(attachments) {
    const downloadedPaths = [];
    for (const attachment of attachments) {
        try {
            const url = attachment.url;
            const fileName = `${Date.now()}_${path.basename(new URL(url).pathname)}`;
            const filePath = path.join(__dirname, 'cache', fileName);
            
            const response = await axios.get(url, { responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            downloadedPaths.push(filePath);
        } catch (error) {
            console.error("Lỗi khi tải file đính kèm:", error);
        }
    }
    return downloadedPaths;
}

// --- XỬ LÝ PHẢN HỒI (REPLY) ---
module.exports.handleReply = async function ({ api, event, handleReply, Users, Threads }) {
    const { threadID, messageID, senderID, body, attachments } = event;
    const { type, adminThreadID, userThreadID } = handleReply;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const senderName = await Users.getNameUser(senderID);
    let tempAttachmentPaths = [];

    try {
        let msg = {};
        
        if (attachments.length > 0) {
            tempAttachmentPaths = await downloadAttachments(attachments);
            msg.attachment = tempAttachmentPaths.map(filePath => fs.createReadStream(filePath));
        }

        switch (type) {
            case "user_reply": {
                const threadName = (await Threads.getInfo(threadID)).threadName || "Nhóm chat";
                msg.body = `📝 Phản hồi từ người dùng: ${senderName}\n👥 Trong nhóm: ${threadName} (${threadID})\n⏰ Thời gian: ${time}\n\nNội dung:\n${body || "Chỉ có tệp đính kèm"}`;

                api.sendMessage(msg, adminThreadID, (err, info) => {
                    if (err) return console.error("Lỗi khi gửi phản hồi đến admin:", err);
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        type: "admin_reply",
                        userThreadID: threadID 
                    });
                });
                break;
            }
            case "admin_reply": {
                msg.body = `🗣️ Phản hồi từ Admin: ${senderName}\n⏰ Thời gian: ${time}\n\nNội dung:\n${body || "Chỉ có tệp đính kèm"}\n\n» Reply tin nhắn này để tiếp tục trò chuyện.`;
                
                // *** DÒNG ĐÃ SỬA: Bỏ messageID cuối cùng để không reply nữa ***
                api.sendMessage(msg, userThreadID, (err, info) => {
                    if (err) return console.error("Lỗi khi gửi phản hồi đến người dùng:", err);
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        type: "user_reply",
                        adminThreadID: threadID 
                    });
                });
                break;
            }
        }
    } finally {
        for (const filePath of tempAttachmentPaths) {
            fs.unlink(filePath, (err) => {
                if (err) console.error("Lỗi khi xóa file tạm:", err);
            });
        }
    }
};

// --- CHẠY LỆNH CHÍNH ---
module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID, messageReply } = event;
    const content = args.join(" ");

    if (!content && (!messageReply || messageReply.attachments.length === 0)) {
        return api.sendMessage("Vui lòng nhập nội dung thông báo hoặc reply một file đính kèm.", threadID, messageID);
    }
    
    const senderName = await Users.getNameUser(senderID);
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const allThreadIDs = global.data.allThreadID || [];
    let tempAttachmentPaths = [];

    try {
        const bodyMessage = `📬 Thông báo từ Admin ${senderName}\n⏰ Thời gian: ${time}\n\nNội dung:\n${content || "Chỉ có tệp đính kèm"}\n\n» Reply tin nhắn này để gửi phản hồi về cho Admin.`;

        if (messageReply && messageReply.attachments.length > 0) {
            tempAttachmentPaths = await downloadAttachments(messageReply.attachments);
        }

        let sentCount = 0;
        const sendPromises = allThreadIDs.map(id => 
            new Promise(resolve => {
                const messageToSend = {
                    body: bodyMessage,
                    attachment: tempAttachmentPaths.map(filePath => fs.createReadStream(filePath))
                };
                
                api.sendMessage(messageToSend, id, (err, info) => {
                    if (!err) {
                        sentCount++;
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            type: "user_reply",
                            adminThreadID: threadID 
                        });
                    }
                    resolve();
                });
            })
        );
        
        await Promise.all(sendPromises);

        api.sendMessage(`✅ Đã gửi thông báo thành công đến ${sentCount}/${allThreadIDs.length} nhóm.`, threadID, messageID);

    } catch (error) {
        console.error("Lỗi trong lệnh sendnoti:", error);
        api.sendMessage("Đã có lỗi xảy ra khi thực thi lệnh.", threadID, messageID);
    } finally {
        for (const filePath of tempAttachmentPaths) {
            fs.unlink(filePath, (err) => {
                if (err) console.error("Lỗi khi xóa file tạm:", err);
            });
        }
    }
};