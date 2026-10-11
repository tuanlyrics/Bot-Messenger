/**
 * @name ffrank
 * @version 121.3 (Team Logo/ApiKey/Batch & 24h Auto-Delete, menu/thủ công)
 * @description Tạo BXH FF với hệ thống thanh toán, logo tự xóa sau 24h, hỗ trợ set logo đội, apikey, ưu tiên team logo, chọn giờ menu hoặc thủ công.
 * @author D-Jukie & Gemini & Pcoder & Kenne400k2
 */

const { registerFont, createCanvas, loadImage } = require('canvas');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ----- ĐƯỜNG DẪN FILE -----
const approvedThreadsPath = path.join(__dirname, '..', '..', '..', 'pdata', 'approvedThreads.json');
const FFRANK_PATH = path.join(__dirname, 'ffrank');
const DATA_PATH = path.join(__dirname, 'dataff');
const CACHE_PATH = path.join(FFRANK_PATH, 'cache');
const LOGOS_PATH = path.join(FFRANK_PATH, 'logos');
const USAGE_FILE = path.join(DATA_PATH, 'usage.json');
const LOGO_TIMESTAMPS_PATH = path.join(DATA_PATH, 'logo_timestamps.json');
const nicknameDataPath = path.join(__dirname, '..', 'payment', 'bank_nicknames.json');
const LOGOALL_PATH = path.join(FFRANK_PATH, 'logoall.json');
const CUSTOM_TEAM_FILE = path.join(FFRANK_PATH, 'custom_team.json');

const garenaApi = require(path.join(FFRANK_PATH, 'api.js'));
const canvasManager = require(path.join(FFRANK_PATH, 'canvas', 'canvas.js'));
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// ----- CẤU HÌNH GIÁ -----
const FREE_USES_PER_DAY = 0;
const WEEKLY_COST = 20000;
const MONTHLY_COST = 70000;
const COST_PER_USE = 300;

// ----- BACKGROUND & LOGO -----
const BACKGROUNDS = {
    tet: { URL: 'https://files.catbox.moe/k1mhcr.png', FILENAME: 'background_tet.png' },
    xanh: { URL: 'https://files.catbox.moe/fvy3bp.png', FILENAME: 'background_xanh.png' },
    xam: { URL: 'https://files.catbox.moe/d3iexg.png', FILENAME: 'background_xam.png' },
    layout4k: { URL: 'https://files.catbox.moe/0xiftr.png', FILENAME: 'background_4k.png' },
    hong: { URL: 'https://files.catbox.moe/m9avwb.png', FILENAME: 'background_hong.png' },
    hellokitty: { URL: 'https://files.catbox.moe/zr9scf.png', FILENAME: 'background_hellokitty.png' },
    standings: { URL: 'https://files.catbox.moe/v4fzhy.png', FILENAME: 'background_standings_ffe.png' },
    standings_left: { URL: 'https://files.catbox.moe/egddzp.png', FILENAME: 'background_standings_ffe_new.png' },
    standings2: { URL: 'https://files.catbox.moe/81zlkl.png', FILENAME: 'background_standings_2.png' },
    overall: { URL: 'https://files.catbox.moe/fv0n9y.png', FILENAME: 'background_overall.png' },
    dcqb: { URL: 'https://files.catbox.moe/bmtzve.png', FILENAME: 'background_dcqb.png' },
    spn: { URL: 'https://files.catbox.moe/rbcfdv.png', FILENAME: 'background_spnscrim1.png' },
    khaixuangiaochien: { URL: 'https://files.catbox.moe/dlq42l.png', FILENAME: 'background_khaixuangiaochien.png' },
    vongbang: { URL: 'https://files.catbox.moe/og3nts.png', FILENAME: 'background_vongbang.png' },
    ffws: { URL: 'https://files.catbox.moe/drajs7.png', FILENAME: 'background_ffws.png' }
};
const LAYOUT_DISPLAY_NAMES = {
    'canvas1': 'Layout Tết',
    'canvas2': 'Layout Xanh',
    'canvas3': 'Layout Xám',
    'canvas4': 'Layout Vàng Chanh',
    'canvas5': 'Layout Hồng 4K',
    'canvas_hellokitty': 'Layout Hello Kitty',
    'canvas_standings': 'Layout Standings (Phải)',
    'canvas_standings_left': 'Layout Standings (Trái)',
    'canvas_standings_2': 'Layout Standings 2',
    'canvas_overall': 'Layout OverAll',
    'canvas_dcqb': 'Layout DCQB',
    'canvas_spn': 'Layout SPN SCRIM',
    'canvas_khaixuangiaochien': 'Layout Khai Xuân Giao Chiến',
    'canvas_vongbang': 'Layout Vòng Bảng Scim',
    'canvas_ffws': 'Layout ffws'
};
const DEFAULT_LOGO_URL = 'https://files.catbox.moe/9hkasw.png';
const DEFAULT_LOGO_FILENAME = 'default_logo.png';

