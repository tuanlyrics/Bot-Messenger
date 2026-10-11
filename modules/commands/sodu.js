// File: modules/commands/sodu.js
// được code bởi Gemini & Pcoder

const axios = require('axios');

// ----- THÔNG TIN CẤU HÌNH API -----
// Đảm bảo các thông tin này giống hệt với các file lệnh khác
const API_BASE_URL = 'https://spn.io.vn/Ajaxs/'; 
const BOT_API_KEY = 'Pcoder1234567890987654321';
// -----------------------------------

module.exports = {
    config: {
        name: "sodu",
        version: "1.0",
        author: "Gemini & Pcoder",
        description: "Kiểm tra số dư tài khoản web của bạn.",
        commandCategory: "Tiện ích",
        usages: ".sodu",
        cooldowns: 5
    },

    run: async function({ api, event }) {
        const { threadID, messageID, senderID } = event;

        try {
            // Gọi đến API get_user_balance.php trên web
            const response = await axios.get(`${API_BASE_URL}get_user_balance.php`, {
                params: {
                    api_key: BOT_API_KEY,
                    id_fb: senderID
                }
            });

            // Xử lý kết quả trả về từ API
            if (response.data && response.data.success) {
                const balance = response.data.balance;
                const formattedBalance = balance.toLocaleString('vi-VN');
                
                // Lấy tên người dùng để tin nhắn thân thiện hơn
                let userName = `User ${senderID}`;
                try {
                    const userInfo = await api.getUserInfo(senderID);
                    if (userInfo && userInfo[senderID]) userName = userInfo[senderID].name;
                } catch (e) { /* Bỏ qua lỗi nếu không lấy được tên */ }

                api.sendMessage(`👤 Tài khoản: ${userName}\n💰 Số dư hiện tại của bạn trên web là: ${formattedBalance}đ`, threadID);
            } else {
                // Xử lý lỗi trả về từ API (ví dụ: tài khoản chưa liên kết)
                const errorMessage = response.data.message || "Lỗi không xác định từ API.";
                api.sendMessage(`❌ ${errorMessage}\nBạn đã dùng lệnh ".verify" để liên kết tài khoản Facebook với tài khoản web chưa?`, threadID, messageID);
            }
        } catch (error) {
            // Xử lý các lỗi kết nối mạng hoặc lỗi server 500
            const errorMessage = error.response ? error.response.data.message : "Không thể kết nối đến máy chủ web.";
            console.error("[SODU] Lỗi nghiêm trọng khi lấy số dư:", errorMessage);
            api.sendMessage(`❌ Đã có lỗi xảy ra khi truy vấn số dư: ${errorMessage}`, threadID, messageID);
        }
    }
};