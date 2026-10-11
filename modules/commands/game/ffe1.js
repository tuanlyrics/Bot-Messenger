/**
 * @name ffe1_conan
 * @version 2.1 (Layout Conan - No Rank Numbers)
 * @description Tạo ảnh BXH FF theo layout Conan, 1 Top 1 lớn, BXH (không số thứ tự), và Booyah có logo.
 * @author Gemini
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- CẤU HÌNH TÀI NGUYÊN ---
const BACKGROUND_URL = 'https://files.catbox.moe/n67jrs.png';
const BACKGROUND_FILENAME = 'background_conanV9.png';
const DEFAULT_LOGO_URL = 'https://i.imgur.com/8QkXZbH.png';
const DEFAULT_LOGO_FILENAME = 'default_logo1.png';

let isAssetsReady = false;

// --- HÀM VẼ ẢNH CHÍNH ---
async function createConanLeaderboard({ rankedTeams, booyahWinners, tournamentName, cachePath }) {
    if (!fs.existsSync(cachePath)) {
        throw new Error(`Không tìm thấy ảnh nền tại '${cachePath}'.`);
    }

    // ==================================================================================
    // --- KHU VỰC CHỈNH SỬA GIAO DIỆN (TỌA ĐỘ, FONT, MÀU SẮC) ---
    // ==================================================================================
    const layoutConfig = {
        canvasSize: { width: 1638, height: 2048 },
        top1Large: {
            logo: { x: 168, y: 785, size: 180 },
            name: { x: 148, y: 1035, font: 'bold 30px Prompt-BoldItalic', color: '#FFFFFF', textAlign: 'left' },
            stats: {
                font: 'bold 100px Prompt-BoldItalic', color: '#FFFFFF', textAlign: 'center',
                elimsX: 641, booyahX: 1005, ptsX: 1404, y: 927
            }
        },
        leaderboardTable: {
            startY: 1180,
            rowHeight: 70,
            logoSize: 35,
            font: {
                name: 'bold 25px Prompt',
                stats: 'bold 35px Teko'
            },
            color: '#FFFFFF',
            leftColumn: { // Hạng 1-6
                // rankX: 100, // Đã bỏ hiển thị rankX
                logoX: 79, nameX: 130, elimsX: 451, booyahX: 600, ptsX: 730
            },
            rightColumn: { // Hạng 7-12
                // rankX: 1180, // Đã bỏ hiển thị rankX
                logoX: 886, nameX: 937, elimsX: 1260, booyahX: 1404, ptsX: 1547
            }
        },
        booyahInfo: {
            font: 'bold 30px Prompt-BoldItalic', color: '#FFFFFF', textAlign: 'left',
            logoSize: 60,
            game1: { logoX: 414, logoY: 1655, textX: 484, textY: 1687 },
            game2: { logoX: 1020, logoY: 1652, textX: 1098, textY: 1684 },
            game3: { logoX: 398, logoY: 1800, textX: 463, textY: 1831 },
            game4: { logoX: 1010, logoY: 1800, textX: 1088, textY: 1826 }
        },
        footer: {
            tournamentName: {
                text: tournamentName.toUpperCase(),
                x: 837, y: 2015, font: 'bold 25px Prompt-BoldItalic',
                color: '#FFFFFF', textAlign: 'left'
            }
        }
    };
    // ==================================================================================

    const background = await loadImage(cachePath);
    const canvas = createCanvas(layoutConfig.canvasSize.width, layoutConfig.canvasSize.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'middle';

    const defaultLogo = await loadImage(path.join(__dirname, 'cache', DEFAULT_LOGO_FILENAME));
    
    // --- Hàm trợ giúp vẽ logo ---
    const drawLogo = async (logoPath, x, y, size) => {
        let logoToDraw = defaultLogo;
        try {
            if (logoPath && fs.existsSync(logoPath)) { // Kiểm tra cả đường dẫn và sự tồn tại của file
                logoToDraw = await loadImage(logoPath);
            }
        } catch (e) {
            console.error(`Lỗi tải logo tùy chỉnh từ ${logoPath}, sử dụng logo mặc định: ${e.message}`);
        }
        ctx.drawImage(logoToDraw, x, y, size, size);
    };

    // --- Vẽ TOP 1 LỚN (Team hạng 1) ---
    if (rankedTeams.length > 0) {
        const team = rankedTeams[0];
        const cfg = layoutConfig.top1Large;
        // Kiểm tra xem team có logo riêng không, nếu không thì dùng defaultLogo
        await drawLogo(team.logo, cfg.logo.x, cfg.logo.y, cfg.logo.size);
        
        ctx.font = cfg.name.font;
        ctx.fillStyle = cfg.name.color;
        ctx.textAlign = cfg.name.textAlign;
        ctx.fillText(team.teamName.toUpperCase(), cfg.name.x, cfg.name.y);
        
        ctx.font = cfg.stats.font;
        ctx.fillStyle = cfg.stats.color;
        ctx.textAlign = cfg.stats.textAlign;
        ctx.fillText(String(team.elims || 0), cfg.stats.elimsX, cfg.stats.y);
        ctx.fillText(String(team.booyah || 0), cfg.stats.booyahX, cfg.stats.y);
        ctx.fillText(String(team.pts || 0), cfg.stats.ptsX, cfg.stats.y);
    }

    // --- Vẽ Bảng xếp hạng 1-12 (Không số thứ tự) ---
    const tableCfg = layoutConfig.leaderboardTable;
    for (let i = 0; i < 12; i++) {
        const team = rankedTeams[i];
        if (!team) continue;

        let colConfig, currentY;
        if (i < 6) { // Cột trái (Hạng 1-6)
            colConfig = tableCfg.leftColumn;
            currentY = tableCfg.startY + i * tableCfg.rowHeight;
        } else { // Cột phải (Hạng 7-12)
            colConfig = tableCfg.rightColumn;
            currentY = tableCfg.startY + (i - 6) * tableCfg.rowHeight;
        }

        // Vẽ logo, tên và chỉ số (bỏ số thứ tự)
        await drawLogo(team.logo, colConfig.logoX, currentY - tableCfg.logoSize / 2, tableCfg.logoSize);
        
        ctx.font = tableCfg.font.name;
        ctx.fillStyle = tableCfg.color;
        ctx.textAlign = 'left';
        ctx.fillText(team.teamName.toUpperCase(), colConfig.nameX, currentY);

        ctx.font = tableCfg.font.stats;
        ctx.textAlign = 'center';
        ctx.fillText(String(team.elims || 0), colConfig.elimsX, currentY);
        ctx.fillText(String(team.booyah || 0), colConfig.booyahX, currentY);
        ctx.fillText(String(team.pts || 0), colConfig.ptsX, currentY);
    }

    // --- Vẽ thông tin Booyah (có logo) ---
    const booyahCfg = layoutConfig.booyahInfo;
    ctx.font = booyahCfg.font;
    ctx.fillStyle = booyahCfg.color;
    ctx.textAlign = booyahCfg.textAlign;
    
    // Game 1
    await drawLogo(booyahWinners.game1.logo, booyahCfg.game1.logoX, booyahCfg.game1.logoY, booyahCfg.logoSize);
    ctx.fillText(booyahWinners.game1.name.toUpperCase(), booyahCfg.game1.textX, booyahCfg.game1.textY);
    // Game 2
    await drawLogo(booyahWinners.game2.logo, booyahCfg.game2.logoX, booyahCfg.game2.logoY, booyahCfg.logoSize);
    ctx.fillText(booyahWinners.game2.name.toUpperCase(), booyahCfg.game2.textX, booyahCfg.game2.textY);
    // Game 3
    await drawLogo(booyahWinners.game3.logo, booyahCfg.game3.logoX, booyahCfg.game3.logoY, booyahCfg.logoSize);
    ctx.fillText(booyahWinners.game3.name.toUpperCase(), booyahCfg.game3.textX, booyahCfg.game3.textY);
    // Game 4
    await drawLogo(booyahWinners.game4.logo, booyahCfg.game4.logoX, booyahCfg.game4.logoY, booyahCfg.logoSize);
    ctx.fillText(booyahWinners.game4.name.toUpperCase(), booyahCfg.game4.textX, booyahCfg.game4.textY);
    
    // --- Vẽ Footer ---
    const footerCfg = layoutConfig.footer;
    ctx.font = footerCfg.tournamentName.font;
    ctx.fillStyle = footerCfg.tournamentName.color;
    ctx.textAlign = footerCfg.tournamentName.textAlign;
    ctx.fillText(footerCfg.tournamentName.text, footerCfg.tournamentName.x, footerCfg.tournamentName.y);

    return canvas.toBuffer('image/png');
}

// --- CẤU TRÚC LỆNH ---
module.exports.config = {
    name: "ffe1",
    version: "2.1",
    hasPermssion: 0,
    credits: "Gemini (Layout Conan - No Rank Numbers)",
    description: "Tạo ảnh BXH FF theo layout Conan (không số thứ tự).",
    commandCategory: "Tạo ảnh",
    usages: "[Tên giải đấu]",
    cooldowns: 20
};

// --- HÀM TẢI TÀI NGUYÊN ---
module.exports.onLoad = async function() {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    
    const assets = [
        { url: "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf", path: "Prompt-Bold.ttf", family: "Prompt" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/RobotoSlab-Bold.ttf", path: "RobotoSlab-Bold.ttf", family: "RobotoSlab" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Prompt-BoldItalic.ttf", path: "Prompt-BoldItalic.ttf", family: "Prompt-BoldItalic" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Anton-Regular.ttf", path: "Anton-Regular.ttf", family: "Anton" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Teko-Bold.ttf", path: "Teko-Bold.ttf", family: "Teko" },
        { url: BACKGROUND_URL, path: BACKGROUND_FILENAME },
        { url: DEFAULT_LOGO_URL, path: DEFAULT_LOGO_FILENAME }
    ];
    
    console.log("Bắt đầu tải tài nguyên cho lệnh ffe1_conan (v2.1)...");
    for (const asset of assets) {
        const assetPath = path.join(cacheDir, asset.path || asset.filename);
        if (!fs.existsSync(assetPath)) {
            try {
                const { data } = await axios.get(asset.url, { responseType: 'arraybuffer' });
                fs.writeFileSync(assetPath, data);
            } catch (e) {
                console.error(`Lỗi khi tải ${asset.path || asset.filename}: ${e.message}`);
            }
        }
        if (asset.family) {
            try { registerFont(assetPath, { family: asset.family }); } catch (e) { console.error(`Lỗi đăng ký font: ${asset.family}.`, e); }
        }
    }
    console.log("Tài nguyên ffe1_conan (v2.1) đã sẵn sàng.");
    isAssetsReady = true;
};

// --- HÀM CHẠY LỆNH ---
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!isAssetsReady) {
        return api.sendMessage("⏳ Tài nguyên đang được tải về, vui lòng thử lại sau giây lát...", threadID, messageID);
    }

    const tournamentName = args.join(" ") || "CONAN FREE FIRE LEAGUE";

    try {
        api.sendMessage(`⏳ Đang khởi tạo bảng xếp hạng cho giải đấu "${tournamentName}"...`, threadID, messageID);

        // Tạo dữ liệu team mẫu (12 team)
        const teamNames = ["GHOST KILLER", "LEGEND SQUAD", "NO MERCY", "DARK HORSE", "THE CHAMPIONS", "SILENT HUNTER", "KING OF GAME", "UNITED FF", "ACE GAMING", "OMEGA TEAM", "VIP TEAM", "PRO SQUAD"];
        let rankedTeams = teamNames.map(name => ({
            teamName: name,
            pts: Math.floor(Math.random() * 100) + 20,
            elims: Math.floor(Math.random() * 40) + 10,
            booyah: Math.floor(Math.random() * 3),
            logo: null // Mặc định là null, sẽ dùng default_logo_conan.png
                      // Để dùng logo riêng, bạn có thể thay bằng 'path/to/your_team_logo.png'
        }));
        rankedTeams.sort((a, b) => b.pts - a.pts);

        // Tạo dữ liệu Booyah mẫu (bao gồm tên và logo)
        // Lấy logo của các team từ trong rankedTeams để đảm bảo đồng bộ
        const getTeamBooyahInfo = (teamRankIndex) => {
            if (rankedTeams[teamRankIndex]) {
                return {
                    name: rankedTeams[teamRankIndex].teamName,
                    logo: rankedTeams[teamRankIndex].logo // Lấy logo của team
                };
            }
            return { name: "UNKNOWN TEAM", logo: null };
        };

        const booyahWinners = {
            game1: getTeamBooyahInfo(2), // Team hạng 3 thắng game 1
            game2: getTeamBooyahInfo(0), // Team hạng 1 thắng game 2
            game3: getTeamBooyahInfo(4), // Team hạng 5 thắng game 3
            game4: getTeamBooyahInfo(1)  // Team hạng 2 thắng game 4
        };

        const backgroundCachePath = path.join(__dirname, 'cache', BACKGROUND_FILENAME);
        const imageBuffer = await createConanLeaderboard({
            rankedTeams,
            booyahWinners,
            tournamentName,
            cachePath: backgroundCachePath
        });
        
        const imagePath = path.join(__dirname, 'cache', `ffe_conan_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);

    } catch (err) {
        console.error("Lỗi chi tiết trong FFE Conan:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${err.message}.`, threadID, messageID);
    }
};