// ===== FILE UTILS =====
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function readUsageData() { try { return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')); } catch { return { threads: {}, users: {} }; } }
function saveUsageData(data) { fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 4), 'utf-8'); }
function readNicknameData() { try { return JSON.parse(fs.readFileSync(nicknameDataPath, 'utf-8')); } catch { return {}; } }
function saveNicknameData(data) { fs.writeFileSync(nicknameDataPath, JSON.stringify(data, null, 2), 'utf-8'); }
function readLogoTimestamps() { try { return JSON.parse(fs.readFileSync(LOGO_TIMESTAMPS_PATH, 'utf-8')); } catch { return {}; } }
function saveLogoTimestamps(data) { fs.writeFileSync(LOGO_TIMESTAMPS_PATH, JSON.stringify(data, null, 4), 'utf-8'); }
function readLogoAll() { try { return JSON.parse(fs.readFileSync(LOGOALL_PATH, 'utf-8')); } catch { return []; } }
function saveLogoAll(arr) { fs.writeFileSync(LOGOALL_PATH, JSON.stringify(arr, null, 2), 'utf-8'); }

// TEAM LOGO (custom_team.json)
function readCustomTeamList() { try { if (!fs.existsSync(CUSTOM_TEAM_FILE)) return []; return JSON.parse(fs.readFileSync(CUSTOM_TEAM_FILE, 'utf-8')); } catch { return []; } }
function saveCustomTeamList(arr) { fs.writeFileSync(CUSTOM_TEAM_FILE, JSON.stringify(arr, null, 2), 'utf-8'); }
function getTeamLogoMapFromCustomFile() { const arr = readCustomTeamList(); const obj = {}; for (const t of arr) obj[t.teamName] = t.logoPath; return obj; }
async function cleanupExpiredLogos() {
    let arr = readCustomTeamList();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    let changed = false;
    arr = arr.filter(t => {
        if (t.createdAt && (now - t.createdAt > twentyFourHours)) {
            if (t.logoPath && fs.existsSync(t.logoPath)) { try { fs.unlinkSync(t.logoPath); } catch (e) {} }
            changed = true;
            return false;
        }
        return true;
    });
    if (changed) saveCustomTeamList(arr);
}

// ===== XOÁ LOGO HẾT HẠN =====
async function cleanupExpiredLogos() {
    const timestamps = readLogoTimestamps();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    let updatedTimestamps = {};
    let changed = false;

    // Xóa team logo
    if (fs.existsSync(LOGOS_PATH)) {
        for (const file of fs.readdirSync(LOGOS_PATH)) {
            const logoName = file.replace('.png', '');
            const createdAt = timestamps[logoName];
            if (createdAt && now - createdAt > twentyFourHours) {
                fs.unlinkSync(path.join(LOGOS_PATH, file));
                changed = true;
            } else if (createdAt) {
                updatedTimestamps[logoName] = createdAt;
            }
        }
    }
    // Xóa cache logo
    for (const logoName in timestamps) {
        if (!updatedTimestamps[logoName]) {
            const logoPath = path.join(CACHE_PATH, `${logoName}.png`);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
                changed = true;
            }
        }
    }
    if (changed || Object.keys(timestamps).length !== Object.keys(updatedTimestamps).length) {
        saveLogoTimestamps(updatedTimestamps);
    }
}

// ===== MODULE CONFIG =====
module.exports.config = {
    name: "fft",
    version: "121.3 (Team Logo/ApiKey/Batch & 24h Auto-Delete, menu/thủ công)",
    hasPermssion: 0,
    credits: "Pcoder & Gemini & Kenne400k2",
    description: "Tạo BXH FF với logo đội (set/list/del), apikey logo, tự xóa sau 24h.",
    commandCategory: "game",
    usages: "Xem .ffrank help",
    cooldowns: 5
};

