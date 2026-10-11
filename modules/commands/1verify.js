// File: modules/commands/verify.js
// Version: 4.0-Final (Tự động gộp, xử lý luồng sai và thông báo rõ ràng)
// Được code bởi Gemini & Pcoder

const fs = require('fs');
const path = require('path');
const db = require('./1connect.js'); 

const BALANCE_FILE = path.join(__dirname, '../../payment/bank_nicknames.json');

// --- CÁC HÀM HELPER (Không thay đổi) ---

function readBankBalance() {
    try {
        if (fs.existsSync(BALANCE_FILE)) {
            const data = fs.readFileSync(BALANCE_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error("[VERIFY] Lỗi khi đọc file balance:", error);
        return {};
    }
}

function writeBankBalance(balanceData) {
    try {
        const paymentDir = path.dirname(BALANCE_FILE);
        if (!fs.existsSync(paymentDir)) {
            fs.mkdirSync(paymentDir, { recursive: true });
        }
        fs.writeFileSync(BALANCE_FILE, JSON.stringify(balanceData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("[VERIFY] Lỗi khi ghi file balance:", error);
        return false;
    }
}

async function getWebBalance(connection, idWeb) {
    try {
        const [rows] = await connection.execute('SELECT tien FROM `Users` WHERE id = ?', [idWeb]);
        if (rows.length > 0) {
            return parseInt(rows[0].tien) || 0;
        }
        return 0;
    } catch (error) {
        console.error("[VERIFY] Lỗi khi lấy số tiền từ web:", error);
        return 0;
    }
}

async function syncBalance(connection, idWeb, idFb) {
    try {
        const webBalance = await getWebBalance(connection, idWeb);
        const currentBalance = readBankBalance();
        currentBalance[idFb.toString()] = webBalance;
        const success = writeBankBalance(currentBalance);
        
        if (success) {
            console.log(`[VERIFY] Đã đồng bộ balance cho user ${idFb}: ${webBalance} VND`);
            return { success: true, balance: webBalance };
        } else {
            return { success: false, error: "Không thể ghi file balance" };
        }
    } catch (error) {
        console.error("[VERIFY] Lỗi khi đồng bộ balance:", error);
        return { success: false, error: error.message };
    }
}

// --- MODULE CHÍNH ---

module.exports = {
    config: {
        name: "verify",
        version: "4.0-Final",
        author: "Gemini & Pcoder",
        description: "Xác thực OTP, tự động gộp tài khoản tạm và đồng bộ số dư.",
        commandCategory: "Tiện ích",
        usages: ".verify [mã OTP 9 số]",
        cooldowns: 10
    },

    run: async function({ api, event, args }) {
        const { threadID, messageID, senderID } = event;
        const otpCode = args[0];

        if (!otpCode || !/^\d{9}$/.test(otpCode)) {
            return api.sendMessage("❌ Cú pháp không hợp lệ. Vui lòng nhập đúng 9 chữ số của mã OTP.\nVí dụ: .verify 123456789", threadID, messageID);
        }

        api.sendMessage("⏳ Đang xác thực OTP và xử lý, vui lòng chờ...", threadID, messageID);
        
        let connection;
        let wasMerged = false;

        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            const [otpRows] = await connection.execute(
                'SELECT * FROM `linking_otp` WHERE `otp_code` = ? AND `status` = 0 AND `created_at` > NOW() - INTERVAL 5 MINUTE FOR UPDATE', 
                [otpCode]
            );

            if (otpRows.length === 0) {
                await connection.rollback();
                return api.sendMessage("❌ Mã OTP không hợp lệ, đã được sử dụng hoặc đã hết hạn (chỉ có hiệu lực 5 phút).", threadID, messageID);
            }

            const otpData = otpRows[0];
            const id_web_to_link = otpData.id_web; // ID tài khoản chính
            const id_fb_declared_on_web = otpData.id_fb;

            if (id_fb_declared_on_web.toString() !== senderID.toString()) {
                await connection.rollback();
                return api.sendMessage(`❌ Xác thực thất bại. Bạn đang dùng tài khoản Messenger này để xác nhận cho một tài khoản Facebook khác đã khai báo trên web.`, threadID, messageID);
            }
            
            // --- LOGIC GỘP TÀI KHOẢN VÀ XỬ LÝ LUỒNG SAI ---
            const [linkRows] = await connection.execute('SELECT id_web FROM `users_link` WHERE id_fb = ?', [senderID]);

            if (linkRows.length > 0) {
                const id_web_tam = linkRows[0].id_web;

                if (id_web_tam.toString() !== id_web_to_link.toString()) {
                    // **Kịch bản đúng**: Gộp tài khoản tạm vào tài khoản chính.
                    wasMerged = true;
                    console.log(`[VERIFY] Phát hiện tài khoản tạm (ID: ${id_web_tam}), tiến hành gộp vào tài khoản chính (ID: ${id_web_to_link})`);

                    const [userTempRows] = await connection.execute('SELECT tien FROM `Users` WHERE id = ?', [id_web_tam]);
                    const tien_can_chuyen = (userTempRows.length > 0) ? parseInt(userTempRows[0].tien) : 0;

                    if (tien_can_chuyen > 0) {
                        await connection.execute('UPDATE `Users` SET `tien` = `tien` + ? WHERE `id` = ?', [tien_can_chuyen, id_web_to_link]);
                        console.log(`[VERIFY] Đã chuyển ${tien_can_chuyen.toLocaleString()} VND từ tk tạm sang tk chính.`);
                    }
                    
                    await connection.execute('DELETE FROM `Users` WHERE id = ?', [id_web_tam]);
                    console.log(`[VERIFY] Đã xóa tài khoản tạm (ID: ${id_web_tam}).`);

                } else {
                    // **Kịch bản sai**: Người dùng lấy OTP từ chính tài khoản tạm.
                    // Không cần làm gì cả, chỉ log lại để biết.
                    console.log(`[VERIFY] Người dùng xác nhận lại liên kết đã tồn tại. ID: ${id_web_tam}. Không cần gộp.`);
                }
            }
            
            // --- CẬP NHẬT LIÊN KẾT VÀ OTP ---
            await connection.execute(
                'INSERT INTO `users_link` (id_web, id_fb) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_web = VALUES(id_web)', 
                [id_web_to_link, senderID]
            );
            await connection.execute('UPDATE `linking_otp` SET `status` = 1 WHERE `id` = ?', [otpData.id]);

            const syncResult = await syncBalance(connection, id_web_to_link, senderID);

            await connection.commit();
            
            // --- GỬI THÔNG BÁO CUỐI CÙNG ---
            let successMessage = `✅ Chúc mừng! Thao tác liên kết thành công.\n`;
            if (wasMerged) {
                successMessage += `Số dư từ tài khoản bot đã được cộng dồn vào tài khoản web của bạn.\n`;
            }
            successMessage += `💰 Số dư hiện tại: ${syncResult.balance.toLocaleString()} VND`;
            api.sendMessage(successMessage, threadID, messageID);

        } catch (error) {
            if (connection) await connection.rollback();
            console.error("[VERIFY] Lỗi nghiêm trọng khi liên kết tài khoản:", error);
            api.sendMessage("❌ Đã có lỗi xảy ra từ phía máy chủ khi xử lý. Vui lòng thử lại sau.", threadID, messageID);
        } finally {
            if (connection) connection.release();
        }
    }
};