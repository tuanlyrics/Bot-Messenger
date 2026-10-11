// File: modules/commands/td.js
// Version: API-3.4-JSONCache - Lưu API key vào JSON thay vì RAM
// được code bởi Gemini & Pcoder & Claude

const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// ----- CẤU HÌNH -----
const FFRANK_CREATE_URL = 'https://api.spn.io.vn/api/ffrank/create'; 
const CPR_CREATE_URL = 'https://api.spn.io.vn/api/cpr/create';
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Chi phí mỗi lần dùng
const COST_PER_USE = 300;

// ----- JSON CACHE CONFIG -----
const CACHE_DIR = path.join(__dirname, '../../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'apikey_cache.json');
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

// ----- DỮ LIỆU MENU -----
const LAYOUT_DISPLAY_NAMES = {
    'ctx_e9a7d3f0': 'Layout Trung Thu',
    'ctx_b7e4f0c6': 'Layout Việt Nam',
    'ctx_f2d1a8b9': 'Layout Việt Nam 2',
    'ctx_8a1f9c0b': 'Layout Tết',
    'ctx_3e2b7d4f': 'Layout Xanh',
    'ctx_9c5e8a0a': 'Layout Xám',
    'ctx_1d6f4b7a': 'Layout Vàng Chanh',
    'ctx_7b3e0c8d': 'Layout Hồng 4K',
    'ctx_4f5a9e1c': 'Layout FFE',
    'ctx_b2a0d7f3': 'Layout Hello Kitty',
    'ctx_6c8e1d9b': 'Layout Standings (Phải)',
    'ctx_f4a7c0e5': 'Layout Standings (Trái)',
    'ctx_2d9b1a8c': 'Layout Standings 2',
    'ctx_a0c3e7f1': 'Layout OverAll',
    'ctx_5e8d0f4a': 'Layout DCQB',
    'ctx_e1b6f3c9': 'Layout DCQB2',
    'ctx_0a7d2e8b': 'Layout SPN SCRIM',
    'ctx_9f3c1b6d': 'Layout Khai Xuân',
    'ctx_c6e0a4f8': 'Layout Vòng Bảng',
    'ctx_7d1b3e9c': 'Layout FFWS',
    'ctx_8b2f0a5d': 'Layout Kaitokid',
    'ctx_d5e8f7b0': 'Layout Luffy',
    'ctx_3c9a6e1f': 'Layout Luffy G5',
    'ctx_1a8c3d9e': 'Layout Conan',
    'ctx_4c0b9e7d': 'Layout Demon',
    'ctx_6b3d1c8e': 'Layout Naruto',
    'ctx_d1e9f6a7': 'Layout Khai Giảng',
    'ctx_2f7c0b5d': 'Layout Itachi',
    'ctx_a4e8d1b3': 'Layout SEA',
    'ctx_c8b0e6d5': 'Layout Demon3',
    'ctx_5d1a9c3f': 'Layout Luffy',
    'ctx_b9e7c0f4': 'Layout Zoro',
    'ctx_0d6f8a2b': 'Layout Saitama',
    'ctx_7a2e1c9d': 'Layout Demon 2',
    'ctx_e3b4f7a0': 'Layout Luffy 2',
    'ctx_1c9d6b2e': 'Layout Rin',
    'ctx_8f5a3e7c': 'Layout Cuong',
    'ctx_d0c6b1e9': 'Layout OS',
    'ctx_4a7f2d8b': 'Layout OS1',
    'ctx_4a7f2d8a': 'Layout OS2 (dang lam xin vui long khong sai)'
};

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

// ===== HÀM QUẢN LÝ JSON CACHE =====

async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (err) {
        console.warn('[CACHE] Không thể tạo thư mục cache:', err.message);
    }
}

async function loadCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return {};
        }
        console.warn('[CACHE] Lỗi đọc cache:', err.message);
        return {};
    }
}

async function saveCache(cache) {
    try {
        await ensureCacheDir();
        await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    } catch (err) {
        console.warn('[CACHE] Lỗi ghi cache:', err.message);
    }
}

async function getCachedApiKey(senderID) {
    const cache = await loadCache();
    const cached = cache[senderID];
    
    if (!cached) return null;
    
    const isExpired = (Date.now() - cached.timestamp) > CACHE_TTL;
    if (isExpired) {
        console.log(`[CACHE] EXPIRED for ${senderID}`);
        return null;
    }
    
    console.log(`[CACHE] HIT for ${senderID}`);
    return cached.apiKey;
}

async function setCachedApiKey(senderID, apiKey) {
    const cache = await loadCache();
    cache[senderID] = {
        apiKey: apiKey,
        timestamp: Date.now()
    };
    await saveCache(cache);
    console.log(`[CACHE] SAVED for ${senderID}`);
}

