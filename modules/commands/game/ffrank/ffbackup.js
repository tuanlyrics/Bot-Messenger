/**
 * @name ffrank
 * @version 110.0 (Layout 5 Integrated)
 * @description Môi trường test với layout mới và các tính năng nâng cao.
 * @author D-Jukie & Gemini & Pcoder
 */

const { registerFont, createCanvas, loadImage } = require('canvas');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FFRANK_PATH = path.join(__dirname, 'ffrank');
const garenaApi = require(path.join(FFRANK_PATH, 'api.js'));
const canvasManager = require(path.join(FFRANK_PATH, 'canvas', 'canvas.js'));

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CUSTOM_TEAMS_FILE = path.join(FFRANK_PATH, 'custom_teams.json');

// PHẦN QUẢN LÝ BIỆT DANH VÀ DATA
const nicknameDataPath = path.join(__dirname, '..', 'payment', 'bank_nicknames.json');
const COST_PER_USE = 500; // Chi phí mỗi lần sử dụng

// Hàm đọc file data biệt danh
function readNicknameData() {
    if (!fs.existsSync(nicknameDataPath)) return {};
    try {
        const fileContent = fs.readFileSync(nicknameDataPath, 'utf-8');
        return fileContent ? JSON.parse(fileContent) : {};
    } catch (e) { return {}; }
}

// Hàm lưu file data biệt danh
function saveNicknameData(data) {
    const nicknameDir = path.dirname(nicknameDataPath);
    if (!fs.existsSync(nicknameDir)) {
        fs.mkdirSync(nicknameDir, { recursive: true });
    }
    fs.writeFileSync(nicknameDataPath, JSON.stringify(data, null, 2), 'utf-8');
}
// kết thúc

const BACKGROUNDS = {
    tet: { URL: 'https://files.catbox.moe/k1mhcr.png', FILENAME: 'background_tet.png' },
    xanh: { URL: 'https://files.catbox.moe/fvy3bp.png', FILENAME: 'background_xanh.png' },
    xam: { URL: 'https://files.catbox.moe/d3iexg.png', FILENAME: 'background_xam.png' },
    layout4k: { URL: 'https://files.catbox.moe/0xiftr.png', FILENAME: 'background_4k.png' },
    hong: { URL: 'https://files.catbox.moe/lyywfv.png', FILENAME: 'background_hong.png' }
};

const LAYOUT_DISPLAY_NAMES = {
    'canvas1': 'Layout Tết',
    'canvas2': 'Layout Xanh',
    'canvas3': 'Layout Xám',
    'canvas4': 'Layout Vàng Chanh',
    'canvas5': 'Layout Hồng 4K'
};

const DEFAULT_LOGO_URL = 'https://files.catbox.moe/9hkasw.png';
const DEFAULT_LOGO_FILENAME = 'default_logo.png';
const LOGO_MAPPING = { "PHOENIX": "https://files.catbox.moe/u9vaf7.png" };

module.exports.config = {
    name: "ffrank",
    version: "110.0 (Layout 5 Integrated)",
    hasPermssion: 0,
    credits: "D-Jukie & Gemini & Pcoder",
    description: "Test các tính năng ffrank với logo tùy chỉnh và các cải tiến.",
    commandCategory: "game",
    usages: "Gõ .ffrank help để xem chi tiết",
    cooldowns: 20
};

