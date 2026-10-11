const axios = require('axios');

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/boxscrim/create'; // << Đảm bảo URL này đúng
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission';
const COST_PER_USE = 5000;

// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "boxscrim",
    version: "API-1.0",
    hasPermssion: 0,
    credits: "Pcoder & Thanh Nghia",
    description: `Tạo ảnh scrim qua API. Phí: ${COST_PER_USE.toLocaleString('vi-VN')}đ.`,
    commandCategory: "tiện ích",
    usages: "[Để trống để bắt đầu]",
    cooldowns: 20,
    costPerUse: COST_PER_USE
};

// --- HÀM KIỂM TRA QUYỀN THUÊ LỆNH ---
async function checkRentalPermission(senderID, threadID, isGroup, api = null) {
    try {
        const target_id = isGroup ? threadID : senderID;
        let adminIDs = [];
        if (isGroup && api) {
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                adminIDs = (threadInfo.adminIDs || []).map(admin => admin.id);
            } catch (error) {
                console.warn('[RENTAL_CHECK] Không thể lấy thông tin QTV:', error.message);
            }
        }
        
        const response = await axios.post(CHECK_PERMISSION_URL, {
            command_name: 'boxscrim', // << Tên lệnh này
            target_id: target_id,
            sender_id: senderID,
            admin_ids: adminIDs
        });
        
        return response.data.success ? response.data.has_permission : false;
    } catch (error) {
        console.warn('[RENTAL_CHECK] Lỗi khi kiểm tra quyền thuê:', error.message);
        return false;
    }
}


// --- HÀM GỌI API CHÍNH ---
async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    const isGroup = event.isGroup || false;

    try {
        const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, api);
        
        if (hasRentalPermission) {
            api.sendMessage("🎯 Miễn phí! Đang xử lý...", threadID, messageID);
        } else {
            api.sendMessage(`💰 Phí: ${COST_PER_USE.toLocaleString()}đ. Đang xử lý...`, threadID, messageID);
        }

        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key của bạn: ${e.message}`, threadID, messageID);
        }
        
        // Tạo tin nhắn tóm tắt đầy đủ thông tin
        let summaryMessage = `🎨 Chuẩn bị tạo ảnh Scrim...\n\n`;
        summaryMessage += `🖌️ Theme: ${payload.theme.charAt(0).toUpperCase() + payload.theme.slice(1)}\n`;
        summaryMessage += `👑 Tiêu đề: ${payload.title}\n`;
        summaryMessage += `🚪 Loại phòng: ${payload.roomType}\n`;
        summaryMessage += `📜 Phụ đề: ${payload.subtitle}\n`;
        summaryMessage += `⏰ Dòng 1: ${payload.line1}\n`;
        summaryMessage += `⏰ Dòng 2: ${payload.line2}\n`;
        summaryMessage += `💳 Banking: ${payload.bankingInfo}\n\n`;
        summaryMessage += `⏳ Vui lòng chờ trong giây lát...`;
        api.sendMessage(summaryMessage, threadID, messageID);

        const finalPayload = {
            ...payload,
            bot_sender_id: senderID,
            bot_thread_id: threadID,
            bot_is_group: isGroup.toString(),
        };

        const response = await axios.post(CREATE_URL, finalPayload, {
            headers: { 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });

        let successMsg = `🎉 Ảnh scrim của bạn đã được tạo thành công!`;
        if (hasRentalPermission) {
            successMsg += `\n🆓 Miễn phí (đã thuê lệnh)`;
        } else {
            successMsg += `\n💰 Đã trừ ${COST_PER_USE.toLocaleString()}đ`;
        }
        
        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);

    } catch (error) {
        const errorBody = error.response?.data?.toString() || '{}';
        let errorMessage = "Có lỗi xảy ra từ phía server.";
        try {
            const parsedError = JSON.parse(errorBody);
            errorMessage = parsedError.message || errorMessage;
        } catch (e) {
            // Không làm gì nếu parse lỗi
        }
        
        if (error.response?.status === 402) {
            errorMessage = "💰 Số dư không đủ để sử dụng lệnh này.";
        }
        
        console.error("[BOXSCRIM_API] Lỗi:", errorMessage);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${errorMessage}`, threadID, messageID);
    }
}

// --- HÀM RUN ---
module.exports.run = async function({ api, event }) {
    const { threadID, messageID, senderID } = event;
    
    const menuMessage = "🎨 Vui lòng chọn theme bạn muốn sử dụng:\n\n1. 𝗜𝘁𝗮𝗰𝗵𝗶\n2. 𝗟𝘂𝗳𝗳𝘆\n\nPhản hồi tin nhắn này bằng số (1 hoặc 2) để chọn.";
    
    return api.sendMessage(menuMessage, threadID, (err, info) => {
        if (err) return console.error(err);
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "chooseTheme"
        });
    }, messageID);
};

// --- HÀM HANDLEREPLY ---
module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (senderID !== handleReply.author) return;

    api.unsendMessage(handleReply.messageID).catch(e => {});

    try {
        switch (handleReply.type) {
            case "chooseTheme": {
                const choice = body.trim();
                let theme;
                if (choice === '1') theme = 'itachi';
                else if (choice === '2') theme = 'luffy';
                else return api.sendMessage("❌ Lựa chọn không hợp lệ.", threadID, messageID);

                handleReply.theme = theme;
                
                const usage = "[Tiêu đề]| [Loại phòng]| [Phụ đề]| [Dòng 1]| [Dòng 2]| [Banking]";
                const example = "BOX CUS LTN | PHÒNG THƯỜNG | 5K - 10K - 15K | 13:00 - 15:00 6K | 20:00 - 22:00 8K | MBBANK 5127032006";
                const promptMessage = `🎨 Bạn đã chọn theme ${theme}. Vui lòng nhập thông tin theo cú pháp (phân tách bằng dấu |):\n\n${usage}\n\nVí dụ:\n${example}`;

                api.sendMessage(promptMessage, threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({ ...handleReply, messageID: info.messageID, type: "processInput" });
                }, messageID);
                break;
            }

            case "processInput": {
                const input = body.split("|").map(item => item.trim());
                if (input.length < 6) {
                    return api.sendMessage("❌ Bạn đã nhập thiếu thông tin. Vui lòng nhập đủ 6 phần.", threadID, messageID);
                }

                const payload = {
                    theme: handleReply.theme,
                    title: input[0] || "BOX CUS SCRIMM",
                    roomType: input[1] || "PHÒNG THƯỜNG",
                    subtitle: input[2] || "5K - 10K - 15K",
                    line1: input[3] || "13:00 - 15:00 6K",
                    line2: input[4] || "20:00 - 22:00 8K",
                    bankingInfo: input[5] || "00000000000 (MB BANK)"
                };
                
                return callApiAndSend(api, event, payload);
            }
        }
    } catch (err) {
        console.error("[BOXSCRIM] Lỗi trong handleReply:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi khi xử lý: ${err.message}.`, threadID, messageID);
    }
};