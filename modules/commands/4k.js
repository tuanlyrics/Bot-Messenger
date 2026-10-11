const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const Replicate = require('replicate'); // Sử dụng thư viện chính thức

module.exports.config = {
    name: "4k",
    version: "5.1.0", // Phiên bản sử dụng Replicate library
    hasPermssion: 0,
    prefix: false,
    credits: "Satoru (API by Replicate)",
    description: "Làm nét ảnh bằng AI sử dụng thư viện Replicate chính thức, ổn định.",
    commandCategory: "Tiện ích",
    cooldowns: 45, // Replicate có thể xử lý hơi lâu, tăng cooldown
    usePrefix: true
};

module.exports.run = async function ({ api, event }) {
    try {
        // --- Đọc API Key ---
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
            return api.sendMessage("Không tìm thấy file config.json!", event.threadID, event.messageID);
        }
        const config = JSON.parse(fs.readFileSync(configPath));
        const apiKey = config.REPLICATE_API_KEY;

        if (!apiKey || !apiKey.startsWith('r8_')) {
            return api.sendMessage("API Key cho Replicate chưa được cấu hình hoặc không hợp lệ. Vui lòng kiểm tra file config.json.", event.threadID, event.messageID);
        }

        // --- Tìm ảnh ---
        let imageAttachment;
        if (event.type === "message_reply" && event.messageReply.attachments.length > 0) {
            imageAttachment = event.messageReply.attachments.find(attachment => attachment.type === "photo");
        }

        if (!imageAttachment) {
            return api.sendMessage("Bạn phải trả lời một ảnh để làm nét.", event.threadID, event.messageID);
        }
        
        const processingMessage = await api.sendMessage("⏳ Yêu cầu của bạn đã được gửi đến AI. Quá trình này có thể mất từ 1-2 phút, vui lòng chờ...", event.threadID, event.messageID);

        // --- Khởi tạo và chạy Replicate ---
        const replicate = new Replicate({
            auth: apiKey,
        });

        const model = "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05f45b693F04685450a441737009";
        const input = {
            image: imageAttachment.url,
            scale: 4,
            face_enhance: true,
        };
        
        // Thư viện sẽ tự động tạo yêu cầu và chờ kết quả
        const output = await replicate.run(model, { input });
        
        const resultUrl = output[0];

        // --- Tải ảnh kết quả và gửi đi ---
        const enhancedImageBuffer = (await axios.get(resultUrl, { responseType: 'arraybuffer' })).data;
        
        const imagePath = path.join(__dirname, 'cache', `enhanced_${event.senderID}_${Date.now()}.png`);
        fs.writeFileSync(imagePath, enhancedImageBuffer);

        await api.sendMessage({
            body: `✅ Ảnh của bạn đã được xử lý thành công!`,
            attachment: fs.createReadStream(imagePath)
        }, event.threadID, () => {
            fs.unlinkSync(imagePath);
        });

        // Xóa tin nhắn "Đang xử lý"
        api.unsendMessage(processingMessage.messageID);

    } catch (error) {
        console.error("Lỗi trong lệnh 4k:", error);
        let errorMessage = "Rất tiếc, đã có lỗi xảy ra.";
        if (error.response && error.response.data && error.response.data.detail) {
            errorMessage = `Lỗi từ API Replicate: ${error.response.data.detail}`;
        } else {
            errorMessage = `Lỗi: ${error.message}`;
        }
        api.sendMessage(`❌ ${errorMessage}`, event.threadID, event.messageID);
    }
};