module.exports.onLoad = async function() {
    const cacheDir = path.join(FFRANK_PATH, "cache");
    const canvasDir = path.join(FFRANK_PATH, "canvas");
    for (const dir of [FFRANK_PATH, cacheDir, canvasDir]) { 
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); 
    }
    
    if (!fs.existsSync(CUSTOM_TEAMS_FILE)) {
        fs.writeFileSync(CUSTOM_TEAMS_FILE, JSON.stringify([]), 'utf-8');
    }
    
    global.client.ffrank_layouts = canvasManager.getLayouts();
    if (global.client.ffrank_layouts.length > 0) { console.log(`[FFRANK] Đã tìm thấy các layout: ${global.client.ffrank_layouts.join(', ')}`); }

    let assets = [
        { url: "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf", path: "Prompt-Bold.ttf", family: "Prompt" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/RobotoSlab-Bold.ttf", path: "RobotoSlab-Bold.ttf", family: "RobotoSlab" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Prompt-ExtraBoldItalic.ttf", path: "Prompt-ExtraBoldItalic.ttf", family: "PromptExtraBoldItalic" }
    ];
    
    for (const key in BACKGROUNDS) { assets.push({ url: BACKGROUNDS[key].URL, path: BACKGROUNDS[key].FILENAME }); }
    for (const teamKey in LOGO_MAPPING) { assets.push({ url: LOGO_MAPPING[teamKey], path: `logo_${teamKey.toLowerCase().replace(/ /g, '_')}.png` }); }
    assets.push({ url: DEFAULT_LOGO_URL, path: DEFAULT_LOGO_FILENAME });

    console.log(`[FFRANK] Bắt đầu tải tài nguyên...`);
    for (const asset of assets) {
        const assetPath = path.join(cacheDir, asset.path);
        if (!fs.existsSync(assetPath)) {
            try {
                const { data } = await axios.get(asset.url, { responseType: 'arraybuffer' });
                fs.writeFileSync(assetPath, data);
            } catch (e) { console.error(`[FFRANK] Lỗi khi tải ${asset.path}: ${e.message}`); }
        }
        if (asset.family) {
            try { registerFont(assetPath, { family: asset.family }); }
            catch (e) { console.error(`[FFRANK] Lỗi đăng ký font: ${asset.family}.`, e); }
        }
    }
    console.log(`[FFRANK] Tài nguyên sẵn sàng.`);
};