// ===== HÀM LẤY API KEY VỚI JSON CACHE =====
async function getUserApiKey(senderID) {
    // Kiểm tra cache JSON trước
    const cachedKey = await getCachedApiKey(senderID);
    if (cachedKey) {
        return cachedKey;
    }

    try {
        // Import pool từ connect.js
        const pool = require('./../1connect.js');
        
        // Query trực tiếp database
        const query = `
            SELECT u.api_key 
            FROM users_link ul
            INNER JOIN Users u ON ul.id_web = u.id
            WHERE ul.id_fb = ?
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(query, [senderID]);
        
        if (!rows || rows.length === 0) {
            throw new Error('Tài khoản Facebook chưa được liên kết với web.');
        }
        
        if (!rows[0].api_key) {
            throw new Error('Tài khoản web của bạn chưa có API Key. Vui lòng tạo trên web.');
        }
        
        const apiKey = rows[0].api_key;
        
        // Lưu vào JSON cache
        await setCachedApiKey(senderID, apiKey);
        
        console.log(`[API_KEY_DB] SUCCESS for ${senderID}`);
        return apiKey;
        
    } catch (dbError) {
        console.warn('[API_KEY_DB] Database error, falling back to HTTP:', dbError.message);
        
        // Fallback: Gọi API PHP
        try {
            const response = await axios.get(`${GET_KEY_URL}?userId=${senderID}`, {
                timeout: 5000
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }
            
            const apiKey = response.data.apiKey;
            
            // Lưu vào JSON cache
            await setCachedApiKey(senderID, apiKey);
            
            console.log(`[API_KEY_HTTP] FALLBACK SUCCESS for ${senderID}`);
            return apiKey;
            
        } catch (httpError) {
            throw new Error(httpError.response?.data?.message || httpError.message);
        }
    }
}

// ===== FUNCTION PARSE BỎ TRẬN =====
function parseSkipMatches(skipStr) {
    if (!skipStr || skipStr === '0') return { isValid: true, type: 'none', value: 0 };
    
    const skipString = String(skipStr).trim();
    
    if (skipString.includes(',')) {
        const skipNumbers = skipString.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => parseInt(s, 10))
            .filter(num => !isNaN(num) && num >= 1);
        
        if (skipNumbers.length === 0) {
            return { isValid: false, error: `Danh sách trận "${skipString}" không có số hợp lệ. VD: "1,3,5"` };
        }
        
        const uniqueNumbers = [...new Set(skipNumbers)].sort((a, b) => a - b);
        
        return { 
            isValid: true, 
            type: 'discrete', 
            value: skipString, 
            numbers: uniqueNumbers 
        };
    }
    
    const rangeMatch = skipString.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
        const startSkip = parseInt(rangeMatch[1], 10);
        const endSkip = parseInt(rangeMatch[2], 10);
        
        if (startSkip < 1 || endSkip < 1 || startSkip > endSkip) {
            return { isValid: false, error: `Range "${skipString}" không hợp lệ. Phải là dạng X-Y với X,Y >= 1 và X <= Y` };
        }
        
        return { isValid: true, type: 'range', value: skipString, start: startSkip, end: endSkip };
    }
    
    const skipCount = parseInt(skipString, 10);
    if (isNaN(skipCount) || skipCount < 0) {
        return { isValid: false, error: `Số trận bỏ "${skipString}" không hợp lệ. Phải là số >= 0, range (VD: 1-5), hoặc danh sách (VD: 1,3,5)` };
    }
    
    return { isValid: true, type: 'count', value: skipCount };
}

function formatSkipDescription(skipData) {
    if (!skipData || skipData.type === 'none') return 'Không bỏ trận';
    
    if (skipData.type === 'discrete') {
        const numbers = skipData.numbers.join(', ');
        return `Bỏ trận rời rạc: ${numbers} (${skipData.numbers.length} trận)`;
    }
    
    if (skipData.type === 'range') {
        const skipCount = skipData.end - skipData.start + 1;
        return `Bỏ trận ${skipData.start}-${skipData.end} (${skipCount} trận)`;
    }
    
    if (skipData.type === 'count') return `Bỏ ${skipData.value} trận mới nhất`;
    
    return 'Không rõ';
}

async function checkRentalPermission(senderID, threadID, isGroup, commandName, api = null) {
    try {
        const target_id = isGroup ? threadID : senderID;
        let adminIDs = [];
        if (isGroup && api) {
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                adminIDs = (threadInfo.adminIDs || []).map(admin => admin.id);
            } catch (error) {
                console.warn('[RENTAL_CHECK] Không thể lấy thông tin QTV:', error.message);
            }
        }
        const response = await axios.post(CHECK_PERMISSION_URL, {
            command_name: commandName,
            target_id: target_id,
            sender_id: senderID,
            admin_ids: adminIDs
        });
        if (response.data.success) {
            console.log(`[RENTAL_CHECK] Kết quả: ${response.data.has_permission}, Lý do: ${response.data.reason}`);
            return response.data.has_permission;
        } else {
            console.warn('[RENTAL_CHECK] API trả về lỗi:', response.data.message);
            return false;
        }
    } catch (error) {
        console.warn('[RENTAL_CHECK] Lỗi khi kiểm tra quyền thuê:', error.message);
        return false;
    }
}

async function getMatchCountFromAPI(accountId, startTime, endTime) {
    try {
        const garenaApi = require('./ffrank/api.js');
        if (!moment.isMoment(startTime)) startTime = moment.tz(startTime, TIME_ZONE);
        if (!moment.isMoment(endTime)) endTime = moment.tz(endTime, TIME_ZONE);
        console.log(`[MATCH_COUNT] Đang tìm matches cho account ${accountId} từ ${startTime.format()} đến ${endTime.format()}`);
        const foundMatches = await garenaApi.findMatches(accountId, startTime, endTime);
        if (!foundMatches || !Array.isArray(foundMatches)) {
            console.warn('[MATCH_COUNT] Không tìm thấy matches hoặc dữ liệu không hợp lệ');
            return 0;
        }
        console.log(`[MATCH_COUNT] Tìm thấy ${foundMatches.length} matches cho account ${accountId}`);
        return foundMatches.length;
    } catch (error) {
        console.warn('[MATCH_COUNT] Lỗi khi lấy số trận từ API:', error.message);
        return 0;
    }
}

function calculateFinalMatchCount(totalMatches, matchesToSkip) {
    if (!matchesToSkip || matchesToSkip === '0') return totalMatches;
    
    const skipData = parseSkipMatches(matchesToSkip);
    if (!skipData.isValid || skipData.type === 'none') return totalMatches;
    
    if (skipData.type === 'discrete') {
        const validSkips = skipData.numbers.filter(num => num <= totalMatches);
        return Math.max(0, totalMatches - validSkips.length);
    }
    
    if (skipData.type === 'range') {
        const actualStart = Math.max(1, skipData.start);
        const actualEnd = Math.min(totalMatches, skipData.end);
        const skipCount = actualEnd >= actualStart ? actualEnd - actualStart + 1 : 0;
        return Math.max(0, totalMatches - skipCount);
    }
    
    if (skipData.type === 'count') {
        return Math.max(0, totalMatches - skipData.value);
    }
    
    return totalMatches;
}

function getClient(global) {
    if (global && global.client) return global.client;
    if (global && global.data) return global.data;
    if (typeof client !== 'undefined') return client;
    return { handleReply: [] };
}

function formatDateTime(dateTime) {
    return moment.tz(dateTime, TIME_ZONE).format('DD/MM/YYYY HH:mm');
}

function parseDate(dateStr) {
    const formats = ["DD-MM-YYYY", "DD/MM/YYYY", "DD.MM.YYYY"];
    for (const format of formats) {
        const parsed = moment(dateStr, format, true);
        if (parsed.isValid()) return { isValid: true, format };
    }
    return { isValid: false, format: null };
}

function parseDateTime(dateStr, timeStr, timezone) {
    const dateResult = parseDate(dateStr);
    if (!dateResult.isValid) return null;
    const dateTime = moment.tz(`${dateStr} ${timeStr}`, `${dateResult.format} HH:mm`, timezone);
    return dateTime.isValid() ? dateTime : null;
}

// ===== FUNCTION GỬI API =====
async function callApiAndSend(api, event, payload, mode) {
    const { threadID, messageID, senderID } = event;
    const isGroup = event.isGroup || false;
    
    try {
        const commandName = mode === 'cpr' ? 'cpr' : 'ffrank';
        const apiUrl = mode === 'cpr' ? CPR_CREATE_URL : FFRANK_CREATE_URL;
        
        let hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, commandName, api);
        let rentalSource = commandName;
        
        if (!hasRentalPermission && mode === 'cpr') {
            const hasFFRankPermission = await checkRentalPermission(senderID, threadID, isGroup, 'ffrank', api);
            if (hasFFRankPermission) {
                hasRentalPermission = true;
                rentalSource = 'ffrank';
                console.log('[RENTAL_CHECK] CPR được miễn phí do đã thuê FFRank');
            }
        }
        
        if (hasRentalPermission) {
            api.sendMessage("🎯 Miễn phí! Đang xử lý...", threadID, messageID);
        } else {
            api.sendMessage(`💰 Phí: ${COST_PER_USE.toLocaleString()}đ. Đang xử lý...`, threadID, messageID);
        }

        let userApiKey;
        try {
            userApiKey = await getUserApiKey(senderID);
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key: ${e.message}`, threadID, messageID);
        }

        const matchCount = await getMatchCountFromAPI(payload.accountId, payload.startTime, payload.endTime);
        const startTimeFormatted = formatDateTime(payload.startTime);
        const endTimeFormatted = formatDateTime(payload.endTime);
        
        let summaryMessage = `📊 Bắt đầu tổng hợp ${mode === 'cpr' ? 'CPR' : 'BXH'}...\n\n`;
        summaryMessage += `🆔 ID Garena: ${payload.accountId}\n`;
        
        if (mode === 'cpr') {
            summaryMessage += `🎯 Mốc điểm: ${payload.pointThreshold} điểm\n`;
        }
        
        if (payload.customName) summaryMessage += `🏆 Tên giải: ${payload.customName}\n`;
        if (payload.logoApiKey) summaryMessage += `🔑 Key Logo: ${payload.logoApiKey}\n`;
        
        if (mode === 'ffrank' && payload.matchesToSkip) {
            const skipData = parseSkipMatches(payload.matchesToSkip);
            if (skipData.type !== 'none') {
                const finalMatchCount = calculateFinalMatchCount(matchCount, payload.matchesToSkip);
                summaryMessage += `↪️ Bỏ trận: ${formatSkipDescription(skipData)}\n`;
                summaryMessage += `📊 Từ ${matchCount} trận → Tính ${finalMatchCount} trận\n`;
            }
        }
        
        const layoutDisplayName = LAYOUT_DISPLAY_NAMES[payload.layoutName] || payload.layoutName;
        summaryMessage += `🎨 Layout: ${layoutDisplayName}\n`;
        summaryMessage += `⏰ Bắt đầu: ${startTimeFormatted}\n`;
        summaryMessage += `⏰ Kết thúc: ${endTimeFormatted}\n\n`;
        summaryMessage += `🎮 Đang xử lý ${matchCount} trận đấu...`;
        api.sendMessage(summaryMessage, threadID, messageID);

        const finalPayload = { 
            ...payload, 
            bot_sender_id: senderID, 
            bot_thread_id: threadID, 
            bot_is_group: isGroup.toString()
        };
        
        if (hasRentalPermission) {
            finalPayload.has_rental_permission = true;
            finalPayload.rental_command = rentalSource;
            
            if (mode === 'cpr' && rentalSource === 'ffrank') {
                finalPayload.rental_note = 'CPR miễn phí do đã thuê FFRank';
            }
        }
        
        if (mode === 'ffrank') {
            finalPayload.matchesToSkip = payload.matchesToSkip || 0;
        }
        
        console.log(`[TD_API_${mode.toUpperCase()}] Gửi payload với cached API key`);
        
        const response = await axios.post(apiUrl, finalPayload, {
            headers: { 'Content-Type': 'application/json', 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });
        
        let successMsg = `🖥️𝙎𝙋𝙉.𝙄𝙊.𝙑𝙉\n✅ Yêu cầu tạo ${mode === 'cpr' ? 'BXH CPR' : 'BXH'} hoàn tất!\n`;
        successMsg += `⏰ Khung giờ: ${startTimeFormatted} - ${endTimeFormatted}\n`;
        
        if (mode === 'cpr') {
            successMsg += `🎯 Mốc điểm: ${payload.pointThreshold} | 🎮 Đã xử lý ${matchCount} trận đấu`;
        } else {
            const finalMatchCount = calculateFinalMatchCount(matchCount, payload.matchesToSkip);
            successMsg += `🎮 Đã xử lý ${matchCount} trận đấu`;
            
            if (payload.matchesToSkip && payload.matchesToSkip !== '0') {
                const skipData = parseSkipMatches(payload.matchesToSkip);
                if (skipData.type === 'discrete') {
                    const validSkips = skipData.numbers.filter(num => num <= matchCount);
                    successMsg += ` (bỏ trận ${validSkips.join(', ')} → tính ${finalMatchCount} trận)`;
                } else if (skipData.type === 'range') {
                    const skipCount = skipData.end - skipData.start + 1;
                    successMsg += ` (bỏ trận ${skipData.start}-${skipData.end} → tính ${finalMatchCount} trận)`;
                } else if (skipData.type === 'count' && skipData.value > 0) {
                    successMsg += ` (bỏ ${skipData.value} trận mới nhất → tính ${finalMatchCount} trận)`;
                }
            }
        }
        
        if (hasRentalPermission) {
            if (mode === 'cpr' && rentalSource === 'ffrank') {
                successMsg += `\n🎁 Miễn phí`;
            } else {
                successMsg += `\n🆓 Miễn phí (đã thuê lệnh)`;
            }
        } else {
            successMsg += `\n💰 Đã trừ ${COST_PER_USE.toLocaleString()}đ`;
        }
        
        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);
    } catch (error) {
        let errorMessage = "Có lỗi không xác định xảy ra.";
        if (error.response) {
            try {
                const chunks = [];
                for await (const chunk of error.response.data) chunks.push(chunk);
                errorMessage = JSON.parse(Buffer.concat(chunks).toString('utf8')).message || 'Lỗi không rõ từ API.';
            } catch (e) { errorMessage = `Lỗi từ server (${error.response.status}).`; }
            if (error.response.status === 402) errorMessage = "💰 Số dư không đủ để sử dụng lệnh này.";
        } else if (error.code === 'ECONNABORTED') errorMessage = "Server xử lý quá lâu, vui lòng thử lại.";
        else errorMessage = error.message;
        console.error(`[TD_API_${mode.toUpperCase()}] Lỗi:`, error);
        return api.sendMessage(`❌ Đã có lỗi xảy ra: ${errorMessage}`, threadID, messageID);
    }
}

