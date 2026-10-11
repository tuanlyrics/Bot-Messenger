// File: modules/commands/thue.js (Phiên bản tối ưu)
const axios = require('axios');

// ----- CẤU HÌNH -----
const ACTIVATE_URL = 'https://api.spn.io.vn/api/keys/activate';
const CHECK_KEY_URL = 'https://api.spn.io.vn/api/keys/check-key-status'; // Endpoint mới cần thêm

module.exports.config = {
    name: "thue",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Gemini & Pcoder",
    description: "Kích hoạt API Key thuê lệnh nhận được từ web.",
    commandCategory: "tiện ích",
    usages: ".thue [API Key]",
    cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const rentalKey = args[0];

    if (!rentalKey || !rentalKey.startsWith('SPN_RENT_')) {
        return api.sendMessage(
            "❌ Vui lòng nhập đúng định dạng API Key thuê lệnh bạn nhận được từ web.\n" +
            "📌 Ví dụ: .thue SPN_RENT_xxxxxxxx\n\n" +
            "💡 Lưu ý: Bạn có thể gán key cho nhóm/cá nhân trực tiếp trên web để không cần chọn lại ở đây!",
            threadID, messageID
        );
    }

    api.sendMessage("⏳ Đang kiểm tra thông tin key...", threadID, messageID);

    try {
        // Bước 1: Kiểm tra key đã được gán chưa
        const keyInfo = await checkKeyStatus(rentalKey);
        
        if (keyInfo.isAssigned) {
            // Key đã được gán trên web, kích hoạt trực tiếp
            return activateKey(api, event, rentalKey, keyInfo.type, keyInfo.target_id, true);
        } else {
            // Key chưa được gán, cần hỏi người dùng
            if (event.isGroup) {
                return api.sendMessage(
                    "🔑 Key này chưa được gán cho nhóm/cá nhân cụ thể.\n" +
                    "Bạn muốn kích hoạt key này cho:\n\n" +
                    "1️⃣ Cho cả nhóm này\n" +
                    "2️⃣ Chỉ cho cá nhân bạn\n\n" +
                    "💡 Mẹo: Lần sau bạn có thể gán key trực tiếp trên web để không cần chọn lại!\n" +
                    "👉 Vui lòng phản hồi tin nhắn này bằng số (1 hoặc 2)",
                    threadID, (err, info) => {
                        if (err) return console.error(err);
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            rentalKey: rentalKey,
                            type: 'choose_activation_type'
                        });
                    }, messageID
                );
            } else {
                // Chat riêng, tự động kích hoạt cho cá nhân
                return activateKey(api, event, rentalKey, 'individual', senderID, false);
            }
        }
    } catch (error) {
        console.error("Error checking key status:", error);
        api.sendMessage(
            "❌ Không thể kiểm tra thông tin key. Vui lòng thử lại sau.\n" +
            `📝 Chi tiết lỗi: ${error.message}`,
            threadID, messageID
        );
    }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;
    const { threadID, messageID, senderID } = event;
    
    // Xóa tin nhắn hỏi để gọn gàng
    api.unsendMessage(handleReply.messageID).catch(() => {});
    
    if (handleReply.type === 'choose_activation_type') {
        const choice = parseInt(event.body);
        const { rentalKey } = handleReply;
        
        let type, targetId;
        
        if (choice === 1) {
            type = 'group';
            targetId = threadID;
        } else if (choice === 2) {
            type = 'individual';
            targetId = senderID;
        } else {
            return api.sendMessage(
                "❌ Lựa chọn không hợp lệ!\n" +
                "👉 Vui lòng nhập lại lệnh: .thue [key] và chọn 1 hoặc 2",
                threadID, messageID
            );
        }
        
        activateKey(api, event, rentalKey, type, targetId, false);
    }
};

// Hàm kiểm tra trạng thái key (cần thêm endpoint này vào server)
async function checkKeyStatus(rentalKey) {
    try {
        const response = await axios.post(CHECK_KEY_URL, {
            rental_key: rentalKey
        });
        
        if (response.data.success) {
            return {
                isAssigned: !!response.data.key_info.target_id,
                type: response.data.key_info.type,
                target_id: response.data.key_info.target_id
            };
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        // Nếu endpoint chưa có, fallback về cách cũ
        return { isAssigned: false };
    }
}

async function activateKey(api, event, rentalKey, type, targetId, wasPreAssigned = false) {
    const { threadID, messageID } = event;
    
    const processingMsg = wasPreAssigned 
        ? "⚡ Key đã được gán trước, đang kích hoạt..."
        : "⏳ Đang gửi yêu cầu kích hoạt...";
    
    api.sendMessage(processingMsg, threadID, messageID);

    try {
        const response = await axios.post(ACTIVATE_URL, {
            rental_key: rentalKey,
            type: type,
            target_id: targetId
        });

        if (response.data.success) {
            const successMsg = wasPreAssigned
                ? `✅ ${response.data.message}\n🎯 Key đã được kích hoạt tự động (đã gán trên web)`
                : `✅ ${response.data.message}\n💡 Lần sau bạn có thể gán key trực tiếp trên web!`;
            
            api.sendMessage(successMsg, threadID, messageID);
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        const errorMessage = error.response ? error.response.data.message : error.message;
        
        let fullErrorMsg = `❌ Kích hoạt thất bại: ${errorMessage}`;
        
        // Thêm gợi ý dựa trên loại lỗi
        if (errorMessage.includes('đã được người khác kích hoạt')) {
            fullErrorMsg += "\n💡 Key này có thể đã được sử dụng. Kiểm tra lại trên web.";
        } else if (errorMessage.includes('hết hạn')) {
            fullErrorMsg += "\n💡 Vui lòng thuê key mới trên web.";
        }
        
        api.sendMessage(fullErrorMsg, threadID, messageID);
    }
}