async function mainController(api, event, { accountId, customName, timeInfo, layoutName }) {
    const { threadID, messageID, senderID } = event;
    const { label, startTime, endTime } = timeInfo;
    const OVERLAP_THRESHOLD = 2;
    try {
        const cacheDir = path.join(FFRANK_PATH, 'cache');
        let backgroundFilename;
        if (layoutName === 'canvas1') { backgroundFilename = BACKGROUNDS.tet.FILENAME; } 
        else if (layoutName === 'canvas2') { backgroundFilename = BACKGROUNDS.xanh.FILENAME; } 
        else if (layoutName === 'canvas3') { backgroundFilename = BACKGROUNDS.xam.FILENAME; }
        else if (layoutName === 'canvas4') { backgroundFilename = BACKGROUNDS.layout4k.FILENAME; }
        else if (layoutName === 'canvas5') { backgroundFilename = BACKGROUNDS.hong.FILENAME; }
        else { backgroundFilename = BACKGROUNDS.tet.FILENAME; }
        
        const backgroundCachePath = path.join(cacheDir, backgroundFilename);
        
        api.sendMessage(`⏳ Đang tìm kiếm trận đấu...`, threadID, messageID);
        const foundMatches = await garenaApi.findMatches(accountId, startTime, endTime);
        if (!foundMatches || foundMatches.length === 0) return api.sendMessage(`ℹ️ Không tìm thấy trận đấu trong khung giờ ${label}.`, threadID, messageID);
        
        const uniqueMatchIds = [...new Set(foundMatches.map(match => match.id))];
        api.sendMessage(`✅ Tìm thấy ${uniqueMatchIds.length} trận đấu hợp lệ. Đang tổng hợp...`, threadID, messageID);
        
        const allMatches = await garenaApi.getMatchDetails(uniqueMatchIds);
        if (allMatches.length === 0) return api.sendMessage("❌ Lỗi: Không thể lấy dữ liệu chi tiết.", threadID, messageID);

        const teamStats = new Map();
        const myTeamKey = `PLAYER_${accountId}`;
        teamStats.set(myTeamKey, { isMyTeam: true, ownerId: accountId, playerIds: new Set([accountId]), names: new Set(), teamName: null, totalScore: 0, totalKills: 0, totalBooyahs: 0 });
        for (const match of allMatches) {
            const myTeamInMatch = match.ranks.find(team => (team.playerAccountIds || []).some(id => accountId.startsWith(id.slice(0, -2))));
            if (myTeamInMatch) {
                const stats = teamStats.get(myTeamKey);
                stats.totalScore += Number(myTeamInMatch.score) || 0;
                stats.totalKills += Number(myTeamInMatch.kill) || 0;
                stats.totalBooyahs += Number(myTeamInMatch.booyah) || 0;
                myTeamInMatch.playerAccountIds.forEach(id => stats.playerIds.add(id));
                myTeamInMatch.accountNames.forEach(name => stats.names.add(name));
                if (myTeamInMatch.teamName) stats.teamName = myTeamInMatch.teamName;
            }
            for (const currentTeam of match.ranks) {
                const currentTeamIds = new Set(currentTeam.playerAccountIds || []);
                if (currentTeamIds.size === 0 || [...currentTeamIds].some(id => accountId.startsWith(id.slice(0, -2)))) continue;
                let foundKey = null;
                if (currentTeam.teamName) { for (const [key, stats] of teamStats.entries()) { if (stats.teamName === currentTeam.teamName && !stats.isMyTeam) { foundKey = key; break; } } }
                if (!foundKey) {
                    let bestMatchKey = null, maxOverlap = 0;
                    for (const [key, stats] of teamStats.entries()) {
                        if (stats.isMyTeam) continue;
                        const overlap = [...currentTeamIds].filter(id => stats.playerIds.has(id)).length;
                        if (overlap >= OVERLAP_THRESHOLD && overlap > maxOverlap) { maxOverlap = overlap; bestMatchKey = key; }
                    }
                    if (bestMatchKey) foundKey = bestMatchKey;
                }
                if (foundKey) {
                    const stats = teamStats.get(foundKey);
                    stats.totalScore += Number(currentTeam.score) || 0;
                    stats.totalKills += Number(currentTeam.kill) || 0;
                    stats.totalBooyahs += Number(currentTeam.booyah) || 0;
                    currentTeam.playerAccountIds.forEach(id => stats.playerIds.add(id));
                    currentTeam.accountNames.forEach(name => stats.names.add(name));
                } else {
                    const newKey = currentTeam.teamName || (currentTeam.playerAccountIds || []).sort().join(',');
                    if (!teamStats.has(newKey)) {
                        teamStats.set(newKey, { isMyTeam: false, playerIds: new Set(currentTeam.playerAccountIds), names: new Set(currentTeam.accountNames), teamName: currentTeam.teamName, totalScore: Number(currentTeam.score) || 0, totalKills: Number(currentTeam.kill) || 0, totalBooyahs: Number(currentTeam.booyah) || 0 });
                    } else {
                        const stats = teamStats.get(newKey);
                        stats.totalScore += Number(currentTeam.score) || 0;
                        stats.totalKills += Number(currentTeam.kill) || 0;
                        stats.totalBooyahs += Number(currentTeam.booyah) || 0;
                    }
                }
            }
        }
        
        const finalTeams = Array.from(teamStats.values()).map(stats => ({ ...stats, names: Array.from(stats.names), playerIds: Array.from(stats.playerIds) }));
        const myFinalStats = finalTeams.find(team => team.isMyTeam);
        if (myFinalStats && !myFinalStats.teamName && myFinalStats.names.length > 0) {
            myFinalStats.teamName = myFinalStats.names[Math.floor(Math.random() * myFinalStats.names.length)];
        }
        
        let rankedTeams = finalTeams.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0) || (b.totalBooyahs || 0) - (a.totalBooyahs || 0) || (b.totalKills || 0) - (a.totalKills || 0));
        
        const customTeams = JSON.parse(fs.readFileSync(CUSTOM_TEAMS_FILE, 'utf-8'));
        rankedTeams = rankedTeams.map(team => {
            for (const custom of customTeams) {
                const matchCount = custom.playerIds.filter(customId => 
                    [...team.playerIds].some(garenaId => customId.startsWith(garenaId.slice(0, -2)))
                ).length;
                if (matchCount > 0 && matchCount >= custom.playerIds.length) {
                    team.teamName = custom.teamName;
                    team.logoPath = custom.logoPath;
                    break;
                }
            }
            return team;
        });

        const defaultLogoPath = path.join(cacheDir, DEFAULT_LOGO_FILENAME);
        rankedTeams = rankedTeams.map(team => {
            if (!team.logoPath) {
                const teamNameUpper = (team.teamName || "").toUpperCase();
                let foundLogo = false;
                for (const key in LOGO_MAPPING) {
                    if (teamNameUpper.includes(key)) {
                        team.logoPath = path.join(cacheDir, `logo_${key.toLowerCase().replace(/ /g, '_')}.png`);
                        foundLogo = true;
                        break;
                    }
                }
                if (!foundLogo) {
                    team.logoPath = defaultLogoPath;
                }
            }
            return team;
        });

        const topTeamsByGame = [];
        for (let i = 0; i < Math.min(allMatches.length, 5); i++) {
            const gameRanks = allMatches[i]?.ranks;
            if (gameRanks && gameRanks.length > 0) {
                const top1TeamData = [...gameRanks].sort((a,b) => b.score - a.score)[0];
                let winnerName = top1TeamData.teamName || (top1TeamData.accountNames || [])[0] || "N/A";
                let winnerLogoPath = defaultLogoPath;
                let customMatchFound = false;

                for (const custom of customTeams) {
                    const matchCount = custom.playerIds.filter(customId => 
                        (top1TeamData.playerAccountIds || []).some(garenaId => customId.startsWith(garenaId.slice(0, -2)))
                    ).length;
                    if (matchCount > 0 && matchCount >= custom.playerIds.length) {
                        winnerName = custom.teamName;
                        winnerLogoPath = custom.logoPath;
                        customMatchFound = true;
                        break;
                    }
                }

                if (!customMatchFound) {
                    const winnerNameUpper = winnerName.toUpperCase();
                     for (const key in LOGO_MAPPING) {
                        if (winnerNameUpper.includes(key)) {
                            winnerLogoPath = path.join(cacheDir, `logo_${key.toLowerCase().replace(/ /g, '_')}.png`);
                            break;
                        }
                    }
                }
                topTeamsByGame.push({ name: winnerName, logoPath: winnerLogoPath });
            } else {
                topTeamsByGame.push({ name: "N/A", logoPath: defaultLogoPath });
            }
        }

        if (!fs.existsSync(backgroundCachePath)) throw new Error(`Không tìm thấy ảnh nền: ${backgroundFilename}`);
        const background = await loadImage(backgroundCachePath);
        const canvas = createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        
        const imageBuffer = await canvasManager.renderLayout(layoutName, {
            canvas, ctx, rankedTeams, topTeamsByGame,
            timeRange: `${label} | Ngày ${moment().format('DD/MM')}`,
            selectedTimeLabel: label,
            customName: customName,
            customDate: startTime.format('DD/MM'),
            customTime: startTime.format('HH:mm')
        });
        
        const imagePath = path.join(FFRANK_PATH, 'cache', `ff_final_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        
        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, async (err, info) => {
            fs.unlinkSync(imagePath);
            if (err) return console.error("[FF] Lỗi khi gửi ảnh kết quả:", err);

            // Nếu gửi ảnh thành công, tiến hành trừ tiền và cập nhật biệt danh
            try {
                const nicknames = readNicknameData();
                const currentBalance = nicknames[senderID] || 0;
                const newBalance = currentBalance - COST_PER_USE;

                nicknames[senderID] = newBalance;
                saveNicknameData(nicknames);

                const userInfo = await api.getUserInfo(senderID);
                const originalSenderName = (userInfo && userInfo[senderID]) ? userInfo[senderID].name : `User ${senderID}`;

                const newNickname = `${originalSenderName} - ${newBalance.toLocaleString('vi-VN')}đ`;
                api.changeNickname(newNickname, threadID, senderID, (nickErr) => {
                    const message = nickErr 
                        ? `⚠️ Đã trừ ${COST_PER_USE.toLocaleString('vi-VN')}đ. Không thể đổi biệt danh của bạn.`
                        : `✅ Đã trừ ${COST_PER_USE.toLocaleString('vi-VN')}đ. Số dư còn lại: ${newBalance.toLocaleString('vi-VN')}đ.`;
                    api.sendMessage(message, threadID);
                });
            } catch (e) {
                console.error("[FF] Lỗi khi trừ tiền:", e);
                api.sendMessage("⚠️ Có lỗi xảy ra trong quá trình trừ tiền.", threadID);
            }
        }, messageID);

    } catch (err) {
        console.error("Lỗi chi tiết trong FF:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${err.message}.`, threadID, messageID);
    }
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    
     // ===== KIỂM TRA SỐ DƯ NGƯỜI DÙNG =====
    const nicknames = readNicknameData();
    const currentBalance = nicknames[senderID] || 0;

    if (currentBalance < COST_PER_USE) {
        return api.sendMessage(
            `⚠️ Số dư của bạn không đủ để sử dụng lệnh này.\n` +
            `- Số dư hiện tại: ${currentBalance.toLocaleString('vi-VN')}đ\n` +
            `- Chi phí yêu cầu: ${COST_PER_USE.toLocaleString('vi-VN')}đ\n\n` +
            `👉 Vui lòng dùng lệnh .bankqr để nạp thêm.`,
            threadID, messageID
        );
    }
    // =====================================

