const axios = require('axios');
const Fuse = require('fuse.js');

// ----- CẤU HÌNH API -----
const CREATE_URL = 'https://api.spn.io.vn/api/qr/create';
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const COST_PER_USE = 5000;

// ----- CẤU HÌNH LAYOUTS -----
const LAYOUTS = {
    'luffy': '🏴‍☠️ Luffy Gear 5',
    'demon': '⚔️ Demon Slayer',
    'vietnam': '🇻🇳 Việt Nam',
    'goku': '🟠 Goku',
    'kapella': '🎤 Kapella',
    'ice': '❄️ Băng pha lê',
    'candy': '🍭 Fantasy Hồng',
    'purple': '💜 Fantasy Purple',
    'xanh': '💙 Fantasy Xanh'
};

// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "qr",
    version: "API-3.1 (UI Enhanced)",
    hasPermssion: 0,
    credits: "Pcoder",
    description: `Tạo ảnh QR thanh toán qua API. Phí: ${COST_PER_USE.toLocaleString('vi-VN')}đ.`,
    commandCategory: "Tạo ảnh",
    usages: "[layout] [ngân hàng] [STK] [tên]",
    cooldowns: 0,
    dependencies: { "axios": "", "fuse.js": "" },
    costPerUse: COST_PER_USE
};

// --- HỖ TRỢ ---
function findLayout(layoutInput) {
    const normalizedInput = layoutInput.toLowerCase();
    if (LAYOUTS[normalizedInput]) return normalizedInput;
    const specialCases = { 'vn': 'vietnam', 'việtnam': 'vietnam' };
    return specialCases[normalizedInput] || null;
}

async function getBankInfo(bankInput) {
    try {
        const res = await axios.get('https://api.vietqr.io/v2/banks');
        const fuse = new Fuse(res.data.data, { keys: ['name', 'shortName'], threshold: 0.3 });
        const result = fuse.search(bankInput.trim());
        return result[0]?.item || null;
    } catch { return null; }
}

async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    try {
        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key: ${e.message}`, threadID, messageID);
        }

        api.sendMessage(`⏳ Đang tạo ảnh theo layout ${LAYOUTS[payload.layoutName]}...`, threadID, messageID);

        const response = await axios.post(CREATE_URL, payload, {
            headers: { 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });

        const successMsg = `🎉 Ảnh QR của bạn đã được tạo!\n💰 Phí: ${COST_PER_USE.toLocaleString('vi-VN')}đ.`;
        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID);

    } catch (error) {
        let errorMessage = error.response?.data?.message || "Có lỗi xảy ra từ phía server.";
        if (error.response?.status === 402) errorMessage = "💰 Số dư không đủ để sử dụng lệnh này.";
        console.error("[QR_API] Lỗi:", errorMessage);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${errorMessage}`, threadID, messageID);
    }
}

// --- RUN ---
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;

    // Nếu thiếu tham số → show layout gọn đẹp
    if (args.length < 4) {
        let layoutList = "📑 **Danh sách Layouts hiện có**:\n\n";
        for (const [key, value] of Object.entries(LAYOUTS)) {
            layoutList += `👉 ${key} → ${value}\n`;
        }
        layoutList += `\n⚡ Cú pháp:\n${global.config.PREFIX}qr [layout] [ngân hàng] [STK] [tên]\n\n💰 Phí mỗi lần: ${COST_PER_USE.toLocaleString('vi-VN')}đ.`;
        return api.sendMessage(layoutList, threadID, messageID);
    }

    // Tách tham số
    const layoutInput = args[0];
    const bankInput = args[1];
    const accountNo = args[2];
    const accountName = args.slice(3).join(' ');

    const foundLayout = findLayout(layoutInput);
    if (!foundLayout) {
        let layoutList = "❌ Layout không tồn tại.\n\n📑 Layouts:\n";
        for (const [key, value] of Object.entries(LAYOUTS)) {
            layoutList += `👉 ${key} → ${value}\n`;
        }
        return api.sendMessage(layoutList, threadID, messageID);
    }

    const bankInfo = await getBankInfo(bankInput);
    if (!bankInfo) {
        return api.sendMessage(`❌ Không tìm thấy ngân hàng nào khớp với "${bankInput}".`, threadID, messageID);
    }
    
    const payload = {
        layoutName: foundLayout,
        bankName: bankInfo.shortName,
        accountNo,
        accountName
    };

    return callApiAndSend(api, event, payload);
};

module.exports.onLoad = () => {};
module.exports.handleReply = () => {};
