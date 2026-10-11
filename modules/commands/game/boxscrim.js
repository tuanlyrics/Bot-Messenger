/**
 * @name boxscrimm
 * @version 2.1
 * @description Tạo ảnh thông báo phòng scrimm với viền chữ tùy chỉnh.
 * @author Gemini (sửa đổi từ code gốc)
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- CẤU HÌNH ---
const BACKGROUND_URL = 'https://files.catbox.moe/3da80z.png';
const BACKGROUND_FILENAME = 'background_luffy.png';

let isAssetsReady = false;

// --- HÀM HELPER ---
/**
 * Vẽ chữ có cả viền (stroke) và màu nền (fill)
 */
function drawTextWithStroke(ctx, text, x, y, strokeColor, textColor, lineWidth) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y); // Vẽ viền chữ
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);   // Vẽ màu nền chữ
}

// --- HÀM VẼ ẢNH CHÍNH ---
async function createScrimmImage({ cachePath, title, subtitle, line1, line2, bankingInfo }) {
    if (!fs.existsSync(cachePath)) {
        throw new Error(`Không tìm thấy ảnh nền tại '${cachePath}'.`);
    }
    const background = await loadImage(cachePath);
    const canvas = createCanvas(4800, 2700);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // ==================================================================
    // --- VẼ CHỮ VỚI VIỀN ---
    // ==================================================================

    // --- HIỆU ỨNG VÀ VẼ TIÊU ĐỀ CHÍNH "BOX CUS SCRIMM" ---
    const titleY = 250;
    ctx.font = 'bold 280px Prompt';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;
    drawTextWithStroke(ctx, title, 3350, titleY, '#120101', '#FFFFFF', 15);
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // --- HIỆU ỨNG VÀ VẼ PHỤ ĐỀ "5K - 10K - 15K" ---
    const subtitleY = 560;
    const subtitleX = 3360;
    ctx.font = 'bold 150px Prompt';
    // Tạo màu gradient cho chữ
    const subtitleGradient = ctx.createLinearGradient(0, subtitleY - 75, 0, subtitleY + 75);
    subtitleGradient.addColorStop(0, '#EAEAEA');
    subtitleGradient.addColorStop(0.5, '#FFFFFF');
    subtitleGradient.addColorStop(1, '#DCDCDC');
    // Vẽ chữ với viền
    drawTextWithStroke(ctx, subtitle, subtitleX, subtitleY, '#000000', subtitleGradient, 8);

    // --- Header "PHÒNG THƯỜNG" ---
    ctx.font = 'bold 150px Prompt';
    drawTextWithStroke(ctx, "PHÒNG THƯỜNG", 3290, 880, '#FFFFFF', '#FFFFFF', 8);

    // --- Dòng thông tin 1 (Giờ) ---
    ctx.font = 'bold 130px Prompt';
    // Viền màu xanh lá
    drawTextWithStroke(ctx, line1, 3270, 1100, '#4CAF50', '#FFFFFF', 8);

    // --- Dòng thông tin 2 (Giờ) ---
    ctx.font = 'bold 130px Prompt';
    // Viền màu vàng
    drawTextWithStroke(ctx, line2, 3270, 1270, '#FFC107', '#FFFFFF', 8);

    // --- PHẦN BANKING ---
    ctx.font = 'bold 95px Prompt';
    ctx.textAlign = 'left';
    // Viền màu xám
    drawTextWithStroke(ctx, bankingInfo, 360, 2350, '#9E9E9E', '#FFFFFF', 6);

    return canvas.toBuffer('image/png');
}


// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "boxscrimm",
    version: "2.1", // Tăng phiên bản
    hasPermssion: 0,
    credits: "Gemini",
    description: "Tạo ảnh thông báo phòng scrimm với viền chữ tùy chỉnh.",
    commandCategory: "tiện ích",
    usages: "[Tiêu đề]| [Phụ đề]| [Dòng 1]| [Dòng 2]| [Nội dung Banking]\n-> Ví dụ: /boxscrimm BOX CUS SCRIMM| 5K - 10K - 15K| 13:00 - 15:00 - 20:00 6K| 13:00 - 15:00 - 20:00 8K| 00000000000 (MB BANK)",
    cooldowns: 20
};

module.exports.onLoad = async function() {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const assets = [
        { url: "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf", path: "Prompt-Bold.ttf", family: "Prompt" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Anton-Regular.ttf", path: "Anton-Regular.ttf", family: "Anton" },
        { url: BACKGROUND_URL, path: BACKGROUND_FILENAME }
    ];

    console.log("Bắt đầu tải tài nguyên cho lệnh boxscrimm...");
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
    console.log("Tài nguyên boxscrimm đã sẵn sàng.");
    isAssetsReady = true;
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!isAssetsReady) {
        return api.sendMessage("⏳ Tài nguyên cho lệnh này đang được tải về, vui lòng thử lại sau giây lát...", threadID, messageID);
    }
    try {
        api.sendMessage(`⏳ Đang tạo ảnh...`, threadID, messageID);

        const input = args.join(" ").split("|").map(item => item.trim());

        const title = input[0] || "BOX CUS SCRIMM";
        const subtitle = input[1] || "5K - 10K - 15K";
        const line1 = input[2] || "13:00 - 15:00 - 20:00 6K";
        const line2 = input[3] || "13:00 - 15:00 - 20:00 8K";
        const bankingInfo = input[4] || "00000000000 (MB BANK)";

        const backgroundCachePath = path.join(__dirname, 'cache', BACKGROUND_FILENAME);

        const imageBuffer = await createScrimmImage({
            cachePath: backgroundCachePath,
            title,
            subtitle,
            line1,
            line2,
            bankingInfo
        });

        const imagePath = path.join(__dirname, 'cache', `scrimm_temp_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);

    } catch (err) {
        console.error("Lỗi chi tiết trong boxscrimm:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${err.message}.`, threadID, messageID);
    }
};