if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
    const helpMessage = `
📌 HƯỚNG DẪN SỬ DỤNG LỆNH .ffrank

───────────────
🏆 1. TẠO BẢNG XẾP HẠNG

• Dạng đơn giản:
  .ffrank [ID] [Tên (tùy chọn)]  
  ▶️ Ví dụ: .ffrank 12345678 Pcoder

• Dạng chọn giờ thủ công:
  .ffrank [ID] [Tên] [Từ ngày] [Giờ] [Đến ngày] [Giờ]  
  ▶️ Ví dụ:  
  .ffrank 12345678 Pcoder 21/07/2025 20:00 21/07/2025 21:30

───────────────
🖼️ 2. QUẢN LÝ LOGO TEAM

• Set logo:
  Gửi ảnh vào nhóm ➜ Reply ảnh đó với:  
  .ffrank set logo [Tên team] [ID_1] [ID_2] ...

  ▶️ Ví dụ:  
  .ffrank set logo KingOfWar | 12345 67890

• Xoá logo:
  .ffrank delete logo [Tên team]  
  ▶️ Ví dụ:  
  .ffrank delete logo KingOfWar

• Xem danh sách logo:
  .ffrank list logo

───────────────
👨‍💻 Dev: Pcoder | 🛡️ Team SPN
    `;
    return api.sendMessage(helpMessage, threadID, messageID);
}

