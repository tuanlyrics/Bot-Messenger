/**
 * @name ffe
 * @version 23.6 (Tùy chỉnh màu cho từng chỉ số)
 * @description Tạo ảnh BXH FF, tách giờ/ngày và hiển thị top 4 team win ở các game.
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
    { url: 'https://files.catbox.moe/cpcelc.png', path: 'background_bxh_ffe_new.png', type: "image" },
    { url: 'https://i.imgur.com/8QkXZbH.png', path: 'default_logo1.png', type: "image" },
];

let isAssetsReady = false;

// --- HÀM VẼ ẢNH CHÍNH ---
async function createLeaderboardImage({ rankedTeams, cacheDir, scrimTime, scrimDate, tournamentName, gameWinnersData }) {
    
    const backgroundPath = path.join(cacheDir, 'background_bxh_ffe_new.png');
    const logoPath = path.join(cacheDir, 'default_logo1.png');

    if (!fs.existsSync(backgroundPath)) throw new Error(`Lỗi: Không tìm thấy file ảnh nền.`);
    if (!fs.existsSync(logoPath)) throw new Error(`Lỗi: Không tìm thấy file logo.`);
    
    // ==================================================================================
    // --- CẤU HÌNH GIAO DIỆN ---
    // ==================================================================================
    const layoutConfig = {
        canvasSize: { width: 1638, height: 2048 },
        scrimTitle:     { text: "FREE FIRE SCRIM", x: 700, y: 305, font: 'bold 45px Teko', color: '#FFFFFF', textAlign: 'center' },
        scrimDateTime:  { x: 1050, y: 305, font: 'bold 45px Teko', color: '#A82FF9', textAlign: 'center' },
        top1: {
            logo:   { x: 685, y: 670, size: 70 },
            name:   { x: 180, y: 855, font: 'bold 40px Teko', color: '#FFFFFF', textAlign: 'left' },
            // [THAY ĐỔI] Thêm màu riêng cho từng chỉ số của Top 1
            elim:   { x: 525, y: 855, font: 'bold 40px Anton', color: '#FFFFFF', textAlign: 'center' }, // Màu cho elim
            booyah: { x: 640, y: 855, font: 'bold 40px Anton', color: '#FFFFFF', textAlign: 'center' }, // Màu cho booyah
            pts:    { x: 750, y: 855, font: 'bold 40px Anton', color: '#FFFFFF', textAlign: 'center' }  // Màu cho pts
        },
        leaderboardTable: {
            logoSize: 40,
            // [THAY ĐỔI] Thay thế 'stats' bằng màu riêng cho 'elim', 'booyah', 'pts'
            leftColumn: { 
                startY: 981, rowHeight: 77, logoX: 130, nameX: 190, elimsX: 525, booyahX: 640, ptsX: 750, 
                font: { name: 'bold 30px Teko', stats: 'bold 30px Teko' }, 
                color: { text: '#FFFFFF', elim: '#FFFFFF', booyah: '#FFFFFF', pts: '#FFBA00' } 
            },
            rightColumn: { 
                startY: 918, rowHeight: 73, logoX: 935, nameX: 995, elimsX: 1340, booyahX: 1455, ptsX: 1565, 
                font: { name: 'bold 30px Teko', stats: 'bold 30px Teko' }, 
                color: { text: '#FFFFFF', elim: '#FFFFFF', booyah: '#FFFFFF', pts: '#FFBA00' } 
            }
        },
        gameLogos: {
            game1: { x: 320, y: 1580, width: 150, height: 150 },
            game2: { x: 620, y: 1580, width: 150, height: 150 },
            game3: { x: 915, y: 1580, width: 150, height: 150 },
            game4: { x: 1215, y: 1580, width: 150, height: 150 }
        },
        gameWinners: {
            font: 'bold 28px Teko', color: '#FFFFFF', textAlign: 'center',
            game1: { x: 390,  y: 1780 },
            game2: { x: 690,  y: 1780 },
            game3: { x: 990,  y: 1780 },
            game4: { x: 1290, y: 1780 }
        },
        footer: { text: tournamentName, x: 610, y: 2025, font: 'bold 35px Teko', color: '#FFFFFF', textAlign: 'left' }
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
    
    const titleCfg = layoutConfig.scrimTitle;
    ctx.font = titleCfg.font; ctx.fillStyle = titleCfg.color; ctx.textAlign = titleCfg.textAlign;
    ctx.fillText(titleCfg.text.toUpperCase(), titleCfg.x, titleCfg.y);

    const dateTimeCfg = layoutConfig.scrimDateTime;
    const dateTimeText = `${scrimTime} - ${scrimDate}`;
    ctx.font = dateTimeCfg.font; ctx.fillStyle = dateTimeCfg.color; ctx.textAlign = dateTimeCfg.textAlign;
    ctx.fillText(dateTimeText.toUpperCase(), dateTimeCfg.x, dateTimeCfg.y);

    const top1Team = rankedTeams[0];
    if (top1Team) {
        const top1Cfg = layoutConfig.top1;
        ctx.drawImage(defaultLogo, top1Cfg.logo.x, top1Cfg.logo.y, top1Cfg.logo.size, top1Cfg.logo.size);
        ctx.font = top1Cfg.name.font; ctx.fillStyle = top1Cfg.name.color; ctx.textAlign = top1Cfg.name.textAlign;
        ctx.fillText(top1Team.teamName.toUpperCase(), top1Cfg.name.x, top1Cfg.name.y);

        // [THAY ĐỔI] Vẽ các chỉ số Top 1 với màu riêng
        // Elim
        ctx.font = top1Cfg.elim.font; ctx.fillStyle = top1Cfg.elim.color; ctx.textAlign = top1Cfg.elim.textAlign;
        ctx.fillText(String(top1Team.totalKills), top1Cfg.elim.x, top1Cfg.elim.y);
        // Booyah
        ctx.font = top1Cfg.booyah.font; ctx.fillStyle = top1Cfg.booyah.color; ctx.textAlign = top1Cfg.booyah.textAlign;
        ctx.fillText(String(top1Team.totalBooyahs), top1Cfg.booyah.x, top1Cfg.booyah.y);
        // Pts
        ctx.font = top1Cfg.pts.font; ctx.fillStyle = top1Cfg.pts.color; ctx.textAlign = top1Cfg.pts.textAlign;
        ctx.fillText(String(top1Team.totalScore), top1Cfg.pts.x, top1Cfg.pts.y);
    }
    
    const tableCfg = layoutConfig.leaderboardTable;
    for (let i = 1; i < 12; i++) {
        const team = rankedTeams[i]; if (!team) continue;
        let colConfig, rowIndex;
        if (i < 6) { colConfig = tableCfg.leftColumn; rowIndex = i - 1; } 
        else { colConfig = tableCfg.rightColumn; rowIndex = i - 6; }
        const currentY = colConfig.startY + rowIndex * colConfig.rowHeight;
        
        ctx.drawImage(defaultLogo, colConfig.logoX, currentY - tableCfg.logoSize / 2, tableCfg.logoSize, tableCfg.logoSize);
        
        ctx.font = colConfig.font.name; ctx.fillStyle = colConfig.color.text; ctx.textAlign = 'left';
        ctx.fillText(team.teamName.toUpperCase(), colConfig.nameX, currentY);

        // [THAY ĐỔI] Vẽ các chỉ số trong bảng với màu riêng
        ctx.font = colConfig.font.stats;
        ctx.textAlign = 'center';
        
        // Elim
        ctx.fillStyle = colConfig.color.elim;
        ctx.fillText(String(team.totalKills), colConfig.elimsX, currentY);
        
        // Booyah
        ctx.fillStyle = colConfig.color.booyah;
        ctx.fillText(String(team.totalBooyahs), colConfig.booyahX, currentY);
        
        // Pts
        ctx.fillStyle = colConfig.color.pts;
        ctx.fillText(String(team.totalScore), colConfig.ptsX, currentY);
    }

    const logoCfg = layoutConfig.gameLogos;
    ctx.drawImage(defaultLogo, logoCfg.game1.x, logoCfg.game1.y, logoCfg.game1.width, logoCfg.game1.height);
    ctx.drawImage(defaultLogo, logoCfg.game2.x, logoCfg.game2.y, logoCfg.game2.width, logoCfg.game2.height);
    ctx.drawImage(defaultLogo, logoCfg.game3.x, logoCfg.game3.y, logoCfg.game3.width, logoCfg.game3.height);
    ctx.drawImage(defaultLogo, logoCfg.game4.x, logoCfg.game4.y, logoCfg.game4.width, logoCfg.game4.height);

    const winnerCfg = layoutConfig.gameWinners;
    ctx.font = winnerCfg.font; ctx.fillStyle = winnerCfg.color; ctx.textAlign = winnerCfg.textAlign;
    if (gameWinnersData[0]) ctx.fillText(gameWinnersData[0].toUpperCase(), winnerCfg.game1.x, winnerCfg.game1.y);
    if (gameWinnersData[1]) ctx.fillText(gameWinnersData[1].toUpperCase(), winnerCfg.game2.x, winnerCfg.game2.y);
    if (gameWinnersData[2]) ctx.fillText(gameWinnersData[2].toUpperCase(), winnerCfg.game3.x, winnerCfg.game3.y);
    if (gameWinnersData[3]) ctx.fillText(gameWinnersData[3].toUpperCase(), winnerCfg.game4.x, winnerCfg.game4.y);
    
    const footerCfg = layoutConfig.footer;
    ctx.font = footerCfg.font; ctx.fillStyle = footerCfg.color; ctx.textAlign = footerCfg.textAlign;
    ctx.fillText(tournamentName.toUpperCase(), footerCfg.x, footerCfg.y);

    return canvas.toBuffer('image/png');
}

// --- CẤU TRÚC LỆNH, HÀM TẢI, HÀM CHẠY ---
module.exports.config = {
    name: "ffe", version: "23.6", hasPermssion: 0, credits: "Gemini",
    description: "Tạo ảnh BXH FF, tách giờ/ngày và hiển thị top 4 team win ở các game.",
    commandCategory: "Tạo ảnh", 
    usages: "[<giờ>]|[<ngày>]|[<tên giải đấu>]",
    cooldowns: 20
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
    
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const defaultDate = `${day}/${month}`;
    
    const input = args.join(" ").split("|");
    const scrimTime = input[0]?.trim() || `20:00`;
    const scrimDate = input[1]?.trim() || defaultDate;
    const tournamentName = input[2]?.trim() || `CUSTOM FREE F`;

    try {
        api.sendMessage(`⏳ Đang khởi tạo bảng xếp hạng...`, threadID, messageID);
        const teamNames = ["TEAM VIP 1", "TEAM PRO 2", "GHOST KILLER", "LEGEND SQUAD", "NO MERCY", "DARK HORSE", "THE CHAMPIONS", "SILENT HUNTER", "KING OF GAME", "UNITED FF", "ACE GAMING", "OMEGA TEAM"];
        
        let rankedTeams = teamNames.map(name => ({
            teamName: name, totalScore: Math.floor(Math.random() * 80) + 20,
            totalKills: Math.floor(Math.random() * 40) + 10, totalBooyahs: Math.floor(Math.random() * 4) + 1
        }));
        
        rankedTeams.sort((a, b) => b.totalScore - a.totalScore);
        
        const gameWinnersData = rankedTeams.slice(0, 4).map(team => team.teamName);

        const cacheDir = path.join(__dirname, 'cache');
        const imageBuffer = await createLeaderboardImage({ 
            rankedTeams, 
            cacheDir, 
            tournamentName, 
            scrimTime, 
            scrimDate,
            gameWinnersData 
        });

        const imagePath = path.join(cacheDir, `ffe_final_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);
    } catch (err) {
        console.error("Lỗi chi tiết trong FFE:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${err.message}.`, threadID, messageID);
    }
};
