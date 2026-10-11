// được code bởi Gemini & Pcoder - Phiên bản gọn nhẹ + auto tạo user mới
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BANK_CONFIG = {
    BANK_ID: "970422",
    ACCOUNT_NO: "08043662312904",
    ACCOUNT_NAME: "NGUYEN TRUONG THIEN PHAT"
};
const API_BASE_URL = 'https://spn.io.vn/Ajaxs/'; 
const BOT_API_KEY = 'Pcoder1234567890987654321';

const paymentFolder = path.join(__dirname, 'payment');
if (!fs.existsSync(paymentFolder)) fs.mkdirSync(paymentFolder, { recursive: true });

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ----- AUTO TẠO USER -----
async function ensureUserExists(senderID, userName) {
    try {
        const res = await axios.post(`${API_BASE_URL}create_user.php`,
            `api_key=${BOT_API_KEY}&id_fb=${senderID}&name=${encodeURIComponent(userName)}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return res.data?.success;
    } catch (e) {
        console.error("[BANKING] Lỗi tạo tài khoản:", e.message);
        return false;
    }
}

// ----- UPDATE BALANCE -----
async function updateBalance(senderID, amount, userName = "Unknown") {
    try {
        const response = await axios.post(`${API_BASE_URL}update_user_balance.php`, 
            `api_key=${BOT_API_KEY}&id_fb=${senderID}&amount_change=${amount}`, 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data?.error === "USER_NOT_FOUND") {
            console.log(`[BANKING] User ${senderID} chưa có tài khoản → tạo mới`);
            const created = await ensureUserExists(senderID, userName);
            if (created) {
                return await updateBalance(senderID, amount, userName); // thử cộng lại
            }
        }

        return response.data?.success ? response.data.new_balance : null;
    } catch (error) {
        console.error(`[BALANCE_API] Lỗi update balance:`, error.message);
        return null;
    }
}

module.exports = {
    config: {
        name: "nap",
        version: "9.1-SimpleAutoUser",
        author: "Pcoder",
        description: "Tạo QR để nạp tiền trực tiếp vào tài khoản web (tự tạo user nếu chưa có).",
        commandCategory: "Tiện ích",
        usages: ".nap [số tiền]",
        cooldowns: 0
    },

    run: async function({ api, event, args }) {
        const { threadID, messageID, senderID } = event;

        let userName = `User ${senderID}`;
        try {
            const info = await api.getUserInfo(senderID);
            if (info?.[senderID]) userName = info[senderID].name;
        } catch {}

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 2000) {
            return api.sendMessage("❌ Vui lòng nhập số tiền hợp lệ (tối thiểu 2,000đ).", threadID, messageID);
        }

        const transactionId = `pcoder${generateRandomString(6)}`;
        const content = `nap ${transactionId}`;
        const expirationMinutes = 5;

        api.sendMessage(`⏳ Đang tạo mã QR cho giao dịch #${transactionId}...`, threadID, messageID);

        try {
            await axios.post(`${API_BASE_URL}create_qr_payment.php?api_key=${BOT_API_KEY}`, {
                transaction_id: transactionId,
                sender_id: senderID,
                amount
            });
            
            const qrResponse = await axios.post('https://api.vietqr.io/v2/generate', {
                acqId: BANK_CONFIG.BANK_ID,
                accountNo: BANK_CONFIG.ACCOUNT_NO,
                accountName: BANK_CONFIG.ACCOUNT_NAME,
                amount,
                addInfo: content,
                template: "qymODyJ"
            });
            
            const qrDataURL = qrResponse.data.data.qrDataURL;
            const imageBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
            const imagePath = path.join(paymentFolder, `${transactionId}.png`);
            fs.writeFileSync(imagePath, imageBuffer);

            const qrMessage = 
`✅ Giao dịch #${transactionId} đã tạo thành công!
🏦 Ngân hàng: ${BANK_CONFIG.ACCOUNT_NAME}
💳 STK: ${BANK_CONFIG.ACCOUNT_NO}
💵 Số tiền: ${amount.toLocaleString('vi-VN')}đ
📝 Nội dung: ${content}

⚠️ Quét QR và chuyển khoản đúng nội dung.
⏰ Mã hết hạn sau ${expirationMinutes} phút.`;

            api.sendMessage({
                body: qrMessage,
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => fs.unlinkSync(imagePath));

            // Lắng nghe kết quả từ server
            const checkInterval = setInterval(async () => {
                try {
                    const status = await axios.get(`${API_BASE_URL}check_payment_status.php?transaction_id=${transactionId}&api_key=${BOT_API_KEY}`);
                    if (status.data?.status === 'completed') {
                        clearInterval(checkInterval);
                        api.sendMessage(`✅ Giao dịch #${transactionId} đã ghi nhận. Đang cập nhật số dư...`, threadID);

                        const newBalance = await updateBalance(senderID, amount, userName);
                        if (newBalance !== null) {
                            api.sendMessage({
                                body: `🎉 @${userName}, bạn đã nạp thành công ${amount.toLocaleString('vi-VN')}đ.\n💰 Số dư mới: ${newBalance.toLocaleString('vi-VN')}đ`,
                                mentions: [{ tag: `@${userName}`, id: senderID }]
                            }, threadID);
                        } else {
                            api.sendMessage(`⚠️ @${userName}, giao dịch thành công nhưng lỗi khi cập nhật số dư. Vui lòng liên hệ Admin.`, 
                                { mentions: [{ tag: `@${userName}`, id: senderID }] }, threadID);
                        }
                    }
                } catch (e) {
                    console.error(`[BANKING] Lỗi check status #${transactionId}:`, e.message);
                }
            }, 5000);

            setTimeout(() => clearInterval(checkInterval), expirationMinutes * 60 * 1000 + 5000);

        } catch (error) {
            console.error("[BANKING] Lỗi tạo QR:", error.message);
            api.sendMessage("❌ Lỗi server khi tạo QR. Vui lòng thử lại sau.", threadID, messageID);
        }
    }
};