// ===== INIT =====
module.exports.onLoad = async function() {
    for (const dir of [FFRANK_PATH, DATA_PATH, CACHE_PATH, LOGOS_PATH]) ensureDir(dir);
    if (!fs.existsSync(USAGE_FILE)) saveUsageData({ threads: {}, users: {} });
    if (!fs.existsSync(LOGO_TIMESTAMPS_PATH)) saveLogoTimestamps({});
    if (!fs.existsSync(LOGOALL_PATH)) saveLogoAll([]);
    await cleanupExpiredLogos();

    global.client.ffrank_layouts = canvasManager.getLayouts();
    let assets = [
        { url: "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf", path: "Prompt-Bold.ttf", family: "Prompt" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/RobotoSlab-Bold.ttf", path: "RobotoSlab-Bold.ttf", family: "RobotoSlab" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Prompt-BoldItalic.ttf", path: "Prompt-BoldItalic.ttf", family: "Prompt-BoldItalic" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Anton-Regular.ttf", path: "Anton-Regular.ttf", family: "Anton" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Prompt-ExtraBoldItalic.ttf", path: "Prompt-ExtraBoldItalic.ttf", family: "PromptExtraBoldItalic" },
        { url: "https://github.com/Kenne400k/commands/raw/refs/heads/main/Teko-Bold.ttf", path: "Teko-Bold.ttf", family: "teko" }
    ];
    for (const key in BACKGROUNDS) { assets.push({ url: BACKGROUNDS[key].URL, path: BACKGROUNDS[key].FILENAME }); }
    assets.push({ url: DEFAULT_LOGO_URL, path: DEFAULT_LOGO_FILENAME });

    for (const asset of assets) {
        const assetPath = path.join(CACHE_PATH, asset.path);
        if (!fs.existsSync(assetPath)) {
            try {
                const { data } = await axios.get(asset.url, { responseType: 'arraybuffer' });
                fs.writeFileSync(assetPath, data);
            } catch (e) {}
        }
        if (asset.family) try { registerFont(assetPath, { family: asset.family }); } catch (e) {}
    }
};
// ===== MAIN CONTROLLER =====
async function mainController(api, event, { accountId, customName, logoName, timeInfo, layoutName, apikey, teamLogoMap }) {
    const { threadID, senderID, messageID } = event;

    try {
        let requestedLogoPath;
        if (teamLogoMap && teamLogoMap[logoName]) {
            requestedLogoPath = teamLogoMap[logoName];
        } else if (apikey) {
            let logoAll = readLogoAll();
            const entry = logoAll.find(e => e.apiKey === apikey);
            if (entry && entry.logoPath && fs.existsSync(entry.logoPath)) {
                requestedLogoPath = entry.logoPath;
            }
        }
        if (!requestedLogoPath) {
            requestedLogoPath = path.join(CACHE_PATH, DEFAULT_LOGO_FILENAME);
        }
        
        const { label, startTime, endTime } = timeInfo;
        const OVERLAP_THRESHOLD = 2;
        let backgroundFilename = BACKGROUNDS.tet.FILENAME;
        const layoutMapping = {
            'canvas1': BACKGROUNDS.tet.FILENAME,
            'canvas2': BACKGROUNDS.xanh.FILENAME,
            'canvas3': BACKGROUNDS.xam.FILENAME,
            'canvas4': BACKGROUNDS.layout4k.FILENAME,
            'canvas5': BACKGROUNDS.hong.FILENAME,
            'canvas_hellokitty': BACKGROUNDS.hellokitty.FILENAME,
            'canvas_standings': BACKGROUNDS.standings.FILENAME,
            'canvas_standings_left': BACKGROUNDS.standings_left.FILENAME,
            'canvas_standings_2': BACKGROUNDS.standings2.FILENAME,
            'canvas_overall': BACKGROUNDS.overall.FILENAME,
            'canvas_dcqb': BACKGROUNDS.dcqb.FILENAME,
            'canvas_spn': BACKGROUNDS.spn.FILENAME,
            'canvas_khaixuangiaochien': BACKGROUNDS.khaixuangiaochien.FILENAME,
            'canvas_vongbang': BACKGROUNDS.vongbang.FILENAME,
            'canvas_ffws': BACKGROUNDS.ffws.FILENAME
        };
        if (layoutMapping[layoutName]) backgroundFilename = layoutMapping[layoutName];
        
        const backgroundCachePath = path.join(CACHE_PATH, backgroundFilename);
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
                    if (!teamStats.has(newKey)) { teamStats.set(newKey, { isMyTeam: false, playerIds: new Set(currentTeam.playerAccountIds), names: new Set(currentTeam.accountNames), teamName: currentTeam.teamName, totalScore: Number(currentTeam.score) || 0, totalKills: Number(currentTeam.kill) || 0, totalBooyahs: Number(currentTeam.booyah) || 0 }); } else {
                        const stats = teamStats.get(newKey);
                        stats.totalScore += Number(currentTeam.score) || 0;
                        stats.totalKills += Number(currentTeam.kill) || 0;
                        stats.totalBooyahs += Number(currentTeam.booyah) || 0;
                    }
                }
            }
        }
        
        let finalTeams = Array.from(teamStats.values()).map(stats => ({ ...stats, names: Array.from(stats.names), playerIds: Array.from(stats.playerIds) }));
        const myFinalStats = finalTeams.find(team => team.isMyTeam);
        if (myFinalStats && !myFinalStats.teamName && myFinalStats.names.length > 0) { myFinalStats.teamName = myFinalStats.names[Math.floor(Math.random() * myFinalStats.names.length)]; }
        let rankedTeams = [...finalTeams].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0) || (b.totalBooyahs || 0) - (a.totalBooyahs || 0) || (b.totalKills || 0) - (a.totalKills || 0));

        const customTeams = readCustomTeamList();
        rankedTeams = rankedTeams.map(team => {
            let customMatchFound = false;
            for (const custom of customTeams) {
                const matchCount = custom.playerIds.filter(customId => team.playerIds.some(garenaId => customId.startsWith(garenaId.slice(0, -2)))).length;
                if (matchCount >= 1) {
                    team.teamName = custom.teamName;
                    team.logoPath = custom.logoPath;
                    customMatchFound = true;
                    break;
                }
            }
            if (!customMatchFound) team.logoPath = requestedLogoPath;
            return team;
        });
        const topTeamsByGame = [];
        for (let i = 0; i < Math.min(allMatches.length, 5); i++) {
            const gameRanks = allMatches[i]?.ranks;
            if (gameRanks && gameRanks.length > 0) {
                const top1TeamData = [...gameRanks].sort((a, b) => b.score - a.score)[0];
                let winnerName = top1TeamData.teamName || (top1TeamData.accountNames || [])[0] || "N/A";
                let winnerLogoPath = requestedLogoPath;
                for (const custom of customTeams) {
                    const matchCount = custom.playerIds.filter(customId => (top1TeamData.playerAccountIds || []).some(garenaId => customId.startsWith(garenaId.slice(0, -2)))).length;
                    if (matchCount >= 1) {
                        winnerName = custom.teamName;
                        winnerLogoPath = custom.logoPath;
                        break;
                    }
                }
                topTeamsByGame.push({ name: winnerName, logoPath: winnerLogoPath });
            } else {
                topTeamsByGame.push({ name: "N/A", logoPath: requestedLogoPath });
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
            selectedTimeLabel: label, customName, tournamentName: customName,
            customDate: startTime.format('DD/MM'), customTime: startTime.format('HH:mm')
        });

        const imagePath = path.join(CACHE_PATH, `ffrank_final_${Date.now()}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        
        return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, async (err, info) => {
            if (err) console.error("[FFRANK] Lỗi khi gửi ảnh:", err);
            fs.unlinkSync(imagePath);
            
            // ===== KIỂM TRA XEM CÓ CẦN TRỪ TIỀN KHÔNG =====
            try {
                const isAdmin = global.config.ADMINBOT.includes(senderID);
                const usageData = readUsageData();
                const now = new Date();
                
                // Kiểm tra subscription user (cá nhân)
                const isUserSubscribed = usageData.users && 
                                        usageData.users[senderID] && 
                                        usageData.users[senderID].subscription && 
                                        new Date(usageData.users[senderID].subscription.expiry) > now;
                
                // Kiểm tra subscription thread (nhóm)  
                const isThreadSubscribed = usageData.threads && 
                                          usageData.threads[threadID] && 
                                          usageData.threads[threadID].subscription && 
                                          new Date(usageData.threads[threadID].subscription.expiry) > now;

                // CHỈ TRỪ TIỀN NẾU KHÔNG PHẢI ADMIN VÀ KHÔNG CÓ SUBSCRIPTION
                if (!isAdmin && !isUserSubscribed && !isThreadSubscribed) {
                    const nicknames = readNicknameData();
                    const newBalance = (nicknames[senderID] || 0) - COST_PER_USE;
                    nicknames[senderID] = newBalance;
                    saveNicknameData(nicknames);

                    const userInfo = await api.getUserInfo(senderID);
                    const senderName = userInfo[senderID]?.name || senderID;
                    
                    await new Promise(resolve => api.changeNickname(
                        `${senderName} - ${newBalance.toLocaleString('vi-VN')}đ`,
                        threadID, senderID, resolve
                    ));
                    
                    api.sendMessage(
                        `✅ Đã trừ ${COST_PER_USE.toLocaleString('vi-VN')}đ. Số dư còn lại: ${newBalance.toLocaleString('vi-VN')}đ.`,
                        threadID, messageID
                    );
                } else {
                    // KHÔNG TRỪ TIỀN - KHÔNG THÔNG BÁO (tránh làm phiền)
                    // User đã có subscription, không cần thông báo gì thêm
                }
            } catch (e) {
                console.error("[FFRANK] Lỗi khi xử lý thanh toán:", e);
                api.sendMessage("⚠️ Có lỗi xảy ra trong quá trình xử lý thanh toán.", threadID);
            }
        }, messageID);

    } catch (err) {
        console.error("[FFRANK] Lỗi chi tiết trong mainController:", err);
        return api.sendMessage(`❌ Đã xảy ra lỗi nghiêm trọng: ${err.message}.`, threadID, messageID);
    }
}

// ===== RUN =====
module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const command = args[0]?.toLowerCase();

    // ===== BƯỚC 1: KIỂM TRA QUYỀN VÀ QUYẾT ĐỊNH VIỆC TRẢ PHÍ =====
    let isPaidUse = true; // Mặc định là người dùng PHẢI trả phí

    try {
        const isAdmin = global.config.ADMINBOT.includes(senderID);
        const usageData = readUsageData();
        const now = new Date();
        
        // Kiểm tra subscription user (cá nhân)
        const isUserSubscribed = usageData.users && 
                                usageData.users[senderID] && 
                                usageData.users[senderID].subscription && 
                                new Date(usageData.users[senderID].subscription.expiry) > now;
        
        // Kiểm tra subscription thread (nhóm)
        const isThreadSubscribed = usageData.threads && 
                                  usageData.threads[threadID] && 
                                  usageData.threads[threadID].subscription && 
                                  new Date(usageData.threads[threadID].subscription.expiry) > now;

        // BƯỚC 2: MIỄN PHÍ CHO ADMIN HOẶC NGƯỜI ĐÃ THUÊ BAO
        if (isAdmin || isUserSubscribed || isThreadSubscribed) {
            isPaidUse = false; // Nếu là 1 trong 3 trường hợp trên, thì không cần trả phí
        }

        // BƯỚC 3: NẾU VẪN PHẢI TRẢ PHÍ, KIỂM TRA SỐ DƯ (CHỈ KHI KHÔNG PHẢI LỆNH THUÊ BAO)
        if (isPaidUse && command !== 'thue' && command !== 'status' && command !== 'help' && 
            !(command === 'set' && args[1]?.toLowerCase() === 'logo') &&
            !(command === 'list' && args[1]?.toLowerCase() === 'logo') &&
            !(command === 'del' && args[1]?.toLowerCase() === 'logo')) {
            
            const nicknames = readNicknameData();
            const currentBalance = nicknames[senderID] || 0;

            if (currentBalance < COST_PER_USE) {
                return api.sendMessage(
                    `⚠️ Số dư của bạn không đủ (${currentBalance.toLocaleString('vi-VN')}đ) để sử dụng lệnh này.\n` +
                    `- Chi phí yêu cầu: ${COST_PER_USE.toLocaleString('vi-VN')}đ\n` +
                    `👉 Vui lòng dùng lệnh .bankqr để nạp thêm.`,
                    threadID, messageID
                );
            }
        }
    } catch (e) {
        console.error("[FFRANK] Lỗi khi xác thực quyền:", e);
        return api.sendMessage("❌ Có lỗi xảy ra trong quá trình xác thực quyền.", threadID, messageID);
    }
    
    // XỬ LÝ LỆNH STATUS
    if (command === 'status') {
        try {
            const usageData = readUsageData();
            const now = moment().tz(TIME_ZONE);
            let statusMessage = "📊 TRẠNG THÁI THUÊ BAO:\n\n";
            
            // Kiểm tra thuê bao cá nhân
            const userSub = usageData.users && usageData.users[senderID] && usageData.users[senderID].subscription;
            if (userSub && moment(userSub.expiry).isAfter(now)) {
                const expiry = moment(userSub.expiry).format('HH:mm DD/MM/YYYY');
                statusMessage += `👤 Cá nhân: Gói ${userSub.type} (hết hạn: ${expiry})\n`;
            } else {
                statusMessage += `👤 Cá nhân: Chưa có gói\n`;
            }
            
            // Kiểm tra thuê bao nhóm
            const threadSub = usageData.threads && usageData.threads[threadID] && usageData.threads[threadID].subscription;
            if (threadSub && moment(threadSub.expiry).isAfter(now)) {
                const expiry = moment(threadSub.expiry).format('HH:mm DD/MM/YYYY');
                const buyer = threadSub.buyer || 'N/A';
                statusMessage += `👥 Nhóm: Gói ${threadSub.type} (hết hạn: ${expiry})\n`;
                statusMessage += `   Người mua: ${buyer}\n`;
            } else {
                statusMessage += `👥 Nhóm: Chưa có gói\n`;
            }
            
            // Hiển thị số dư
            const nicknames = readNicknameData();
            const currentBalance = nicknames[senderID] || 0;
            statusMessage += `\n💰 Số dư của bạn: ${currentBalance.toLocaleString('vi-VN')}đ`;
            
            // Hiển thị trạng thái miễn phí
            const isAdmin = global.config.ADMINBOT.includes(senderID);
            if (isAdmin) {
                statusMessage += `\n🛡️ Admin: Sử dụng miễn phí`;
            } else if (userSub && moment(userSub.expiry).isAfter(now)) {
                statusMessage += `\n✅ Trạng thái: Miễn phí (gói cá nhân)`;
            } else if (threadSub && moment(threadSub.expiry).isAfter(now)) {
                statusMessage += `\n✅ Trạng thái: Miễn phí (gói nhóm)`;
            } else {
                statusMessage += `\n💳 Trạng thái: Tính phí ${COST_PER_USE.toLocaleString('vi-VN')}đ/lần`;
            }
            
            return api.sendMessage(statusMessage, threadID, messageID);
        } catch (e) {
            console.error("[FFRANK] Lỗi khi kiểm tra status:", e);
            return api.sendMessage("❌ Có lỗi khi kiểm tra trạng thái.", threadID, messageID);
        }
    }

    // XỬ LÝ LỆNH THUÊ BAO
    if (command === 'thue') {
        const type = args[1]?.toLowerCase();
        const scope = args[2]?.toLowerCase();
        
        // Kiểm tra cú pháp
        if (!['tuan', 'thang'].includes(type) || !['rieng', 'nhom'].includes(scope)) {
            return api.sendMessage(
                "⚠️ Cú pháp sai. Dùng:\n" +
                "• .ffrank thue tuan rieng (thuê tuần cá nhân)\n" +
                "• .ffrank thue tuan nhom (thuê tuần nhóm)\n" +
                "• .ffrank thue thang rieng (thuê tháng cá nhân)\n" +
                "• .ffrank thue thang nhom (thuê tháng nhóm)",
                threadID, messageID
            );
        }

        const cost = type === 'tuan' ? WEEKLY_COST : MONTHLY_COST;
        const durationDays = type === 'tuan' ? 7 : 30;
        const typeName = type === 'tuan' ? 'tuần' : 'tháng';
        const scopeName = scope === 'rieng' ? 'cá nhân' : 'nhóm';

        // Kiểm tra số dư
        const nicknames = readNicknameData();
        const currentBalance = nicknames[senderID] || 0;
        
        if (currentBalance < cost) {
            return api.sendMessage(
                `⚠️ Bạn không đủ tiền để mua gói ${typeName} (${scopeName}).\n` +
                `- Số dư của bạn: ${currentBalance.toLocaleString('vi-VN')}đ\n` +
                `- Yêu cầu: ${cost.toLocaleString('vi-VN')}đ\n` +
                `👉 Vui lòng dùng .bankqr để nạp thêm.`,
                threadID, messageID
            );
        }

        // Trừ tiền
        const newBalance = currentBalance - cost;
        nicknames[senderID] = newBalance;
        saveNicknameData(nicknames);

        // Cập nhật thuê bao
        const usageData = readUsageData();
        const now = moment().tz(TIME_ZONE);
        
        let targetData, targetId;
        if (scope === 'nhom') {
            targetId = threadID;
            if (!usageData.threads) usageData.threads = {};
            if (!usageData.threads[targetId]) usageData.threads[targetId] = {};
            targetData = usageData.threads[targetId];
        } else {
            targetId = senderID;
            if (!usageData.users) usageData.users = {};
            if (!usageData.users[targetId]) usageData.users[targetId] = {};
            targetData = usageData.users[targetId];
        }

        // Tính toán thời gian hết hạn (cộng dồn nếu còn hạn)
        let currentExpiry = now;
        if (targetData.subscription && targetData.subscription.expiry) {
            const existingExpiry = moment(targetData.subscription.expiry);
            if (existingExpiry.isAfter(now)) {
                currentExpiry = existingExpiry;
            }
        }
        
        const newExpiryDate = currentExpiry.add(durationDays, 'days');

        // Cập nhật subscription với format nhất quán
        targetData.subscription = {
            expiry: newExpiryDate.toISOString(),
            type: type,
            scope: scope,
            buyer: senderID
        };

        saveUsageData(usageData);

        // Cập nhật nickname với số dư mới
        try {
            const userInfo = await api.getUserInfo(senderID);
            const senderName = userInfo[senderID]?.name || senderID;
            
            await new Promise(resolve => api.changeNickname(
                `${senderName} - ${newBalance.toLocaleString('vi-VN')}đ`,
                threadID, senderID, resolve
            ));
        } catch (e) {
            console.error("[FFRANK] Lỗi khi cập nhật nickname:", e);
        }

        return api.sendMessage(
            `✅ Mua thành công gói ${typeName} cho ${scopeName}!\n` +
            `- Đã trừ: ${cost.toLocaleString('vi-VN')}đ\n` +
            `- Số dư còn lại: ${newBalance.toLocaleString('vi-VN')}đ\n` +
            `📅 Gói sẽ hết hạn vào: ${newExpiryDate.format('HH:mm DD/MM/YYYY')}\n\n` +
            `👉 Dùng ".ffrank status" để kiểm tra trạng thái thuê bao.`,
            threadID, messageID
        );
    }

    // XỬ LÝ CÁC LỆNH CON
    if (command === 'set' && args[1]?.toLowerCase() === 'logo') {
        let content = args.slice(2).join(" ");
        if (!content) return api.sendMessage("⚠️ Vui lòng nhập: .ffrank set logo {team1} , {id1 id2} | {team2} , {id3} ...", threadID, messageID);
        if (event.type !== "message_reply" || !event.messageReply.attachments || event.messageReply.attachments[0].type !== "photo")
            return api.sendMessage("⚠️ Vui lòng reply lại ảnh khi sử dụng set logo đội.", threadID, messageID);

        const imgUrl = event.messageReply.attachments[0].url;
        const imgBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;
        let customTeams = readCustomTeamList();
        let setList = [];

        for (let entry of content.split('|').map(x => x.trim()).filter(Boolean)) {
            let [teamName, ids] = entry.split(',');
            teamName = teamName?.trim();
            if (!teamName || !ids) continue;
            const playerIds = ids.trim().split(/\s+/).filter(id => id.match(/^\d+$/)).slice(0, 4);
            if (playerIds.length === 0) continue;
            const logoPath = path.join(CACHE_PATH, `${teamName.replace(/[^\w\d-]/g, '_')}.png`);
            try {
                fs.writeFileSync(logoPath, imgBuffer);
                const idx = customTeams.findIndex(t => t.teamName.toLowerCase() === teamName.toLowerCase());
                const newTeam = { teamName, playerIds, logoPath, createdAt: Date.now() };
                if (idx > -1) customTeams[idx] = newTeam;
                else customTeams.push(newTeam);
                setList.push(teamName);
            } catch (e) { console.error("Lỗi khi lưu logo:", e); }
        }
        saveCustomTeamList(customTeams);
        api.sendMessage(`✅ Đã lưu logo cho team: ${setList.join(', ')}.\nLogo sẽ tự động xóa sau 24h.`, threadID, messageID);
        return;
    }

    if (command === 'list' && args[1]?.toLowerCase() === 'logo') {
        const arr = readCustomTeamList();
        if (arr.length === 0) return api.sendMessage("ℹ️ Chưa có logo team nào được lưu.", threadID, messageID);
        let msg = "📜 DANH SÁCH LOGO TEAM (Tự xóa sau 24h):\n\n";
        arr.forEach((t, i) => {
            const expiry = t.createdAt ? moment(t.createdAt).add(24, 'hours').tz(TIME_ZONE).format('HH:mm DD/MM/YYYY') : 'Không rõ';
            msg += `${i + 1}. ${t.teamName}\n   - IDs: ${t.playerIds.join(', ')}\n   (Hết hạn: ${expiry})\n`;
        });
        api.sendMessage(msg, threadID, messageID);
        return;
    }

    if (command === 'del' && args[1]?.toLowerCase() === 'logo') {
        let list = args.slice(2).join(" ").split(',').map(x => x.trim()).filter(Boolean);
        if (!list.length) return api.sendMessage("⚠️ Vui lòng nhập: .ffrank del logo {team1} , {team2} ...", threadID, messageID);
        let arr = readCustomTeamList();
        let deleted = [];
        for (let team of list) {
            let idx = arr.findIndex(t => t.teamName.toLowerCase() === team.toLowerCase());
            if (idx > -1) {
                if (arr[idx].logoPath && fs.existsSync(arr[idx].logoPath)) {
                    try { fs.unlinkSync(arr[idx].logoPath); } catch (e) {}
                }
                deleted.push(arr[idx].teamName);
                arr.splice(idx, 1);
            }
        }
        saveCustomTeamList(arr);
        api.sendMessage(`Đã xóa logo: ${deleted.join(', ')}`, threadID, messageID);
        return;
    }

    if (args.length === 0 || command === 'help') {
        const helpMessage = `
📌 HƯỚNG DẪN LỆNH .ffrank
───────────────
🖼️ 1. QUẢN LÝ LOGO ĐỘI (Tự xóa sau 24h)
• Set: Reply ảnh ➜ .ffrank set logo {team1} , {id1 id2} | {team2} , {id3 id4} | ...
• Xoá: .ffrank del logo {team1} , {team2}
• List: .ffrank list logo
───────────────
🔑 2. APIKEY LOGO (ưu tiên logo apiKey nếu nhập)
• .ffrank {id} {apikey} {Tên giải} {dd/mm/yyyy} [giờ] {dd/mm/yyyy} [giờ]
───────────────
🏆 3. TẠO BXH (Chọn giờ menu HOẶC nhập thủ công)
• .ffrank [ID] <tên_logo> [Tên giải] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]
───────────────
💳 4. THUÊ GÓI & SỬ DỤNG
• Gói cá nhân: .ffrank thue [tuan|thang] rieng
• Gói nhóm: .ffrank thue [tuan|thang] nhom
• Dùng lẻ: Bot sẽ hỏi nếu bạn hết lượt.
👉 Dùng .bankqr để nạp.
👨‍💻 Dev: Pcoder | 🛡️ Team SPN`;
        api.sendMessage(helpMessage, threadID, messageID);
        return;
    }
    
    // BƯỚC 2: TIẾP TỤC XỬ LÝ TẠO BXH
    let teamLogoMap = getTeamLogoMapFromCustomFile();
    let apikey = null, logoName = null, accountId, customName = '', timeInfo = null;
    let argOffset = 0;
    if (args.length >= 2 && args[1].length >= 6 && readLogoAll().find(e => e.apiKey === args[1])) {
        apikey = args[1];
        accountId = args[0];
        logoName = apikey;
        argOffset = 2;
    } else if (args.length >= 1 && args[0].match(/^\d+$/)) {
        accountId = args[0];
        if (args[1] && teamLogoMap[args[1]]) {
            logoName = args[1];
            argOffset = 2;
        } else {
            logoName = DEFAULT_LOGO_FILENAME.replace('.png', '');
            argOffset = 1;
        }
    } else {
        return api.sendMessage("⚠️ Cú pháp không hợp lệ. Dùng '.ffrank help' để xem.", threadID, messageID);
    }

    let remainingArgs = args.slice(argOffset);
    let timeStartIndexInRemaining = remainingArgs.findIndex(arg => moment(arg, "DD/MM/YYYY", true).isValid());
    if (timeStartIndexInRemaining !== -1) {
        customName = remainingArgs.slice(0, timeStartIndexInRemaining).join(' ');
        const timeArgs = remainingArgs.slice(timeStartIndexInRemaining);
        if (timeArgs.length < 2) return api.sendMessage("⚠️ Cần nhập đủ ngày BĐ và ngày KT.", threadID, messageID);
        let parseHour = s => s ? s.replace(/^(\d{1,2})h(\d{1,2})$/, "$1:$2") : "00:00";
        let startTime = timeArgs[0], startHour = timeArgs[1] ? parseHour(timeArgs[1]) : "00:00";
        let endTime = timeArgs[2], endHour = timeArgs[3] ? parseHour(timeArgs[3]) : "23:59";
        const format = "DD/MM/YYYY HH:mm";
        let st = moment.tz(`${startTime} ${startHour}`, format, true, TIME_ZONE);
        let et = moment.tz(`${endTime} ${endHour}`, format, true, TIME_ZONE);
        if (!st.isValid() || !et.isValid()) return api.sendMessage(`⚠️ Định dạng ngày giờ không hợp lệ.`, threadID, messageID);
        if (st.isAfter(et)) return api.sendMessage("⚠️ Thời gian bắt đầu không được sau thời gian kết thúc.", threadID, messageID);
        timeInfo = { label: `Tùy Chỉnh`, startTime: st, endTime: et };
    } else {
        customName = remainingArgs.join(' ');
    }

    const layouts = global.client.ffrank_layouts;
    if (!layouts || layouts.length === 0) return api.sendMessage("❌ Lỗi: Không tìm thấy file layout.", threadID, messageID);

    let layoutMessage = `🎨 Chọn layout cho ID: ${accountId}\n(Logo: ${logoName})\n\n` +
        layouts.map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l] || l}`).join('\n') +
        `\n\n👉 Phản hồi bằng số.`;

    return api.sendMessage(layoutMessage, threadID, (err, info) => {
        if (!err) global.client.handleReply.push({
            name: this.config.name, messageID: info.messageID, author: senderID,
            accountId, customName, logoName, timeInfo, type: 'choose_layout',
            apikey, teamLogoMap
        });
    }, messageID);
};

