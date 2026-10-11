const axios = require('axios');

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/dangky/create'; // << Đảm bảo URL này đúng
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const COST_PER_USE = 5000;

const conanSteps = [
    { key: 'tenGiai', prompt: '📝 Vui lòng nhập Tên giải đấu:' },
    { key: 'lephi_atm', prompt: '💰 Nhập Lệ phí ATM (ví dụ: 20.000):' },
    { key: 'lephi_card', prompt: '💳 Nhập Lệ phí Card (ví dụ: 25.000):' },
    { key: 'time1', prompt: '⏰ Nhập Thời gian bắt đầu (ví dụ: 01/09/2025):' },
    { key: 'time2', prompt: '⏰ Nhập Thời gian kết thúc (ví dụ: 02/09/2025):' },
    { key: 'top1', prompt: '🏆 Nhập Giải thưởng TOP 1 (ví dụ: 500.000):' },
    { key: 'top2', prompt: '🏆 Nhập Giải thưởng TOP 2 (ví dụ: 300.000):' },
    { key: 'top3', prompt: '🏆 Nhập Giải thưởng TOP 3 (ví dụ: 150.000):' },
    { key: 'fmvp', prompt: '🎖️ Nhập Giải thưởng FMVP (ví dụ: 50.000):' }
];

// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "dangky",
    version: "API-1.0",
    hasPermssion: 0,
    credits: "pcoder & Thanh Nghia",
    description: `Tạo ảnh đăng ký giải qua API. Phí: ${COST_PER_USE.toLocaleString('vi-VN')}đ.`,
    commandCategory: "tiện ích",
    usages: "[Để trống để vào menu]",
    cooldowns: 20,
    costPerUse: COST_PER_USE
};

// --- HÀM GỌI API ---
async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    try {
        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key của bạn: ${e.message}`, threadID, messageID);
        }

        api.sendMessage(`⏳ Đang tạo ảnh theo mẫu ${payload.template}...`, threadID, messageID);

        const response = await axios.post(CREATE_URL, payload, {
            headers: { 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });

        const successMsg = `🎉 Ảnh của bạn đã được tạo!\n- Phí: ${COST_PER_USE.toLocaleString('vi-VN')}đ đã được trừ.`;
        
        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);

    } catch (error) {
        const errorBody = error.response?.data?.toString() || '{}';
        let errorMessage = "Có lỗi xảy ra từ phía server.";
        try {
            const parsedError = JSON.parse(errorBody);
            errorMessage = parsedError.message || errorMessage;
        } catch (e) {}
        
        if (error.response?.status === 402) {
            errorMessage = "💰 Số dư không đủ để sử dụng lệnh này.";
        }
        
        console.error("[DANGKY_API] Lỗi:", errorMessage);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${errorMessage}`, threadID, messageID);
    }
}

// --- HÀM RUN ---
module.exports.run = async function({ api, event }) {
    const { threadID, messageID, senderID } = event;
    
    api.sendMessage(
        `🎨 Vui lòng chọn mẫu ảnh bạn muốn tạo:\n\n1. Naruto\n2. Conan\n\n➡️ Phí sử dụng: ${COST_PER_USE.toLocaleString('vi-VN')}đ.\nPhản hồi bằng số (1 hoặc 2).`,
        threadID,
        (err, info) => {
            if (err) return console.error(err);
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                type: "choose_template"
            });
        },
        messageID
    );
};

// --- HÀM HANDLEREPLY ---
module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (senderID !== handleReply.author) return;
    api.unsendMessage(handleReply.messageID).catch(e => {});

    const { data = {} } = handleReply;

    try {
        switch (handleReply.type) {
            case "choose_template": {
                const choice = body.trim();
                let firstPrompt = '';
                let nextStep = { ...handleReply, type: 'collect_data', data: {}, step: 0 };

                if (choice === '1') {
                    nextStep.template = 'naruto';
                    firstPrompt = "📝 Bắt đầu tạo mẫu Naruto.\n\n➡️ Vui lòng nhập Tên Giải Đấu:";
                } else if (choice === '2') {
                    nextStep.template = 'conan';
                    firstPrompt = `📝 Bắt đầu tạo mẫu Conan.\n\n➡️ ${conanSteps[0].prompt}`;
                } else {
                    return api.sendMessage("❌ Lựa chọn không hợp lệ.", threadID, messageID);
                }

                api.sendMessage(firstPrompt, threadID, (err, info) => {
                    if (err) return console.error(err);
                    nextStep.messageID = info.messageID;
                    global.client.handleReply.push(nextStep);
                }, messageID);
                break;
            }

            case "collect_data": {
                const { template, step } = handleReply;

                if (template === 'naruto') {
                    const narutoKeys = ['tournamentName', 'prize1', 'prize2', 'prize3'];
                    const prompts = ['➡️ Tiếp theo, nhập giải Vô Địch:', '➡️ Tiếp theo, nhập giải Á Quân:', '➡️ Cuối cùng, nhập giải Hạng 3:'];
                    
                    data[narutoKeys[step]] = body;
                    
                    if (step < narutoKeys.length - 1) {
                         api.sendMessage(prompts[step], threadID, (err, info) => {
                            if (err) return console.error(err);
                            global.client.handleReply.push({ ...handleReply, messageID: info.messageID, data: data, step: step + 1 });
                        }, messageID);
                    } else {
                        // Đã thu thập đủ, gọi API
                        return callApiAndSend(api, event, { template, ...data });
                    }
                } else if (template === 'conan') {
                    data[conanSteps[step].key] = body;
                    const nextStepIndex = step + 1;

                    if (nextStepIndex < conanSteps.length) {
                        api.sendMessage(conanSteps[nextStepIndex].prompt, threadID, (err, info) => {
                            if (err) return console.error(err);
                            global.client.handleReply.push({ ...handleReply, messageID: info.messageID, data: data, step: nextStepIndex });
                        }, messageID);
                    } else {
                        // Đã thu thập đủ, gọi API
                        return callApiAndSend(api, event, { template, ...data });
                    }
                }
                break;
            }
        }
    } catch (err) {
        console.error("[DANGKY] Lỗi trong handleReply:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi khi xử lý: ${err.message}.`, threadID, messageID);
    }
};