// ----- CẤU HÌNH LỆNH -----
module.exports.config = {
    name: "td",
    version: "API-3.4-JSONCache",
    hasPermssion: 0,
    credits: "Gemini & Pcoder & Claude",
    description: "Tạo BXH FF và CPR với JSON cache, hỗ trợ đầy đủ bỏ trận.",
    commandCategory: "game",
    usages: ".td [ID] hoặc .td cpr [ID] [Mốc điểm]",
    cooldowns: 30,
    costPerUse: COST_PER_USE
};

// ----- HÀM CHẠY CHÍNH -----
module.exports.run = async function({ api, event, args, global }) {
    const { threadID, messageID, senderID } = event;
    const clientObject = getClient(global);

    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
        const hasFF = await checkRentalPermission(senderID, threadID, event.isGroup || false, 'ffrank', api);
        const hasCPR = await checkRentalPermission(senderID, threadID, event.isGroup || false, 'cpr', api);

        let costInfo = `💰 Chi phí: ${COST_PER_USE.toLocaleString()}đ/lần\n🎫 Thuê không giới hạn: https://spn.io.vn/thue\n📌 QTV miễn phí nếu nhóm đã thuê!\n\n`;

        if (hasFF || hasCPR) {
            costInfo = "🎯 Trạng thái thuê:\n";
            if (hasFF) {
                costInfo += `- BXH thường: MIỄN PHÍ\n`;
                costInfo += `- CPR: MIỄN PHÍ (ưu đãi từ BXH thường)\n`;
            } else if (hasCPR) {
                costInfo += `- BXH thường: ${COST_PER_USE.toLocaleString()}đ/lần\n`;
                costInfo += `- CPR: MIỄN PHÍ\n`;
            }
            costInfo += "\n";
        }

        const helpMessage = 
    `📌 HƯỚNG DẪN LỆNH .td\n\n${costInfo}` +

    `🎮 BXH THƯỜNG:\n` +
    `• Đầy đủ: .td [ID] [Tên giải] [Key] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT] [Bỏ trận]\n` +
    `• Menu: .td [ID] [Tên giải...] [Key logo] [Bỏ trận]\n\n` +

    `🎯 CPR (Champions' Rush):\n` +
    `• Đầy đủ: .td cpr [ID] [Mốc điểm] [Tên giải] [Key] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]\n` +
    `• Menu: .td cpr [ID] [Mốc điểm] [Tên giải...] [Key logo]\n\n` +

    `📝 Ví dụ:\n` +
    `.td 1234567890 Test null 29/04/2025 13:00 30/04/2025 15:00 2,4,6\n` +
    `.td cpr 1234 50 Champions null 15/08/2025 20:00 15/08/2025 22:00\n\n` +

    `🔢 Bỏ trận (chỉ BXH thường):\n` +
    `• Rời rạc: 2,4,6 → bỏ trận 2,4,6\n` +
    `• Range: 1-5 → bỏ trận 1 đến 5\n` +
    `• Số lượng: 3 → bỏ 3 trận mới nhất\n\n` +

    `📅 Ngày: DD/MM/YYYY | ⏰ Giờ: HH:mm\n` +
    `📌 Nhập "null" nếu không có Tên giải/Key logo.`;

        return api.sendMessage(helpMessage, threadID, messageID);
    }

    const isCPRMode = args[0]?.toLowerCase() === 'cpr';
    let actualArgs = isCPRMode ? args.slice(1) : args;

    if (isCPRMode) {
        if (actualArgs.length === 0) {
            return api.sendMessage("❌ Vui lòng nhập ID Garena!\n\n📝 Cú pháp: .td cpr [ID] [Mốc điểm] ...", threadID, messageID);
        }

        const accountId = actualArgs[0];
        
        if (!/^\d+$/.test(accountId)) {
            return api.sendMessage("❌ ID Garena phải là số!\n\n📝 Ví dụ: .td cpr 1234567890 50", threadID, messageID);
        }

        if (actualArgs.length < 2) {
            return api.sendMessage("❌ Vui lòng nhập mốc điểm!\n\n📝 Cú pháp: .td cpr [ID] [Mốc điểm] ...", threadID, messageID);
        }

        const pointThreshold = parseInt(actualArgs[1]);
        
        if (isNaN(pointThreshold) || pointThreshold <= 0) {
            return api.sendMessage("❌ Mốc điểm phải là số dương!\n\n📝 Ví dụ: .td cpr 1234567890 50", threadID, messageID);
        }

        if (actualArgs.length >= 6) {
            let timeStartIndex = -1;
            let customName = '';
            let logoApiKey = '';
            
            if (actualArgs.length === 6) {
                timeStartIndex = 2;
                customName = '';
                logoApiKey = '';
            } else {
                timeStartIndex = actualArgs.findIndex((arg, index) => index > 1 && parseDate(arg).isValid);
                
                if (timeStartIndex === -1) {
                    return api.sendMessage("⚠️ Không tìm thấy thông tin ngày giờ hợp lệ.", threadID, messageID);
                }

                const nameAndKeyArgs = actualArgs.slice(2, timeStartIndex);
                
                if (nameAndKeyArgs.length === 0) {
                    customName = '';
                    logoApiKey = '';
                } else if (nameAndKeyArgs.length === 1) {
                    customName = nameAndKeyArgs[0] === 'null' ? '' : nameAndKeyArgs[0];
                    logoApiKey = '';
                } else {
                    logoApiKey = nameAndKeyArgs.pop(); 
                    if (logoApiKey === 'null') logoApiKey = '';
                    
                    customName = nameAndKeyArgs.join(' ');
                    if (customName === 'null') customName = '';
                }
            }
            
            const timeArgs = actualArgs.slice(timeStartIndex);
            if (timeArgs.length < 4) {
                return api.sendMessage("⚠️ Thiếu thông tin thời gian. Cần: [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]", threadID, messageID);
            }
            
            const startTime = parseDateTime(timeArgs[0], timeArgs[1], TIME_ZONE);
            const endTime = parseDateTime(timeArgs[2], timeArgs[3], TIME_ZONE);

            if (!startTime || !endTime) {
                return api.sendMessage("⚠️ Định dạng ngày giờ không hợp lệ.\n📅 Hỗ trợ: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY\n🕐 Giờ: HH:mm", threadID, messageID);
            }

            const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
            let layoutMessage = `🎨 [CPR] Đã nhận thời gian. Vui lòng chọn layout:\n\n` +
                layouts.map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l]}`).join('\n') +
                `\n\n👉 Phản hồi bằng số.`;

            return api.sendMessage(layoutMessage, threadID, (err, info) => {
                if (err) return console.error(err);
                
                if (!clientObject.handleReply) {
                    clientObject.handleReply = [];
                }
                
                clientObject.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    data: { 
                        accountId, 
                        pointThreshold, 
                        customName, 
                        logoApiKey, 
                        startTime: startTime.format("YYYY-MM-DD HH:mm:ss"), 
                        endTime: endTime.format("YYYY-MM-DD HH:mm:ss") 
                    },
                    type: 'choose_layout_cpr_manual'
                });
            }, messageID);

        } else {
            const customName = actualArgs[2] === 'null' ? '' : actualArgs[2] || '';
            const logoApiKey = actualArgs[3] === 'null' ? '' : actualArgs[3] || '';
            
            const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
            let layoutMessage = `🎨 [CPR] Vui lòng chọn layout:\n\n` +
                layouts.map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l]}`).join('\n') +
                `\n\n👉 Phản hồi bằng số.`;

            return api.sendMessage(layoutMessage, threadID, (err, info) => {
                if (err) return console.error(err);
                
                if (!clientObject.handleReply) {
                    clientObject.handleReply = [];
                }
                
                clientObject.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    data: { accountId, pointThreshold, customName, logoApiKey },
                    type: 'choose_layout_cpr'
                });
            }, messageID);
        }
        
    } else {
        if (actualArgs.length === 0) {
            return api.sendMessage("❌ Vui lòng nhập ID Garena!\n\n📝 Cú pháp: .td [ID] [Tên giải] ...", threadID, messageID);
        }

        const accountId = actualArgs[0];
        
        if (!/^\d+$/.test(accountId)) {
            return api.sendMessage("❌ ID Garena phải là số!\n\n📝 Ví dụ: .td 1234567890", threadID, messageID);
        }

        if (actualArgs.length >= 5) {
            let timeStartIndex = -1;
            for (let i = 1; i < actualArgs.length - 3; i++) {
                if (parseDate(actualArgs[i]).isValid && actualArgs[i+1]?.includes(':') && parseDate(actualArgs[i+2]).isValid && actualArgs[i+3]?.includes(':')) {
                    timeStartIndex = i;
                    break;
                }
            }
            
            if (timeStartIndex !== -1) {
                const startDateStr = actualArgs[timeStartIndex];
                const startTimeStr = actualArgs[timeStartIndex + 1];
                const endDateStr = actualArgs[timeStartIndex + 2];
                const endTimeStr = actualArgs[timeStartIndex + 3];
                
                const startTime = parseDateTime(startDateStr, startTimeStr, TIME_ZONE);
                const endTime = parseDateTime(endDateStr, endTimeStr, TIME_ZONE);
                
                if (startTime && endTime) {
                    let matchesToSkip = '0';
                    
                    if (actualArgs[timeStartIndex + 4]) {
                        const skipInput = actualArgs[timeStartIndex + 4];
                        const skipData = parseSkipMatches(skipInput);
                        if (!skipData.isValid) {
                            return api.sendMessage(`❌ ${skipData.error}`, threadID, messageID);
                        }
                        matchesToSkip = skipInput;
                    }
                    
                    const nameAndKeyArgs = actualArgs.slice(1, timeStartIndex);
                    let customName = '';
                    let logoApiKey = '';
                    
                    if (nameAndKeyArgs.length === 1) {
                        customName = nameAndKeyArgs[0] === 'null' ? '' : nameAndKeyArgs[0];
                    } else if (nameAndKeyArgs.length > 1) {
                        logoApiKey = nameAndKeyArgs[nameAndKeyArgs.length - 1];
                        if (logoApiKey === 'null') logoApiKey = '';
                        customName = nameAndKeyArgs.slice(0, -1).join(' ');
                        if (customName === 'null') customName = '';
                    }

                    const data = {
                        accountId, customName: customName.trim(), logoApiKey,
                        startTime: startTime.format(), endTime: endTime.format(), matchesToSkip
                    };

                    const skipData = parseSkipMatches(matchesToSkip);
                    let layoutMessage = `🎨 [BXH] Đã nhận đủ thông tin:\n` +
                        `🆔 ID: ${accountId}\n` +
                        `🏆 Tên giải: ${customName || 'Không có'}\n` +
                        `🔑 Key logo: ${logoApiKey || 'Không có'}\n` +
                        `⏰ Thời gian: ${formatDateTime(startTime)} - ${formatDateTime(endTime)}\n` +
                        `↪️ Bỏ trận: ${formatSkipDescription(skipData)}\n\n` +
                        `Vui lòng chọn layout:\n\n` +
                        Object.keys(LAYOUT_DISPLAY_NAMES).map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l]}`).join('\n') +
                        `\n\n👉 Phản hồi bằng số.`;

                    return api.sendMessage(layoutMessage, threadID, (err, info) => {
                        if (err) return console.error(err);
                        if (!clientObject.handleReply) clientObject.handleReply = [];
                        clientObject.handleReply.push({
                            name: this.config.name, messageID: info.messageID, author: senderID,
                            data, type: 'choose_layout_ffrank_final'
                        });
                    }, messageID);
                }
            }
        }
        
        let customName = '';
        let logoApiKey = '';
        let matchesToSkip = '0';
        let nameAndKeyArgs = actualArgs.slice(1);

        if (nameAndKeyArgs.length > 0) {
            const lastArg = nameAndKeyArgs[nameAndKeyArgs.length - 1];
            
            const skipData = parseSkipMatches(lastArg);
            if (skipData.isValid && skipData.type !== 'none') {
                matchesToSkip = lastArg;
                nameAndKeyArgs.pop();
            }
        }

        if (nameAndKeyArgs.length === 1) {
            customName = nameAndKeyArgs[0];
        } else if (nameAndKeyArgs.length > 1) {
            logoApiKey = nameAndKeyArgs.pop();
            customName = nameAndKeyArgs.join(' ');
        }

        if (customName.toLowerCase() === 'null') customName = '';
        if (logoApiKey.toLowerCase() === 'null') logoApiKey = '';
        
        const skipData = parseSkipMatches(matchesToSkip);
        let layoutMessage = `🎨 [BXH] Vui lòng chọn layout:\n\n` + 
            Object.keys(LAYOUT_DISPLAY_NAMES).map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l]}`).join('\n') + 
            `\n\n🔢 Bỏ trận: ${formatSkipDescription(skipData)}\n👉 Phản hồi bằng số.`;
            
        return api.sendMessage(layoutMessage, threadID, (err, info) => {
            if (err) return console.error(err);
            if (!clientObject.handleReply) clientObject.handleReply = [];
            clientObject.handleReply.push({
                name: this.config.name, messageID: info.messageID, author: senderID,
                data: { accountId, customName, logoApiKey, matchesToSkip }, type: 'choose_layout_ffrank_menu'
            });
        }, messageID);
    }
};

