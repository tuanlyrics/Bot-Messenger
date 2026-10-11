// File: modules/commands/ffrank.js
// Version: API-3.1-CompleteSkipSupport - Cập nhật hỗ trợ đầy đủ bỏ trận rời rạc, range và số lượng
// được code bởi Gemini & Pcoder & Claude

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");
const FormData = require("form-data");

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/ffdocquyen/create'; 
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Chi phí mỗi lần dùng (chỉ áp dụng khi chưa thuê)
const COST_PER_USE = 500;

// File lưu danh sách người được phép dùng
const PERM_FILE = path.join(__dirname, "dataff/ffvip_users.json");

// Đảm bảo file tồn tại
if (!fs.existsSync(PERM_FILE)) {
    fs.writeFileSync(PERM_FILE, JSON.stringify(["100047128875560"], null, 2));
}

// Load permission (trả về mảng UID)
function loadPerm() {
    try {
        const data = JSON.parse(fs.readFileSync(PERM_FILE, "utf8"));
        if (Array.isArray(data)) return data.map(String); // ép toàn bộ thành string
        return ["100047128875560"];
    } catch (e) {
        const defaultData = ["100047128875560"];
        savePerm(defaultData);
        return defaultData;
    }
}

// Save permission (mảng UID)
function savePerm(data) {
    fs.writeFileSync(PERM_FILE, JSON.stringify(data, null, 2));
}


// ----- DỮ LIỆU MENU -----
const LAYOUT_DISPLAY_NAMES = {
    'canvas_docquyenkhach1': 'Layout FFE',
    'canvas_docquyenkhach2': 'Layout FFE1',
    'canvas_docquyenkhach3': 'layout FFE2',
    'canvas_ffeconan': 'Layout conan'
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

// ===== FUNCTION PARSE BỎ TRẬN HOÀN CHỈNH - HỖ TRỢ TẤT CẢ ĐỊNH DẠNG =====

function parseSkipMatches(skipStr) {
    if (!skipStr || skipStr === '0') return { isValid: true, type: 'none', value: 0 };
    
    const skipString = String(skipStr).trim();
    
    // === CASE 1: BỎ NHIỀU TRẬN RỜI RẠC (VD: "1,3,5" hoặc "2,4,6,8") ===
    if (skipString.includes(',')) {
        const skipNumbers = skipString.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => parseInt(s, 10))
            .filter(num => !isNaN(num) && num >= 1);
        
        if (skipNumbers.length === 0) {
            return { isValid: false, error: `Danh sách trận "${skipString}" không có số hợp lệ. VD: "1,3,5"` };
        }
        
        // Loại bỏ duplicate và sort
        const uniqueNumbers = [...new Set(skipNumbers)].sort((a, b) => a - b);
        
        return { 
            isValid: true, 
            type: 'discrete', 
            value: skipString, 
            numbers: uniqueNumbers 
        };
    }
    
    // === CASE 2: BỎ RANGE LIÊN TỤC (VD: "2-4", "1-3") ===
    const rangeMatch = skipString.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
        const startSkip = parseInt(rangeMatch[1], 10);
        const endSkip = parseInt(rangeMatch[2], 10);
        
        if (startSkip < 1 || endSkip < 1 || startSkip > endSkip) {
            return { isValid: false, error: `Range "${skipString}" không hợp lệ. Phải là dạng X-Y với X,Y >= 1 và X <= Y` };
        }
        
        return { isValid: true, type: 'range', value: skipString, start: startSkip, end: endSkip };
    }
    
    // === CASE 3: BỎ N TRẬN CUỐI (VD: "3", "5") ===
    const skipCount = parseInt(skipString, 10);
    if (isNaN(skipCount) || skipCount < 0) {
        return { isValid: false, error: `Số trận bỏ "${skipString}" không hợp lệ. Phải là số >= 0, range (VD: 1-5), hoặc danh sách (VD: 1,3,5)` };
    }
    
    return { isValid: true, type: 'count', value: skipCount };
}

