/**
 * @name ffe
 * @version 20.5 (United Layout - Auto Date/Time & Color)
 * @description Tạo ảnh BXH FF theo layout United. Tự động lấy ngày/giờ hiện tại nếu bỏ trống.
 * @author Gemini (Cập nhật layout và tính năng)
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- CẤU HÌNH LOGO ---
const DEFAULT_LOGO_URL = 'https://i.imgur.com/8QkXZbH.png'; // Host Imgur
const DEFAULT_LOGO_FILENAME = 'default_logo1.png';
const UNITED_LOGO_URL = 'https://i.imgur.com/UfBq52l.png'; // Host Imgur
const UNITED_LOGO_FILENAME = 'logo_united1.png';

// --- CẤU HÌNH NỀN ---
const BACKGROUND_URL = 'https://files.catbox.moe/awhpsi.png'; // Host Imgur
const BACKGROUND_FILENAME = 'background_ffe_Luffy.png';

let isAssetsReady = false;

// --- HÀM VẼ ẢNH CHÍNH ---
async function createLeaderboardImage({ rankedTeams, cachePath, scrimDate, scrimTime }) {
    if (!fs.existsSync(cachePath)) {
        throw new Error(`Không tìm thấy ảnh nền tại '${cachePath}'. Vui lòng thử lại.`);
    }

    // ==================================================================================
    // --- KHU VỰC CHỈNH SỬA GIAO DIỆN (TỌA ĐỘ, FONT, MÀU SẮC) ---
    // ==================================================================================
    const layoutConfig = {
        canvasSize: { width: 4800, height: 2700 },
        header: {
            logo: { x: 61, y: 128, size: 290 },
            scrimText: {
                text: 'FREE FIRE SCRIM',
                x: 3017,
                y: 510,
                font: 'bold 60px Anton',
                color: '#000000',
                textAlign: 'center'
            },
            scrimInfoBox: {
                font: 'bold 65px Teko',
                textAlign: 'center',
                date: {
                    prefix: 'SCRIM NGÀY',
                    x: 2864,
                    y: 708,
                    color: '#FFFFFF' // Màu của ngày
                },
                time: {
                    x: 3252,
                    y: 708,
                    // <<< THAY ĐỔI: Thêm màu riêng cho giờ
                    color: '#000000' // Màu của giờ (màu vàng)
                }
            }
        },
        top1: {
            logo: { x: 308, y: 1857, size: 300 },
            name: { x: 270, y: 2243 },
            font: { name: 'bold 50px Anton'},
            color: '#000000',
        },
        top1stat: {
            stats: { y: 2079, elimX: 1021, booyahX: 1582, pointsX: 2175 },
            font: { stats: 'bold 130px Prompt-BoldItalic' },
            color: '#FFFFFF',
        },
        leaderboardTable: {
            startY: 903,
            rowHeight: 130,
            logo: { x: 2737, size: 65 },
            nameX: 2962,
            stats: { elimX: 3988, booyahX: 4283, pointsX: 4540 },
            font: { name: 'bold 50px Anton', stats: 'bold 90px Teko' },
            color: { text: '#000000', points: '#000000' },
        },
    };
    // ==================================================================================
    // --- KẾT THÚC KHU VỰC CHỈNH SỬA ---
    // ==================================================================================

    const background = await loadImage(cachePath);
    const canvas = createCanvas(layoutConfig.canvasSize.width, layoutConfig.canvasSize.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'middle';

    const unitedLogoPath = path.join(__dirname, 'cache', UNITED_LOGO_FILENAME);
    const defaultLogoPath = path.join(__dirname, 'cache', DEFAULT_LOGO_FILENAME);
    const getLogoForTeam = (team) => (team?.teamName?.toUpperCase() === 'UNITED') ? unitedLogoPath : defaultLogoPath;

    const headerCfg = layoutConfig.header;
    const unitedLogo = await loadImage(unitedLogoPath);
    ctx.drawImage(unitedLogo, headerCfg.logo.x, headerCfg.logo.y, headerCfg.logo.size, headerCfg.logo.size);
    
    // Vẽ chữ "FREE FIRE SCRIM"
    ctx.font = headerCfg.scrimText.font;
    ctx.fillStyle = headerCfg.scrimText.color;
    ctx.textAlign = headerCfg.scrimText.textAlign;
    ctx.fillText(headerCfg.scrimText.text, headerCfg.scrimText.x, headerCfg.scrimText.y);

    // Vẽ ngày và giờ scrim
    const infoBox = headerCfg.scrimInfoBox;
    ctx.font = infoBox.font;
    ctx.textAlign = infoBox.textAlign;

    // <<< THAY ĐỔI: Logic vẽ ngày và giờ với màu riêng
    // Vẽ ngày
    ctx.fillStyle = infoBox.date.color;
    ctx.fillText(`${infoBox.date.prefix} ${scrimDate}`, infoBox.date.x, infoBox.date.y);
    
    // Vẽ giờ với màu đã định nghĩa
    ctx.fillStyle = infoBox.time.color;
    ctx.fillText(scrimTime, infoBox.time.x, infoBox.time.y);


    if (rankedTeams && rankedTeams.length > 0) {
        // Vẽ Top 1
        const top1Team = rankedTeams[0];
        if (top1Team) {
            const cfg = layoutConfig.top1;
            const stat = layoutConfig.top1stat;
            const logo = await loadImage(getLogoForTeam(top1Team));
            ctx.drawImage(logo, cfg.logo.x, cfg.logo.y, cfg.logo.size, cfg.logo.size);

            ctx.fillStyle = cfg.color;
            ctx.font = cfg.font.name;
            ctx.textAlign = 'left';
            ctx.fillText((top1Team.teamName || "N/A").toUpperCase(), cfg.name.x, cfg.name.y);
            
            ctx.fillStyle = stat.color;
            ctx.font = stat.font.stats;
            ctx.textAlign = 'center';
            ctx.fillText(String(top1Team.totalKills || 0), stat.stats.elimX, stat.stats.y);
            ctx.fillText(String(top1Team.totalBooyahs || 0), stat.stats.booyahX, stat.stats.y);
            ctx.fillText(String(top1Team.totalScore || 0), stat.stats.pointsX, stat.stats.y);
        }

        // Vẽ các hạng còn lại (2-12)
        const cfg = layoutConfig.leaderboardTable;
        for (let i = 1; i < 12; i++) {
            const team = rankedTeams[i];
            if (!team) continue;

            const index = i - 1;
            const currentY = cfg.startY + index * cfg.rowHeight;

            const logo = await loadImage(getLogoForTeam(team));
            ctx.drawImage(logo, cfg.logo.x, currentY - cfg.logo.size / 2, cfg.logo.size, cfg.logo.size);

            ctx.font = cfg.font.name;
            ctx.textAlign = 'left';
            ctx.fillStyle = cfg.color.text;
            ctx.fillText((team.teamName || "N/A").toUpperCase(), cfg.nameX, currentY);

            ctx.font = cfg.font.stats;
            ctx.textAlign = 'center';
            ctx.fillStyle = cfg.color.points;
            ctx.fillText(String(team.totalKills || 0), cfg.stats.elimX, currentY);
            ctx.fillText(String(team.totalBooyahs || 0), cfg.stats.booyahX, currentY);
            ctx.fillText(String(team.totalScore || 0), cfg.stats.pointsX, currentY);
        }
    }

    return canvas.toBuffer('image/png');
}

// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "ffe2",
    version: "20.5",
    hasPermssion: 0,
    credits: "Gemini (United Layout - Auto Date/Time & Color)",
    description: "Tạo ảnh BXH FF layout United. Tự động lấy ngày/giờ hiện tại nếu bỏ trống.",
    commandCategory: "tiện ích",
    usages: "[<ngày> | <giờ>]", // Hướng dẫn sử dụng mới
    cooldowns: 20
};

// --- HÀM TẢI TÀI NGUYÊN ---
module.exports.onLoad = async function() {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const assets = [
        { url: "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf", path: "Anton-Regular.ttf", family: "Anton" },
        { url: "https://github.com/google/fonts/raw/main/ofl/teko/Teko-Bold.ttf", path: "Teko-Bold.ttf", family: "Teko" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Prompt-BoldItalic.ttf", path: "Prompt-BoldItalic.ttf", family: "Prompt-BoldItalic" },
        { url: BACKGROUND_URL, path: BACKGROUND_FILENAME },
        { url: UNITED_LOGO_URL, path: UNITED_LOGO_FILENAME },
        { url: DEFAULT_LOGO_URL, path: DEFAULT_LOGO_FILENAME }
    ];
    console.log("Bắt đầu tải tài nguyên cho lệnh ffe (v20.5)...");
    for (const asset of assets) {
        const assetPath = path.join(cacheDir, asset.path);
        if (!fs.existsSync(assetPath)) {
            try {
                const { data } = await axios.get(asset.url, { responseType: 'arraybuffer' });
                fs.writeFileSync(assetPath, data);
            } catch (e) { console.error(`Lỗi khi tải ${asset.path}: ${e.message}`); }
        }
        if (asset.family) {
            try { registerFont(assetPath, { family: asset.family }); } catch (e) { console.error(`Lỗi đăng ký font: ${asset.family}.`, e); }
        }
    }
    console.log("Tài nguyên ffe (v20.5) đã sẵn sàng.");
    isAssetsReady = true;
};

// --- HÀM CHẠY LỆNH ---
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!isAssetsReady) {
        return api.sendMessage("⏳ Tài nguyên đang được tải về, vui lòng thử lại sau giây lát...", threadID, messageID);
    }
    
    let scrimDate, scrimTime;

    if (args.length === 0) {
        // Nếu không có đối số, tự động lấy ngày giờ hiện tại
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth() + 1; // getMonth() bắt đầu từ 0
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        scrimDate = `${day}.${month}`;
        scrimTime = `${hours}H${minutes}`;
    } else {
        // Nếu có đối số, xử lý như cũ
        const input = args.join(" ").split("|");
        scrimDate = input[0]?.trim();
        scrimTime = input[1]?.trim();

        if (!scrimDate || !scrimTime) {
            return api.sendMessage("❌ Định dạng không hợp lệ. Vui lòng sử dụng đúng cấu trúc:\n➡️ ffe <ngày> | <giờ>\n📝 Ví dụ: ffe 12.8 | 20H00\nHoặc để trống để lấy giờ hiện tại.", threadID, messageID);
        }
    }

    try {
        api.sendMessage(`⏳ Đang khởi tạo bảng xếp hạng (Ngày ${scrimDate} - ${scrimTime}) theo layout United...`, threadID, messageID);

        // Tạo dữ liệu team ngẫu nhiên
        const teamNames = ["TEAM NAME 1", "TEAM NAME 2", "TEAM NAME 3", "TEAM NAME 4", "TEAM NAME 5", "TEAM NAME 6", "TEAM NAME 7", "TEAM NAME 8", "TEAM NAME 9", "TEAM NAME 10", "TEAM NAME 11", "TEAM NAME 12"];
        let rankedTeams = teamNames.map(name => ({
            teamName: name,
            totalScore: Math.floor(Math.random() * 150) + 20,
            totalKills: Math.floor(Math.random() * 60) + 10,
            totalBooyahs: Math.floor(Math.random() * 4)
        }));
        rankedTeams.sort((a, b) => b.totalScore - a.totalScore);

        const backgroundCachePath = path.join(__dirname, 'cache', BACKGROUND_FILENAME);
        const imageBuffer = await createLeaderboardImage({ 
            rankedTeams, 
            cachePath: backgroundCachePath,
            scrimDate,
            scrimTime
        });
        const imagePath = path.join(__dirname, 'cache', `ffe_final_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);

    } catch (err) {
        console.error("Lỗi chi tiết trong FFE:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${err.message}.`, threadID, messageID);
    }
};