// ----- HÀM XỬ LÝ PHẢN HỒI -----
module.exports.handleReply = async function({ api, event, handleReply, global }) {
    if (event.senderID !== handleReply.author) return;
    const { threadID, messageID, body } = event;
    const clientObject = getClient(global);
    
    api.unsendMessage(handleReply.messageID).catch(() => {});
    const choice = parseInt(body);
    if (isNaN(choice)) return api.sendMessage("⚠️ Lựa chọn không hợp lệ.", threadID, messageID);

    let { data } = handleReply;

    if (handleReply.type === 'choose_layout_cpr_manual') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ [CPR] Lựa chọn layout không hợp lệ.", threadID, messageID);
        data.layoutName = layouts[choice - 1];
        
        return callApiAndSend(api, event, data, 'cpr');
    }
    
    if (handleReply.type === 'choose_layout_cpr') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ [CPR] Lựa chọn layout không hợp lệ.", threadID, messageID);
        data.layoutName = layouts[choice - 1];

        let timeMessage = `📊 [CPR] Vui lòng chọn khung giờ:\n\n` +
            timeSlots.map((s, i) => `${i + 1}. ${s.label}`).join('\n') +
            `\n\n👉 Phản hồi bằng số.`;
            
        return api.sendMessage(timeMessage, threadID, (err, info) => {
            if (err) return console.error(err);
            
            if (!clientObject.handleReply) {
                clientObject.handleReply = [];
            }
            
            clientObject.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: event.senderID,
                data: data,
                type: 'choose_time_cpr'
            });
        }, messageID);
    }

    if (handleReply.type === 'choose_time_cpr') {
        if (choice < 1 || choice > timeSlots.length) return api.sendMessage("⚠️ [CPR] Lựa chọn khung giờ không hợp lệ.", threadID, messageID);
        const selectedSlot = timeSlots[choice - 1];
        
        const now = moment().tz(TIME_ZONE);
        const startTime = now.clone().hour(selectedSlot.start.h).minute(selectedSlot.start.m).second(0);
        const endTime = now.clone().hour(selectedSlot.end.h).minute(selectedSlot.end.m).second(59);

        if (selectedSlot.nextDay) {
            if (now.hour() < selectedSlot.start.h) startTime.subtract(1, 'day');
            endTime.add(1, 'day');
        }

        const payload = { ...data, 
            startTime: startTime.format("YYYY-MM-DD HH:mm:ss"),
            endTime: endTime.format("YYYY-MM-DD HH:mm:ss")
        };
        
        return callApiAndSend(api, event, payload, 'cpr');
    }

    if (handleReply.type === 'choose_layout_ffrank_final') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ [BXH] Lựa chọn layout không hợp lệ.", threadID, messageID);
        data.layoutName = layouts[choice - 1];
        return callApiAndSend(api, event, data, 'ffrank');
    }
    
    if (handleReply.type === 'choose_layout_ffrank_menu') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ [BXH] Lựa chọn layout không hợp lệ.", threadID, messageID);
        data.layoutName = layouts[choice - 1];
        data.matchesToSkip = data.matchesToSkip || '0';

        const skipData = parseSkipMatches(data.matchesToSkip);
        let timeMessage = `📊 [BXH] Vui lòng chọn khung giờ:\n\n` + 
            timeSlots.map((s, i) => `${i + 1}. ${s.label}`).join('\n') + 
            `\n\n🔢 Bỏ trận: ${formatSkipDescription(skipData)}\n👉 Phản hồi bằng số.`;
            
        return api.sendMessage(timeMessage, threadID, (err, info) => {
            if (err) return console.error(err);
            if (!clientObject.handleReply) clientObject.handleReply = [];
            clientObject.handleReply.push({ 
                name: this.config.name, messageID: info.messageID, author: event.senderID, 
                data, type: 'choose_time_ffrank' 
            });
        }, messageID);
    }

    if (handleReply.type === 'choose_time_ffrank') {
        if (choice < 1 || choice > timeSlots.length) return api.sendMessage("⚠️ [BXH] Lựa chọn khung giờ không hợp lệ.", threadID, messageID);
        
        const slot = timeSlots[choice - 1];
        const today = moment.tz(TIME_ZONE).startOf('day');
        
        let startTime, endTime;
        
        if (slot.label === "Cả Ngày Hôm Nay") {
            startTime = today.clone();
            endTime = today.clone().endOf('day');
        } else if (slot.nextDay) {
            startTime = today.clone().hour(slot.start.h).minute(slot.start.m);
            endTime = today.clone().add(1, 'day').hour(slot.end.h).minute(slot.end.m);
        } else {
            startTime = today.clone().hour(slot.start.h).minute(slot.start.m);
            endTime = today.clone().hour(slot.end.h).minute(slot.end.m);
        }
        
        const payload = { ...data, startTime: startTime.format(), endTime: endTime.format() };
        return callApiAndSend(api, event, payload, 'ffrank');
    }
};