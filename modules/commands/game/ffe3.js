/**
 * @name ffe
 * @version 22.9 (Thêm toạ độ x,y cho Top 1)
 * @description Tạo ảnh BXH FF. Thêm tọa độ x, y riêng cho Elim, Booyah, Pts của Top 1.
 * @author Gemini (chỉnh sửa theo yêu cầu)
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- CẤU HÌNH TÀI NGUYÊN ---
const ASSETS_TO_LOAD = [
    { url: "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf", path: "Anton-Regular.ttf", family: "Anton", type: "font" },
    { url: "https://github.com/google/fonts/raw/main/ofl/teko/Teko-Bold.ttf", path: "Teko-Bold.ttf", family: "Teko", type: "font" },
    { url: 'https://files.catbox.moe/yxwbjg.png', path: 'background_bxh_tong.png', type: "image" },
    { url: 'https://i.imgur.com/8QkXZbH.png', path: 'default_logo1.png', type: "image" },
];

let isAssetsReady = false;

// --- HÀM VẼ ẢNH CHÍNH ---
async function createLeaderboardImage({ rankedTeams, cacheDir, tournamentName, scrimInfo }) {
    
    const backgroundPath = path.join(cacheDir, 'background_bxh_tong.png');
    const logoPath = path.join(cacheDir, 'default_logo1.png');

    if (!fs.existsSync(backgroundPath)) throw new Error(`Lỗi: Không tìm thấy file ảnh nền.`);
    if (!fs.existsSync(logoPath)) throw new Error(`Lỗi: Không tìm thấy file logo.`);
    
    // ==================================================================================
    // --- TOÀN BỘ CẤU HÌNH GIAO DIỆN ---
    // ==================================================================================
    const layoutConfig = {
        canvasSize: { width: 1638, height: 2048 },
        // TỌA ĐỘ CỦA FREE FIRE SCRIM NẰM Ở ĐÂY
        scrimInfo: {
            text: scrimInfo, x: 690, y: 445,
            font: 'bold 50px Prompt-BoldItalic', color: '#FFFFFF', textAlign: 'center'
        },
        top1: {
            name:   { x: 505, y: 970, font: 'bold 45px Prompt-BoldItalic', color: '#FFFFFF', textAlign: 'left' },
            // [THAY ĐỔI] THÊM TỌA ĐỘ X, Y RIÊNG CHO TỪNG CHỈ SỐ
            elim:   { x: 1090,  y: 850, font: 'bold 75px Anton', color: '#FFFFFF', textAlign: 'center' },
            booyah: { x: 1284, y: 850, font: 'bold 75px Anton', color: '#FFFFFF', textAlign: 'center' },
            pts:    { x: 1464, y: 850, font: 'bold 75px Anton', color: '#FFFFFF', textAlign: 'center' }
        },
        leaderboardTable: {
            logoSize: 35,
            leftColumn: { 
                startY: 1215, rowHeight: 71,
                logoX: 70, nameX: 125, elimsX: 430, booyahX: 580, ptsX: 720,
                font: { name: 'bold 30px Teko', stats: 'bold 30px Teko' },
                color: { text: '#FFFFFF', stats: '#FFFFFF' }
            },
            rightColumn: { 
                startY: 1215, rowHeight: 71,
                logoX: 885, nameX: 940, elimsX: 1250, booyahX: 1400, ptsX: 1530,
                font: { name: 'bold 30px Teko', stats: 'bold 30px Teko' },
                color: { text: '#FFFFFF', stats: '#FFFFFF' }
            }
        },
        footer: {
            text: tournamentName, x: 840, y: 2016,
            font: 'bold 35px Prompt-BoldItalic', color: '#FFFFFF', textAlign: 'left'
        }
    };
    // ==================================================================================
    // --- KẾT THÚC KHU VỰC CẤU HÌNH ---
    // ==================================================================================

    const background = await loadImage(backgroundPath);
    const canvas = createCanvas(layoutConfig.canvasSize.width, layoutConfig.canvasSize.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'middle';
    
    const defaultLogo = await loadImage(logoPath);
    
    // Vẽ thông tin Scrim
    const scrimCfg = layoutConfig.scrimInfo;
    ctx.font = scrimCfg.font; ctx.fillStyle = scrimCfg.color; ctx.textAlign = scrimCfg.textAlign;
    ctx.fillText(scrimCfg.text.toUpperCase(), scrimCfg.x, scrimCfg.y);

    // Vẽ đội TOP 1 (khu vực đặc biệt)
    const top1Team = rankedTeams[0];
    if (top1Team) {
        const top1Cfg = layoutConfig.top1;
        
        // Vẽ Tên đội TOP 1
        ctx.font = top1Cfg.name.font; ctx.fillStyle = top1Cfg.name.color; ctx.textAlign = top1Cfg.name.textAlign;
        ctx.fillText(top1Team.teamName.toUpperCase(), top1Cfg.name.x, top1Cfg.name.y);
        
        // [THAY ĐỔI] CẬP NHẬT LẠI LOGIC VẼ ĐỂ DÙNG TỌA ĐỘ MỚI
        // Vẽ chỉ số ELIM
        const elimCfg = top1Cfg.elim;
        ctx.font = elimCfg.font; ctx.fillStyle = elimCfg.color; ctx.textAlign = elimCfg.textAlign;
        ctx.fillText(String(top1Team.totalKills), elimCfg.x, elimCfg.y);

        // Vẽ chỉ số BOOYAH
        const booyahCfg = top1Cfg.booyah;
        ctx.font = booyahCfg.font; ctx.fillStyle = booyahCfg.color; ctx.textAlign = booyahCfg.textAlign;
        ctx.fillText(String(top1Team.totalBooyahs), booyahCfg.x, booyahCfg.y);

        // Vẽ chỉ số PTS
        const ptsCfg = top1Cfg.pts;
        ctx.font = ptsCfg.font; ctx.fillStyle = ptsCfg.color; ctx.textAlign = ptsCfg.textAlign;
        ctx.fillText(String(top1Team.totalScore), ptsCfg.x, ptsCfg.y);
    }
    
    // Vẽ bảng xếp hạng từ 1 đến 12
    const tableCfg = layoutConfig.leaderboardTable;
    for (let i = 0; i < 12; i++) {
        const team = rankedTeams[i];
        if (!team) continue;

        let colConfig;
        let rowIndex;

        if (i < 6) {
            colConfig = tableCfg.leftColumn;
            rowIndex = i;
        } else {
            colConfig = tableCfg.rightColumn;
            rowIndex = i - 6;
        }
        
        const currentY = colConfig.startY + rowIndex * colConfig.rowHeight;
        
        ctx.drawImage(defaultLogo, colConfig.logoX, currentY - tableCfg.logoSize / 2, tableCfg.logoSize, tableCfg.logoSize);
        ctx.font = colConfig.font.name; ctx.fillStyle = colConfig.color.text; ctx.textAlign = 'left';
        ctx.fillText(team.teamName.toUpperCase(), colConfig.nameX, currentY);
        ctx.font = colConfig.font.stats; ctx.fillStyle = colConfig.color.stats; ctx.textAlign = 'center';
        ctx.fillText(String(team.totalKills), colConfig.elimsX, currentY);
        ctx.fillText(String(team.totalBooyahs), colConfig.booyahX, currentY);
        ctx.fillText(String(team.totalScore), colConfig.ptsX, currentY);
    }
    
    // Vẽ Tên giải đấu ở footer
    const footerCfg = layoutConfig.footer;
    ctx.font = footerCfg.font; ctx.fillStyle = footerCfg.color; ctx.textAlign = footerCfg.textAlign;
    ctx.fillText(footerCfg.text.toUpperCase(), footerCfg.x, footerCfg.y);

    return canvas.toBuffer('image/png');
}

// --- CẤU TRÚC LỆNH, HÀM TẢI, HÀM CHẠY ---
// (Các phần này giữ nguyên không đổi)
module.exports.config = {
    name: "ffe", version: "22.9", hasPermssion: 0, credits: "Gemini",
    description: "Tạo ảnh BXH FF, đã loại bỏ logo ở khu vực Top 1.",
    commandCategory: "Tạo ảnh", usages: "[<tên scrim>]|[<tên giải đấu>]", cooldowns: 20
};
module.exports.onLoad = async function() {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) { try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (e) { console.error(`[FFE] Không thể tạo thư mục cache: ${e.message}`); return; } }
    console.log(`[FFE] Bắt đầu tải ${ASSETS_TO_LOAD.length} tài nguyên...`);
    for (const asset of ASSETS_TO_LOAD) {
        const assetPath = path.join(cacheDir, asset.path);
        if (!fs.existsSync(assetPath)) {
            try { const { data } = await axios.get(asset.url, { responseType: 'arraybuffer' }); fs.writeFileSync(assetPath, data); } catch (e) { console.error(`[FFE] -> Lỗi khi tải ${asset.path}: ${e.message}`); }
        }
    }
    for (const asset of ASSETS_TO_LOAD) {
        if (asset.type === "font") {
            const assetPath = path.join(cacheDir, asset.path);
            if (fs.existsSync(assetPath)) { try { registerFont(assetPath, { family: asset.family }); } catch (e) { console.error(`[FFE] Lỗi đăng ký font: ${asset.family}.`, e); } } else { console.error(`[FFE] Không tìm thấy file font để đăng ký: ${asset.path}`); }
        }
    }
    console.log("[FFE] Tài nguyên đã sẵn sàng.");
    isAssetsReady = true;
};
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!isAssetsReady) { return api.sendMessage("⏳ Tài nguyên đang được tải về, vui lòng thử lại sau giây lát...", threadID, messageID); }
    const input = args.join(" ").split("|");
    const scrimInfo = input[0]?.trim() || `FREE FIRE SCRIM`;
    const tournamentName = input[1]?.trim() || `TÊN GIẢI ĐẤU`;
    try {
        api.sendMessage(`⏳ Đang khởi tạo bảng xếp hạng "${scrimInfo}"...`, threadID, messageID);
        const teamNames = ["TEAM VIP 1", "TEAM PRO 2", "GHOST KILLER", "LEGEND SQUAD", "NO MERCY", "DARK HORSE", "THE CHAMPIONS", "SILENT HUNTER", "KING OF GAME", "UNITED FF", "ACE GAMING", "OMEGA TEAM"];
        let rankedTeams = teamNames.map(name => ({
            teamName: name, totalScore: Math.floor(Math.random() * 80) + 20,
            totalKills: Math.floor(Math.random() * 40) + 10, totalBooyahs: Math.floor(Math.random() * 4) + 1
        }));
        rankedTeams.sort((a, b) => b.totalScore - a.totalScore);
        const cacheDir = path.join(__dirname, 'cache');
        const imageBuffer = await createLeaderboardImage({ rankedTeams, cacheDir, tournamentName, scrimInfo });
        const imagePath = path.join(cacheDir, `ffe_final_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);
    } catch (err) {
        console.error("Lỗi chi tiết trong FFE:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${err.message}.`, threadID, messageID);
    }
};

