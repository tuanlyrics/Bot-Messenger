/**
 * @name dangky1
 * @version 3.0.0 (Interactive)
 * @description Tạo ảnh đăng ký giải. Hỗ trợ chế độ điền thông tin tương tác hoặc điền nhanh.
 * @author Gemini (sửa theo yêu cầu)
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- CẤU HÌNH CHUNG ---
const BACKGROUND_URL = 'https://files.catbox.moe/j84j9o.png';
const BACKGROUND_FILENAME = 'background_dangky1.png';

let isAssetsReady = false;

// --- HÀM HELPER ---
function drawTextWithStroke(ctx, text, x, y, strokeColor, textColor, lineWidth) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
}

// --- HÀM VẼ ẢNH CHÍNH ---
async function createImage({
    backgroundPath,
    tenGiai,
    lephi_atm,
    lephi_card,
    time1,
    time2,
    top1,
    top2,
    top3,
    fmvp
}) {
    if (!fs.existsSync(backgroundPath)) {
        throw new Error(`Không tìm thấy ảnh nền tại '${backgroundPath}'.`);
    }
    const background = await loadImage(backgroundPath);
    const canvas = createCanvas(3000, 3000);
    const ctx = canvas.getContext('2d');

    // 1. Vẽ ảnh nền
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // 2. Cài đặt chung
    ctx.textBaseline = 'middle';

    // --- VẼ TÊN CHỦ GIẢI ĐẤU (ĐÃ SỬA ĐỂ NGHIÊNG VÀ THÊM VIỀN KÉP) ---
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 150px Prompt';

    const tenGiai_x = 1830;
    const tenGiai_y = 700;
    const tenGiai_skewX = -0.3; // Độ nghiêng âm để nghiêng sang trái

    // Áp dụng biến đổi làm nghiêng
    ctx.transform(1, 0, tenGiai_skewX, 1, 0, 0);

    const adjustedX = tenGiai_x - tenGiai_skewX * tenGiai_y;
    const textToDraw = tenGiai;

    // Cài đặt chung cho viền chữ
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // 1. Vẽ viền đen bên ngoài (dày nhất)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5; // Tăng độ dày viền đen
    ctx.strokeText(textToDraw, adjustedX, tenGiai_y);

    // 2. Vẽ viền trắng bên trong
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3; // Viền trắng có độ dày bằng một nửa viền đen
    ctx.strokeText(textToDraw, adjustedX, tenGiai_y);

    // 3. Vẽ chữ màu trắng đè lên trên cùng
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToDraw, adjustedX, tenGiai_y);

    ctx.restore();


    // --- VẼ LỆ PHÍ ---
    ctx.textAlign = 'left';
    const lePhi_mauChu = '#FFFFFF';
    const lePhi_mauVien_So = '#000000';
    const lePhi_mauVien_Chu = '#E8FE16';

    ctx.font = 'bold 90px Prompt';
    drawTextWithStroke(ctx, lephi_atm + " VND", 290, 1530, lePhi_mauVien_So, lePhi_mauChu, 6);
    ctx.font = 'bold 55px Prompt';
    drawTextWithStroke(ctx, "ĐỐI VỚI ATM", 380, 1630, lePhi_mauVien_Chu, lePhi_mauChu, 2);

    ctx.font = 'bold 90px Prompt';
    drawTextWithStroke(ctx, lephi_card + " VND", 290, 1750, lePhi_mauVien_So, lePhi_mauChu, 6);
    ctx.font = 'bold 55px Prompt';
    drawTextWithStroke(ctx, "ĐỐI VỚI CARD", 380, 1850, lePhi_mauVien_Chu, lePhi_mauChu, 2);

    // --- VẼ THỜI GIAN ---
    ctx.textAlign = 'center';
    const thoiGian_mauChu = '#FFFFFF';
    const thoiGian_mauVien = '#000000';
    ctx.font = 'bold 110px Prompt';
    drawTextWithStroke(ctx, time1, 560, 2330, thoiGian_mauVien, thoiGian_mauChu, 6);
    drawTextWithStroke(ctx, '-', 560, 2430, thoiGian_mauVien, thoiGian_mauChu, 6);
    drawTextWithStroke(ctx, time2, 560, 2560, thoiGian_mauVien, thoiGian_mauChu, 6);

    // --- VẼ CƠ CẤU GIẢI THƯỞNG (ĐÃ SỬA) ---
    ctx.save(); // Lưu trạng thái context hiện tại
    ctx.textAlign = 'right';
    ctx.font = 'bold 150px Anton';
    ctx.fillStyle = '#000000';

    // Tăng nhẹ độ giãn cách chữ.
    ctx.letterSpacing = '8px';

    const skewX = -0.2;
    ctx.transform(1, 0, skewX, 1, 0, 0);

    const finalX = 2390;

    const prizeY = {
        top1: 1710,
        top2: 1995,
        top3: 2278,
        fmvp: 2550
    };

    // Vẽ text đã được giãn cách bằng letterSpacing
    ctx.fillText(top1, finalX - skewX * prizeY.top1, prizeY.top1);
    ctx.fillText(top2, finalX - skewX * prizeY.top2, prizeY.top2);
    ctx.fillText(top3, finalX - skewX * prizeY.top3, prizeY.top3);
    ctx.fillText(fmvp, finalX - skewX * prizeY.fmvp, prizeY.fmvp);

    ctx.restore(); // Khôi phục lại trạng thái ban đầu

    return canvas.toBuffer('image/png');
}

// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "dangky1",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Gemini (sửa theo yêu cầu)",
    description: "Tạo ảnh đăng ký giải. Gõ lệnh không kèm gì để vào chế độ tương tác.",
    commandCategory: "tạo ảnh",
    usages: "[Tên giải]| [Lệ phí ATM]| [Lệ phí Card]| [TG 1]| [TG 2]| [TOP 1]| [TOP 2]| [TOP 3]| [FMVP]\n-> Hoặc gõ '/dangky1' để bắt đầu.",
    cooldowns: 20
};

// --- HÀM TẢI TÀI NGUYÊN ---
module.exports.onLoad = async function() {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const assets = [
        { url: "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf", path: "Prompt-Bold.ttf", family: "Prompt" },
        { url: "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf", path: "Anton-Regular.ttf", family: "Anton"},
        { url: BACKGROUND_URL, path: BACKGROUND_FILENAME }
    ];

    console.log("Bắt đầu tải tài nguyên cho lệnh dangky1...");
    for (const asset of assets) {
        const assetPath = path.join(cacheDir, asset.path);
        if (!fs.existsSync(assetPath)) {
            try {
                const { data } = await axios.get(asset.url, { responseType: 'arraybuffer' });
                fs.writeFileSync(assetPath, data);
                console.log(`Tải thành công: ${asset.path}`);
            } catch (e) { console.error(`Lỗi khi tải ${asset.path}: ${e.message}`); }
        }
        if (asset.family) {
            try { registerFont(assetPath, { family: asset.family }); }
            catch (e) { console.error(`Lỗi đăng ký font: ${asset.family}.`, e); }
        }
    }
    console.log("Tài nguyên dangky1 đã sẵn sàng.");
    isAssetsReady = true;
};

// --- HÀM XỬ LÝ PHẢN HỒI ---
module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;

    // Chỉ người dùng khởi tạo lệnh mới có thể trả lời
    if (senderID !== handleReply.author) {
        return api.sendMessage("⚠️ Vui lòng không trả lời vào cuộc hội thoại của người khác.", threadID, messageID);
    }
    
    // Hủy bỏ nếu người dùng muốn
    if (body.toLowerCase() === "huy") {
        return api.sendMessage("✅ Đã hủy tạo ảnh.", threadID, messageID);
    }

    const currentData = handleReply.data;
    const currentStep = handleReply.step;
    
    // Lưu câu trả lời
    currentData[steps[currentStep].key] = body;

    // Kiểm tra xem còn câu hỏi nào không
    const nextStep = currentStep + 1;
    if (nextStep < steps.length) {
        // Hỏi câu tiếp theo
        api.sendMessage(steps[nextStep].prompt, threadID, (err, info) => {
            if (err) return console.error(err);
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                step: nextStep,
                data: currentData
            });
        }, messageID);
    } else {
        // Đã đủ thông tin, tiến hành tạo ảnh
        try {
            api.sendMessage("✅ Đã thu thập đủ thông tin, đang tạo ảnh...", threadID, messageID);
            
            const backgroundCachePath = path.join(__dirname, 'cache', BACKGROUND_FILENAME);

            const imageBuffer = await createImage({
                backgroundPath: backgroundCachePath,
                ...currentData // Sử dụng dữ liệu đã thu thập
            });

            const imagePath = path.join(__dirname, 'cache', `dangky_temp_${Date.now()}.png`);
            fs.writeFileSync(imagePath, imageBuffer);

            return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath));

        } catch (err) {
            console.error("Lỗi chi tiết trong dangky1 (handleReply):", err);
            return api.sendMessage(`❌ Đã xảy ra lỗi khi tạo ảnh: ${err.message}.`, threadID);
        }
    }
};

// --- HÀM CHÍNH KHI GỌI LỆNH ---
const steps = [
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

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!isAssetsReady) {
        return api.sendMessage("⏳ Tài nguyên cho lệnh này đang được tải về, vui lòng thử lại sau giây lát...", threadID, messageID);
    }
    
    // --- CHẾ ĐỘ NHẬP NHANH (CÁCH CŨ) ---
    if (args.length > 0) {
        try {
            api.sendMessage(`⏳ Đang khởi tạo hình ảnh đăng ký...`, threadID, messageID);

            const input = args.join(" ").split("|").map(item => item.trim());
            
            const data = {
                tenGiai:    input[0] || "TÊN GIẢI ĐẤU",
                lephi_atm:  input[1] || "20.000",
                lephi_card: input[2] || "20.000",
                time1:      input[3] || "01/09/2025",
                time2:      input[4] || "01/09/2025",
                top1:       input[5] || "250.000",
                top2:       input[6] || "250.000",
                top3:       input[7] || "250.000",
                fmvp:       input[8] || "250.000"
            };
           
            const backgroundCachePath = path.join(__dirname, 'cache', BACKGROUND_FILENAME);
            const imageBuffer = await createImage({ backgroundPath: backgroundCachePath, ...data });

            const imagePath = path.join(__dirname, 'cache', `dangky_temp_${Date.now()}.png`);
            fs.writeFileSync(imagePath, imageBuffer);

            return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);

        } catch (err) {
            console.error("Lỗi chi tiết trong dangky1 (run):", err);
            return api.sendMessage(`❌ Đã xảy ra lỗi khi tạo ảnh: ${err.message}.`, threadID, messageID);
        }
    } 
    // --- CHẾ ĐỘ TƯƠNG TÁC (HỎI & ĐÁP) ---
    else {
        api.sendMessage(`▶️ Bắt đầu quá trình tạo ảnh đăng ký.\n📝 Vui lòng trả lời lần lượt các câu hỏi sau.\n(Gõ "huy" để hủy bỏ bất cứ lúc nào)`, threadID, (err, info) => {
            if (err) return console.error(err);
            // Bắt đầu với câu hỏi đầu tiên
            api.sendMessage(steps[0].prompt, threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    step: 0,
                    data: {}
                });
            });
        }, messageID);
    }
};