// ===== HANDLE REPLY =====
module.exports.handleReply = async function({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;
    const { threadID, messageID, senderID, body } = event;
    api.unsendMessage(handleReply.messageID).catch(() => {});

    const choice = parseInt(body);
    const { accountId, customName, logoName, timeInfo, apikey, teamLogoMap } = handleReply;

    if (handleReply.type === 'choose_layout') {
        const layouts = global.client.ffrank_layouts;
        if (isNaN(choice) || choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ Lựa chọn layout không hợp lệ.", threadID, messageID);
        const selectedLayout = layouts[choice - 1];
        if (timeInfo) {
            return mainController(api, event, { accountId, customName, logoName, timeInfo, layoutName: selectedLayout, apikey, teamLogoMap });
        } else {
            const timeSlots = [
                { label: "00:00 ➔ 02:00", start: { h: 0, m: 0 }, end: { h: 2, m: 0 } },
                { label: "02:00 ➔ 04:00", start: { h: 2, m: 0 }, end: { h: 4, m: 0 } },
                { label: "04:00 ➔ 06:00", start: { h: 4, m: 0 }, end: { h: 6, m: 0 } },
                { label: "06:00 ➔ 08:00", start: { h: 6, m: 0 }, end: { h: 8, m: 0 } },
                { label: "08:00 ➔ 10:00", start: { h: 8, m: 0 }, end: { h: 10, m: 0 } },
                { label: "10:00 ➔ 12:00", start: { h: 10, m: 0 }, end: { h: 12, m: 0 } },
                { label: "12:00 ➔ 14:00", start: { h: 12, m: 0 }, end: { h: 14, m: 0 } },
                { label: "13:00 ➔ 15:00 (ĐB)", start: { h: 13, m: 0 }, end: { h: 15, m: 0 } },
                { label: "14:00 ➔ 16:00", start: { h: 14, m: 0 }, end: { h: 16, m: 0 } },
                { label: "15:00 ➔ 17:00 (ĐB)", start: { h: 15, m: 0 }, end: { h: 17, m: 0 } },
                { label: "16:00 ➔ 18:00", start: { h: 16, m: 0 }, end: { h: 18, m: 0 } },
                { label: "18:00 ➔ 20:00", start: { h: 18, m: 0 }, end: { h: 20, m: 0 } },
                { label: "20:00 ➔ 21:30 (GV)", start: { h: 20, m: 0 }, end: { h: 21, m: 30 } },
                { label: "20:00 ➔ 22:00 (ĐB)", start: { h: 20, m: 0 }, end: { h: 22, m: 0 } },
                { label: "21:30 ➔ 23:00 (GV)", start: { h: 21, m: 30 }, end: { h: 23, m: 0 } },
                { label: "22:00 ➔ 00:00 (HS)", start: { h: 22, m: 0 }, end: { h: 0, m: 0 }, nextDay: true },
                { label: "Cả Ngày Hôm Nay", start: { h: 0, m: 0 }, end: { h: 23, m: 59 } }
            ];
            let replyMessage = `🎨 Layout: ${LAYOUT_DISPLAY_NAMES[selectedLayout] || selectedLayout}\n📊 Vui lòng chọn khung giờ:\n\n` + timeSlots.map((s, i) => `${i + 1}. ${s.label}`).join('\n') + `\n\n👉 Phản hồi bằng số.`;
            return api.sendMessage(replyMessage, threadID, (err, info) => {
                if (!err) global.client.handleReply.push({
                    name: this.config.name, messageID: info.messageID, author: senderID,
                    accountId, customName, logoName, layoutName: selectedLayout,
                    timeSlots, type: 'choose_time', apikey, teamLogoMap
                });
            }, messageID);
        }
    }

    if (handleReply.type === 'choose_time') {
        const { layoutName, timeSlots } = handleReply;
        if (isNaN(choice) || choice < 1 || choice > timeSlots.length) return api.sendMessage("⚠️ Lựa chọn khung giờ không hợp lệ.", threadID, messageID);
        const selectedSlot = timeSlots[choice - 1];
        const now = moment().tz(TIME_ZONE);
        const startTime = now.clone().hour(selectedSlot.start.h).minute(selectedSlot.start.m).second(0).millisecond(0);
        const endTime = now.clone().hour(selectedSlot.end.h).minute(selectedSlot.end.m).second(0).millisecond(0);
        if (selectedSlot.nextDay) {
            if (now.hour() < selectedSlot.start.h) startTime.subtract(1, 'day');
            endTime.add(1, 'day');
        }
        const newTimeInfo = { label: selectedSlot.label, startTime, endTime };
        return mainController(api, event, { accountId, customName, logoName, timeInfo: newTimeInfo, layoutName, apikey, teamLogoMap });
    }
};