if (args[0]?.toLowerCase() === 'set' && args[1]?.toLowerCase() === 'logo') {
    if (event.type !== "message_reply" || !event.messageReply.attachments || event.messageReply.attachments[0].type !== "photo") {
        return api.sendMessage("⚠️ Vui lòng reply một ảnh logo để sử dụng lệnh này.", threadID, messageID);
    }

    // Gộp lại phần sau 'logo' thành 1 chuỗi để xử lý tên team và ID
    const fullArgs = args.slice(2).join(" ");

    // Tách phần tên team và ID bằng các dấu `. | / -` (lấy phần trước dấu đầu tiên là tên team)
    const match = fullArgs.match(/^(.+?)\s*[\.\|\/-]\s*(.+)$/);
    if (!match) {
        return api.sendMessage("⚠️ Cú pháp sai.\nDùng: .ffrank set logo [Tên team] .|/|-[ID1][ID2]...\nVí dụ: .ffrank set logo King Of War | 12345 67890", threadID, messageID);
    }

    const teamName = match[1].trim();
    const idPart = match[2].trim();

    // Tách ID bằng khoảng trắng, lọc các ID hợp lệ (tối đa 4 ID)
    const playerIds = idPart.split(/\s+/).filter(id => id.match(/^\d+$/)).slice(0, 4);

    if (!teamName || playerIds.length === 0) {
        return api.sendMessage("⚠️ Bạn cần nhập tên team và ít nhất 1 ID thành viên.", threadID, messageID);
    }

    // Lưu logo
    const logoUrl = event.messageReply.attachments[0].url;
    const cacheDir = path.join(FFRANK_PATH, 'cache');
    const logoPath = path.join(cacheDir, `custom_logo_${teamName.replace(/ /g, '_')}.png`);

    try {
        const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(logoPath, response.data);

        const customTeams = JSON.parse(fs.readFileSync(CUSTOM_TEAMS_FILE, 'utf-8'));
        const existingTeamIndex = customTeams.findIndex(t => t.teamName.toLowerCase() === teamName.toLowerCase());

        const newTeamData = { teamName, playerIds, logoPath };
        if (existingTeamIndex > -1) customTeams[existingTeamIndex] = newTeamData;
        else customTeams.push(newTeamData);

        fs.writeFileSync(CUSTOM_TEAMS_FILE, JSON.stringify(customTeams, null, 4), 'utf-8');
        return api.sendMessage(`✅ Đã lưu logo cho team "${teamName}" với ${playerIds.length} thành viên.`, threadID, messageID);
    } catch (e) {
        console.error("❌ Lỗi khi lưu logo:", e);
        return api.sendMessage("❌ Có lỗi xảy ra khi lưu logo. Vui lòng thử lại sau.", threadID, messageID);
    }
}


    if (args[0]?.toLowerCase() === 'delete' && args[1]?.toLowerCase() === 'logo') {
        const teamNameToDelete = args.slice(2).join(" ");
        if (!teamNameToDelete) {
            return api.sendMessage("⚠️ Cú pháp sai. Dùng: ffrank delete logo [Tên Team]", threadID, messageID);
        }
        try {
            let customTeams = JSON.parse(fs.readFileSync(CUSTOM_TEAMS_FILE, 'utf-8'));
            const teamIndex = customTeams.findIndex(t => t.teamName.toLowerCase() === teamNameToDelete.toLowerCase());
            if (teamIndex === -1) {
                return api.sendMessage(`ℹ️ Không tìm thấy team nào có tên "${teamNameToDelete}".`, threadID, messageID);
            }
            const teamToDelete = customTeams[teamIndex];
            if (fs.existsSync(teamToDelete.logoPath)) {
                fs.unlinkSync(teamToDelete.logoPath);
            }
            customTeams.splice(teamIndex, 1);
            fs.writeFileSync(CUSTOM_TEAMS_FILE, JSON.stringify(customTeams, null, 4), 'utf-8');
            return api.sendMessage(`✅ Đã xóa thành công logo và thông tin của team "${teamToDelete.teamName}".`, threadID, messageID);
        } catch (e) {
            console.error("Lỗi khi xóa logo:", e);
            return api.sendMessage("❌ Đã xảy ra lỗi khi xóa logo.", threadID, messageID);
        }
    }

    if (args[0]?.toLowerCase() === 'list' && args[1]?.toLowerCase() === 'logo') {
        try {
            const customTeams = JSON.parse(fs.readFileSync(CUSTOM_TEAMS_FILE, 'utf-8'));
            if (customTeams.length === 0) {
                return api.sendMessage("ℹ️ Chưa có team nào được set logo.", threadID, messageID);
            }
            let msg = "📜 DANH SÁCH CÁC TEAM ĐÃ SET LOGO:\n\n";
            customTeams.forEach((team, index) => {
                msg += `${index + 1}. Tên Team: ${team.teamName}\n   - IDs: ${team.playerIds.join(', ')}\n\n`;
            });
            return api.sendMessage(msg, threadID, messageID);
        } catch (e) {
            console.error("Lỗi khi list logo:", e);
            return api.sendMessage("❌ Đã xảy ra lỗi khi đọc danh sách logo.", threadID, messageID);
        }
    }

    if (args.length < 1 || !/^\d+$/.test(args[0])) {
        return api.sendMessage("⚠️ Cú pháp không hợp lệ. Vui lòng nhập ít nhất là Account ID.", threadID, messageID);
    }

    const accountId = args[0];

    let timeStartIndex = -1;
    for (let i = 1; i < args.length; i++) {
        if (moment(args[i], "DD/MM/YYYY", true).isValid()) {
            timeStartIndex = i;
            break;
        }
    }

    let customName = "";
    let timeInfo;

    if (timeStartIndex !== -1) {
        customName = args.slice(1, timeStartIndex).join(' ');
        const timeArgs = args.slice(timeStartIndex);
        
        if (timeArgs.length !== 4) {
            return api.sendMessage("⚠️ Cú pháp thời gian không hợp lệ. Cần: [dd/mm/yyyy] [hh:mm] [dd/mm/yyyy] [hh:mm]", threadID, messageID);
        }

        const format = "DD/MM/YYYY HH:mm";
        const startTimeStr = `${timeArgs[0]} ${timeArgs[1]}`;
        const endTimeStr = `${timeArgs[2]} ${timeArgs[3]}`;
        const startTime = moment.tz(startTimeStr, format, true, TIME_ZONE);
        const endTime = moment.tz(endTimeStr, format, true, TIME_ZONE);

        if (!startTime.isValid() || !endTime.isValid()) {
            return api.sendMessage(`⚠️ Định dạng thời gian không hợp lệ. Vui lòng dùng: \`dd/mm/yyyy hh:mm\`.`, threadID, messageID);
        }
        if (startTime.isAfter(endTime)) {
            return api.sendMessage("⚠️ Thời gian bắt đầu không được sau thời gian kết thúc.", threadID, messageID);
        }
        timeInfo = { label: `Tùy Chỉnh`, startTime, endTime };
    } 
    else {
        customName = args.slice(1).join(' ');
    }

    const layouts = global.client.ffrank_layouts;
    if (!layouts || layouts.length === 0) return api.sendMessage("❌ Lỗi: Không tìm thấy file layout.", threadID, messageID);
    
    let layoutMessage = `🎨 Vui lòng chọn một mẫu layout cho ID: **${accountId}**\n\n`;
    layouts.forEach((layout, index) => { 
        layoutMessage += `${index + 1}. ${LAYOUT_DISPLAY_NAMES[layout] || layout}\n`;
    });
    layoutMessage += "\n👉 Phản hồi tin nhắn này bằng số tương ứng.";

    return api.sendMessage(layoutMessage, threadID, (err, info) => {
        if (err) return console.error(err);
        global.client.handleReply.push({ 
            name: this.config.name, 
            messageID: info.messageID, 
            author: senderID, 
            accountId, 
            customName, 
            timeInfo,
            type: 'choose_layout' 
        });
    }, messageID);
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { author, accountId, customName, timeInfo, type } = handleReply;
    if (event.senderID !== author) return;

    const choice = parseInt(event.body);
    api.unsendMessage(handleReply.messageID).catch(console.error);

    if (type === 'choose_layout') {
        const layouts = global.client.ffrank_layouts;
        if (isNaN(choice) || choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ Lựa chọn layout không hợp lệ.", event.threadID, event.messageID);
        const selectedLayout = layouts[choice - 1];

        if (timeInfo) {
            return mainController(api, event, { accountId, customName, timeInfo, layoutName: selectedLayout });
        }

        const timeSlots = [ { label: "00:00 ➔ 02:00", start: { h: 0, m: 0 }, end: { h: 2, m: 0 } }, { label: "02:00 ➔ 04:00", start: { h: 2, m: 0 }, end: { h: 4, m: 0 } }, { label: "04:00 ➔ 06:00", start: { h: 4, m: 0 }, end: { h: 6, m: 0 } }, { label: "06:00 ➔ 08:00", start: { h: 6, m: 0 }, end: { h: 8, m: 0 } }, { label: "08:00 ➔ 10:00", start: { h: 8, m: 0 }, end: { h: 10, m: 0 } }, { label: "10:00 ➔ 12:00", start: { h: 10, m: 0 }, end: { h: 12, m: 0 } }, { label: "12:00 ➔ 14:00", start: { h: 12, m: 0 }, end: { h: 14, m: 0 } }, { label: "14:00 ➔ 16:00", start: { h: 14, m: 0 }, end: { h: 16, m: 0 } }, { label: "16:00 ➔ 18:00", start: { h: 16, m: 0 }, end: { h: 18, m: 0 } }, { label: "18:00 ➔ 20:00", start: { h: 18, m: 0 }, end: { h: 20, m: 0 } }, { label: "20:00 ➔ 21:30 (GV)", start: { h: 20, m: 0 }, end: { h: 21, m: 30 } }, { label: "21:30 ➔ 23:00 (GV)", start: { h: 21, m: 30 }, end: { h: 23, m: 0 } }, { label: "22:00 ➔ 00:00 (HS)", start: { h: 22, m: 0 }, end: { h: 0, m: 0 }, nextDay: true }, { label: "Cả Ngày Hôm Nay", start: { h: 0, m: 0 }, end: { h: 23, m: 59 } } ];
        let replyMessage = `🎨 Layout: **${LAYOUT_DISPLAY_NAMES[selectedLayout] || selectedLayout}**\n📊 Vui lòng chọn khung giờ:\n\n`;
        timeSlots.forEach((slot, index) => { replyMessage += `${index + 1}. ${slot.label}\n`; });
        replyMessage += "\n👉 Phản hồi bằng số tương ứng.";
        
        return api.sendMessage(replyMessage, event.threadID, (err, info) => {
            if (err) return console.error(err);
            global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, accountId, customName, layoutName: selectedLayout, timeSlots, type: 'choose_time' });
        }, event.messageID);
    }

    if (type === 'choose_time') {
        const { layoutName, timeSlots } = handleReply;
        if (isNaN(choice) || choice < 1 || choice > timeSlots.length) return api.sendMessage("⚠️ Lựa chọn khung giờ không hợp lệ.", event.threadID, event.messageID);
        const selectedSlot = timeSlots[choice - 1];
        const startTime = moment().tz(TIME_ZONE).hour(selectedSlot.start.h).minute(selectedSlot.start.m).second(0);
        const endTime = moment().tz(TIME_ZONE).hour(selectedSlot.end.h).minute(selectedSlot.end.m).second(0);
        if (selectedSlot.nextDay) {
            if (moment().tz(TIME_ZONE).hour() < selectedSlot.start.h) startTime.subtract(1, 'day');
            endTime.add(1, 'day');
        }
        const newTimeInfo = { label: selectedSlot.label, startTime, endTime };
        return mainController(api, event, { accountId, customName, timeInfo: newTimeInfo, layoutName });
    }
};