// ===== FUNCTION FORMAT MÔ TẢ BỎ TRẬN HOÀN CHỈNH =====

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

// ----- HÀM KIỂM TRA QUYỀN THUÊ (Có hỗ trợ QTV) -----
async function checkRentalPermission(senderID, threadID, isGroup, api = null) {
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
            command_name: 'ffrank',
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

// ----- HÀM KIỂM TRA SỐ TRẬN ĐẤU (Sử dụng API từ ffrank/api.js) -----
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

// ===== FUNCTION TÍNH TOÁN SỐ TRẬN SAU KHI BỎ - HỖ TRỢ TẤT CẢ ĐỊNH DẠNG =====

function calculateFinalMatchCount(totalMatches, matchesToSkip) {
    if (!matchesToSkip || matchesToSkip === '0') return totalMatches;
    
    const skipData = parseSkipMatches(matchesToSkip);
    if (!skipData.isValid || skipData.type === 'none') return totalMatches;
    
    if (skipData.type === 'discrete') {
        // Bỏ trận rời rạc: đếm số trận hợp lệ trong phạm vi
        const validSkips = skipData.numbers.filter(num => num <= totalMatches);
        return Math.max(0, totalMatches - validSkips.length);
    }
    
    if (skipData.type === 'range') {
        // Bỏ range: tính số trận trong khoảng
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

// ----- HELPER FUNCTION ĐỂ KIỂM TRA VÀ LẤY CLIENT -----
function getClient(global) {
    if (global && global.client) return global.client;
    if (global && global.data) return global.data;
    if (typeof client !== 'undefined') return client;
    return { handleReply: [] };
}

// ----- HÀM FORMAT THỜI GIAN -----
function formatDateTime(dateTime) {
    return moment(dateTime).format('DD/MM/YYYY HH:mm');
}

// ----- HELPER FUNCTION ĐỂ PARSE NGÀY THÁNG NHIỀU ĐỊNH DẠNG -----
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

// ===== FUNCTION GỬI API VÀ HIỂN THỊ KẾT QUẢ - CẬP NHẬT HỖ TRỢ TẤT CẢ ĐỊNH DẠNG BỎ TRẬN =====

async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    const isGroup = event.isGroup || false;
    try {
        const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, api);
        if (hasRentalPermission) {
            api.sendMessage("🎯 Miễn phí! Đang xử lý...", threadID, messageID);
        } else {
            api.sendMessage(`💰 Phí: ${COST_PER_USE.toLocaleString()}đ. Đang xử lý...`, threadID, messageID);
        }

        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key của bạn: ${e.message}`, threadID, messageID);
        }

        const matchCount = await getMatchCountFromAPI(payload.accountId, payload.startTime, payload.endTime);
        const startTimeFormatted = formatDateTime(payload.startTime);
        const endTimeFormatted = formatDateTime(payload.endTime);
        
        let summaryMessage = `📊 Bắt đầu tổng hợp dữ liệu...\n\n`;
        summaryMessage += `🆔 ID Garena: ${payload.accountId}\n`;
        if (payload.customName) summaryMessage += `🏆 Tên giải: ${payload.customName}\n`;
        if (payload.logoApiKey) summaryMessage += `🔑 Key Logo: ${payload.logoApiKey}\n`;
        
        // IMPROVED: Hiển thị thông tin bỏ trận chi tiết cho tất cả định dạng
        const skipData = parseSkipMatches(payload.matchesToSkip);
        if (skipData.type !== 'none') {
            const finalMatchCount = calculateFinalMatchCount(matchCount, payload.matchesToSkip);
            summaryMessage += `↪️ Bỏ trận: ${formatSkipDescription(skipData)}\n`;
            summaryMessage += `📊 Từ ${matchCount} trận → Tính ${finalMatchCount} trận\n`;
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
            bot_is_group: isGroup.toString(), 
            matchesToSkip: payload.matchesToSkip || 0 
        };
        
        const response = await axios.post(CREATE_URL, finalPayload, {
            headers: { 'Content-Type': 'application/json', 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });

        let successMsg = `✅ Yêu cầu tạo BXH hoàn tất!\n`;
        successMsg += `⏰ Khung giờ: ${startTimeFormatted} - ${endTimeFormatted}\n`;
        
        // IMPROVED: Hiển thị thông tin bỏ trận chi tiết trong kết quả
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
        
        if (hasRentalPermission) successMsg += `\n🆓 Miễn phí (đã thuê lệnh)`;
        else successMsg += `\n💰 Đã trừ ${COST_PER_USE.toLocaleString()}đ`;
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
        console.error("[FFRANK_API_FINAL] Lỗi:", error);
        return api.sendMessage(`❌ Đã có lỗi xảy ra: ${errorMessage}`, threadID, messageID);
    }
}

// ----- CẤU HÌNH LỆNH -----
module.exports.config = {
    name: "docquyen",
    version: "API-3.1-CompleteSkipSupport",
    hasPermssion: 0,
    credits: "Gemini & Pcoder & Claude",
    description: "Tạo BXH FF với hệ thống thuê lệnh, hỗ trợ đầy đủ bỏ trận: rời rạc, range, số lượng.",
    commandCategory: "game",
    usages: ".docquyen [ID] [Tên giải] [Key] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT] [Bỏ trận]",
    cooldowns: 30,
    costPerUse: COST_PER_USE
};

// ----- HÀM CHẠY CHÍNH -----
module.exports.run = async function({ api, event, args, global }) {
    const { threadID, messageID, senderID } = event;
    const clientObject = getClient(global);
    let perm = loadPerm();
const sender = String(senderID);

// === NDH ADD / DEL USER ===
if (args[0] === "add" || args[0] === "del") {
    if (sender !== "100047128875560") {
        return api.sendMessage("⚠️ Bạn không có quyền thực hiện thao tác này.", threadID, messageID);
    }

    const target = String(args[1]);
    if (!target) return api.sendMessage("⚠️ Vui lòng nhập UID hợp lệ.", threadID, messageID);

    if (args[0] === "add") {
        if (!perm.includes(target)) {
            perm.push(target);
            savePerm(perm);
            return api.sendMessage(`✅ Đã thêm UID ${target} vào danh sách.`, threadID, messageID);
        } else {
            return api.sendMessage(`⚠️ UID ${target} đã có trong danh sách.`, threadID, messageID);
        }
    }

    if (args[0] === "del") {
        if (perm.includes(target)) {
            perm = perm.filter(u => u !== target);
            savePerm(perm);
            return api.sendMessage(`🗑️ Đã xóa UID ${target} khỏi danh sách.`, threadID, messageID);
        } else {
            return api.sendMessage(`⚠️ UID ${target} không tồn tại trong danh sách.`, threadID, messageID);
        }
    }
}

// === CHECK PERMISSION ===
if (!perm.includes(sender)) {
    return api.sendMessage("🚫 Bạn không có quyền sử dụng lệnh này.", threadID, messageID);
}


    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
        const hasRental = await checkRentalPermission(senderID, threadID, event.isGroup || false, api);
        let costInfo = `💰 CHI PHÍ: ${COST_PER_USE.toLocaleString()}đ/lần\n🎫 Thuê không giới hạn: https://spn.io.vn/thue\n📌 QTV miễn phí nếu nhóm đã thuê!\n\n`;
        if (hasRental) {
            let rentalStatus = `🎯 TRẠNG THÁI: Đã thuê lệnh - MIỄN PHÍ!\n\n`;
            if (event.isGroup) {
                try {
                    const threadInfo = await api.getThreadInfo(threadID);
                    if ((threadInfo.adminIDs || []).some(admin => admin.id === senderID)) {
                        rentalStatus = `🎯 TRẠNG THÁI: QTV nhóm có thuê - MIỄN PHÍ!\n\n`;
                    }
                } catch (e) { /* ignore */ }
            }
            costInfo = rentalStatus;
        }
        
        const helpMessage = `📌 HƯỚNG DẪN LỆNH .ffrank\n\n${costInfo}` +
    `1. NHẬP ĐẦY ĐỦ (Khuyên dùng):\n` +
    `.ffrank [ID] [Tên giải] [Key] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT] [Bỏ trận]\n\n` +
    `2. DÙNG MENU (Hỗ trợ tên giải nhiều từ):\n` +
    `.ffrank [ID] [Tên giải...] [Key logo] [Bỏ trận]\n\n` +
    `3. VÍ DỤ ĐẦY ĐỦ:\n` +
    `.ffrank 1234567890 PcoderTest spn_pcodertest 29/04/2025 13:00 30/04/2025 15:00 2,4,6\n` +
    `.ffrank 1234567890 TestGiai null 29/04/2025 13:00 30/04/2025 15:00 1-5\n` +
    `.ffrank 1234567890 null null 29/04/2025 13:00 30/04/2025 15:00 3\n\n` +
    `» [Key logo] và [Bỏ trận] là tùy chọn.\n` +
    `📅 Định dạng ngày: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY\n\n` +
    `🔢 BỎ TRẬN - Các cách sử dụng:\n` +
    `• Rời rạc: 2,4,6 → bỏ trận 2,4,6 (giữ 1,3,5,7...)\n` +
    `• Range: 1-5 → bỏ trận 1,2,3,4,5 (giữ 6,7,8...)\n` +
    `• Số lượng: 3 → bỏ 3 trận MỚI NHẤT (giữ cũ)\n` +
    `• 0 hoặc không nhập → không bỏ trận nào\n\n` +
    `💡 LOGIC BỎ TRẬN:\n` +
    `• Rời rạc (2,4,6): Bỏ chính xác trận chỉ định\n` +
    `• Range (1-5): Bỏ liên tục từ cũ nhất\n` +
    `• Số (3): Bỏ từ mới nhất về cũ\n\n` +
    `📝 Ví dụ với 8 trận (1→8 từ cũ→mới):\n` +
    `• "2,4,6": Bỏ trận 2,4,6 → Tính 1,3,5,7,8\n` +
    `• "1-3": Bỏ trận 1,2,3 → Tính 4,5,6,7,8\n` +
    `• "3": Bỏ trận 6,7,8 → Tính 1,2,3,4,5\n\n` +
    `📌 Dùng "null" nếu không có Tên giải hoặc Key logo.`;
        return api.sendMessage(helpMessage, threadID, messageID);
    }

    // ========== LOGIC PHÂN TÍCH LỆNH (UNIFIED PARSING) ==========
    
    // Ưu tiên kiểm tra định dạng đầy đủ (có thời gian tùy chỉnh)
    if (args.length >= 5) {
        let timeStartIndex = -1;
        for (let i = 1; i < args.length - 3; i++) {
            if (parseDate(args[i]).isValid && args[i+1]?.includes(':') && parseDate(args[i+2]).isValid && args[i+3]?.includes(':')) {
                timeStartIndex = i;
                break;
            }
        }
        
        if (timeStartIndex !== -1) {
            const startDateStr = args[timeStartIndex];
            const startTimeStr = args[timeStartIndex + 1];
            const endDateStr = args[timeStartIndex + 2];
            const endTimeStr = args[timeStartIndex + 3];
            
            const startTime = parseDateTime(startDateStr, startTimeStr, TIME_ZONE);
            const endTime = parseDateTime(endDateStr, endTimeStr, TIME_ZONE);
            
            if (startTime && endTime) {
                const accountId = args[0];
                let matchesToSkip = '0';
                
                // Parse bỏ trận từ argument cuối cùng
                if (args[timeStartIndex + 4]) {
                    const skipInput = args[timeStartIndex + 4];
                    const skipData = parseSkipMatches(skipInput);
                    if (!skipData.isValid) {
                        return api.sendMessage(`❌ ${skipData.error}`, threadID, messageID);
                    }
                    matchesToSkip = skipInput;
                }
                
                const nameAndKeyArgs = args.slice(1, timeStartIndex);
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
                let layoutMessage = `🎨 Đã nhận đủ thông tin:\n` +
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
                        data, type: 'choose_layout_final'
                    });
                }, messageID);
            }
        }
    }
    
    // --- Nếu không phải lệnh đầy đủ, xử lý theo quy trình menu (hỗ trợ định dạng mới) ---
    const accountId = args[0];
    let customName = '';
    let logoApiKey = '';
    let matchesToSkip = '0';
    let nameAndKeyArgs = args.slice(1);

    if (nameAndKeyArgs.length > 0) {
        const lastArg = nameAndKeyArgs[nameAndKeyArgs.length - 1];
        
        // Kiểm tra xem argument cuối có phải là skip pattern không
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
    let layoutMessage = `🎨 Vui lòng chọn layout cho BXH:\n\n` + 
        Object.keys(LAYOUT_DISPLAY_NAMES).map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l]}`).join('\n') + 
        `\n\n🔢 Bỏ trận: ${formatSkipDescription(skipData)}\n👉 Phản hồi bằng số.`;
        
    return api.sendMessage(layoutMessage, threadID, (err, info) => {
        if (err) return console.error(err);
        if (!clientObject.handleReply) clientObject.handleReply = [];
        clientObject.handleReply.push({
            name: this.config.name, messageID: info.messageID, author: senderID,
            data: { accountId, customName, logoApiKey, matchesToSkip }, type: 'choose_layout_menu'
        });
    }, messageID);
};

// ----- HÀM XỬ LÝ PHẢN HỒI - CẬP NHẬT HỖ TRỢ TẤT CẢ ĐỊNH DẠNG BỎ TRẬN -----
module.exports.handleReply = async function({ api, event, handleReply, global }) {
    if (event.senderID !== handleReply.author) return;
    const { threadID, messageID, body } = event;
    const clientObject = getClient(global);
    
    api.unsendMessage(handleReply.messageID).catch(() => {});
    const choice = parseInt(body);
    if (isNaN(choice)) return api.sendMessage("⚠️ Lựa chọn không hợp lệ.", threadID, messageID);

    let { data } = handleReply;
    data.matchesToSkip = data.matchesToSkip || '0';

    if (handleReply.type === 'choose_layout_final') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ Lựa chọn layout không hợp lệ.", threadID, messageID);
        data.layoutName = layouts[choice - 1];
        return callApiAndSend(api, event, data);
    }
    
    if (handleReply.type === 'choose_layout_menu') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (choice < 1 || choice > layouts.length) return api.sendMessage("⚠️ Lựa chọn layout không hợp lệ.", threadID, messageID);
        data.layoutName = layouts[choice - 1];

        const skipData = parseSkipMatches(data.matchesToSkip);
        let timeMessage = `📊 Vui lòng chọn khung giờ:\n\n` + 
            timeSlots.map((s, i) => `${i + 1}. ${s.label}`).join('\n') + 
            `\n\n🔢 Bỏ trận: ${formatSkipDescription(skipData)}\n👉 Phản hồi bằng số.`;
            
        return api.sendMessage(timeMessage, threadID, (err, info) => {
            if (err) return console.error(err);
            if (!clientObject.handleReply) clientObject.handleReply = [];
            clientObject.handleReply.push({ 
                name: this.config.name, messageID: info.messageID, author: event.senderID, 
                data, type: 'choose_time_menu' 
            });
        }, messageID);
    }

    // Xử lý chọn khung giờ
    if (handleReply.type === 'choose_time_menu') {
        if (choice < 1 || choice > timeSlots.length) return api.sendMessage("⚠️ Lựa chọn khung giờ không hợp lệ.", threadID, messageID);
        
        const slot = timeSlots[choice - 1];
        const today = moment.tz(TIME_ZONE).startOf('day'); // 00:00:00 hôm nay
        
        let startTime, endTime;
        
        if (slot.label === "Cả Ngày Hôm Nay") {
            startTime = today.clone(); // 00:00:00 hôm nay
            endTime = today.clone().endOf('day'); // 23:59:59 hôm nay
        } else if (slot.nextDay) {
            // Khung giờ 22:00 -> 00:00 (qua ngày)
            startTime = today.clone().hour(slot.start.h).minute(slot.start.m);
            endTime = today.clone().add(1, 'day').hour(slot.end.h).minute(slot.end.m);
        } else {
            // Khung giờ bình thường trong ngày
            startTime = today.clone().hour(slot.start.h).minute(slot.start.m);
            endTime = today.clone().hour(slot.end.h).minute(slot.end.m);
        }
        
        console.log(`[TIME FIX] Slot: ${slot.label}`);
        console.log(`[TIME FIX] Start: ${startTime.format('DD/MM/YYYY HH:mm')}`);
        console.log(`[TIME FIX] End: ${endTime.format('DD/MM/YYYY HH:mm')}`);
        
        const payload = { ...data, startTime: startTime.format(), endTime: endTime.format() };
        return callApiAndSend(api, event, payload);
    }

    // ===== XỬ LÝ MENU BỎ TRẬN NÂNG CAO =====
    
    if (handleReply.type === 'choose_skip_method') {
        const skipOptions = [
            { type: 'none', label: 'Không bỏ trận nào', value: '0' },
            { type: 'count', label: 'Bỏ theo số lượng (VD: 3 trận mới nhất)', value: 'count_input' },
            { type: 'range', label: 'Bỏ theo khoảng (VD: trận 1-5)', value: 'range_input' },
            { type: 'discrete', label: 'Bỏ trận rời rạc (VD: trận 2,4,6)', value: 'discrete_input' }
        ];
        
        if (choice < 1 || choice > skipOptions.length) {
            return api.sendMessage("⚠️ Lựa chọn không hợp lệ.", threadID, messageID);
        }
        
        const selectedOption = skipOptions[choice - 1];
        
        if (selectedOption.value === '0') {
            data.matchesToSkip = '0';
            data.layoutName = handleReply.pendingLayoutName;
            const payload = { ...data, startTime: handleReply.pendingStartTime, endTime: handleReply.pendingEndTime };
            return callApiAndSend(api, event, payload);
        } else if (selectedOption.value === 'count_input') {
            let inputMessage = `🔢 Nhập số trận muốn bỏ (từ mới nhất):\n\n`;
            inputMessage += `VD: Nhập "3" để bỏ 3 trận mới nhất\n`;
            inputMessage += `📌 Nhập số từ 1-20`;
            
            return api.sendMessage(inputMessage, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    name: this.config.name, messageID: info.messageID, author: event.senderID,
                    data, type: 'input_count_skip',
                    pendingLayoutName: handleReply.pendingLayoutName,
                    pendingStartTime: handleReply.pendingStartTime,
                    pendingEndTime: handleReply.pendingEndTime
                });
            }, messageID);
        } else if (selectedOption.value === 'range_input') {
            let inputMessage = `🎯 Nhập khoảng trận muốn bỏ (định dạng: X-Y):\n\n`;
            inputMessage += `VD: "1-3" để bỏ trận 1,2,3\n`;
            inputMessage += `VD: "2-2" để chỉ bỏ trận thứ 2\n`;
            inputMessage += `📌 X và Y phải >= 1, và X <= Y`;
            
            return api.sendMessage(inputMessage, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    name: this.config.name, messageID: info.messageID, author: event.senderID,
                    data, type: 'input_range_skip',
                    pendingLayoutName: handleReply.pendingLayoutName,
                    pendingStartTime: handleReply.pendingStartTime,
                    pendingEndTime: handleReply.pendingEndTime
                });
            }, messageID);
        } else if (selectedOption.value === 'discrete_input') {
            let inputMessage = `🎲 Nhập danh sách trận muốn bỏ (định dạng: X,Y,Z):\n\n`;
            inputMessage += `VD: "2,4,6" để bỏ trận 2, 4, 6\n`;
            inputMessage += `VD: "1,3,5,7" để bỏ trận 1, 3, 5, 7\n`;
            inputMessage += `📌 Các số phải >= 1, cách nhau bằng dấu phẩy`;
            
            return api.sendMessage(inputMessage, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    name: this.config.name, messageID: info.messageID, author: event.senderID,
                    data, type: 'input_discrete_skip',
                    pendingLayoutName: handleReply.pendingLayoutName,
                    pendingStartTime: handleReply.pendingStartTime,
                    pendingEndTime: handleReply.pendingEndTime
                });
            }, messageID);
        }
    }
    
    // Xử lý nhập số trận bỏ
    if (handleReply.type === 'input_count_skip') {
        const skipCount = parseInt(body.trim(), 10);
        if (isNaN(skipCount) || skipCount < 1 || skipCount > 20) {
            return api.sendMessage("⚠️ Vui lòng nhập số hợp lệ từ 1-20.", threadID, messageID);
        }
        
        data.matchesToSkip = skipCount.toString();
        data.layoutName = handleReply.pendingLayoutName;
        const payload = { ...data, startTime: handleReply.pendingStartTime, endTime: handleReply.pendingEndTime };
        return callApiAndSend(api, event, payload);
    }
    
    // Xử lý nhập range trận bỏ
    if (handleReply.type === 'input_range_skip') {
        const rangeInput = body.trim();
        const skipData = parseSkipMatches(rangeInput);
        
        if (!skipData.isValid || skipData.type !== 'range') {
            return api.sendMessage(`⚠️ ${skipData.error || 'Định dạng range không hợp lệ. VD: 1-3, 2-5'}`, threadID, messageID);
        }
        
        data.matchesToSkip = rangeInput;
        data.layoutName = handleReply.pendingLayoutName;
        const payload = { ...data, startTime: handleReply.pendingStartTime, endTime: handleReply.pendingEndTime };
        return callApiAndSend(api, event, payload);
    }
    
    // Xử lý nhập danh sách trận rời rạc
    if (handleReply.type === 'input_discrete_skip') {
        const discreteInput = body.trim();
        const skipData = parseSkipMatches(discreteInput);
        
        if (!skipData.isValid || skipData.type !== 'discrete') {
            return api.sendMessage(`⚠️ ${skipData.error || 'Định dạng danh sách không hợp lệ. VD: 2,4,6 hoặc 1,3,5,7'}`, threadID, messageID);
        }
        
        data.matchesToSkip = discreteInput;
        data.layoutName = handleReply.pendingLayoutName;
        const payload = { ...data, startTime: handleReply.pendingStartTime, endTime: handleReply.pendingEndTime };
        return callApiAndSend(api, event, payload);
    }
};

// ===== HÀM HỖ TRỢ CHO MENU BỎ TRẬN NÂNG CAO =====

// Thêm option để người dùng có thể chọn cách bỏ trận trong menu
function showSkipMatchesMenu(api, event, clientObject, data, layoutName, startTime, endTime) {
    const { threadID, messageID, senderID } = event;
    
    let skipMessage = `🎯 Chọn cách bỏ trận đấu:\n\n`;
    skipMessage += `1. Không bỏ trận nào\n`;
    skipMessage += `2. Bỏ theo số lượng (VD: 3 trận mới nhất)\n`;
    skipMessage += `3. Bỏ theo khoảng (VD: trận 1-5)\n`;
    skipMessage += `4. Bỏ trận rời rạc (VD: trận 2,4,6)\n\n`;
    skipMessage += `💡 Bỏ trận giúp loại bỏ các trận không mong muốn khỏi BXH\n`;
    skipMessage += `👉 Phản hồi bằng số.`;
    
    return api.sendMessage(skipMessage, threadID, (err, info) => {
        if (err) return console.error(err);
        if (!clientObject.handleReply) clientObject.handleReply = [];
        clientObject.handleReply.push({
            name: 'ffrank', messageID: info.messageID, author: senderID,
            data, type: 'choose_skip_method',
            pendingLayoutName: layoutName,
            pendingStartTime: startTime,
            pendingEndTime: endTime
        });
    }, messageID);
}