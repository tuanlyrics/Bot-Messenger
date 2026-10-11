/**
 * @name setlogo
 * @version 11.0 (Cải tiến - Lệnh tiếng Việt & Logic API Key)
 * @description Hệ thống quản lý Logo Team với lệnh tiếng Việt và logic rõ ràng
 * @author Pcoder
 */

const axios = require('axios');
const FormData = require('form-data');
const moment = require('moment-timezone');

// --- CẤU HÌNH ---
const WEB_API_URL = 'https://spn.io.vn/Ajaxs/manage_keys_api.php';
const BOT_TO_WEB_API_KEY = "Pcoder1234567890987654321";

// --- QUẢN LÝ CACHE VÀ RATE LIMIT ---
const userLastRequest = new Map();
const userCache = new Map();
const REQUEST_COOLDOWN = 2000; // 2 giây
const CACHE_DURATION = 120000; // 2 phút

// =================================================================
// MODULE CONFIG
// =================================================================
module.exports.config = {
    name: "setlogo",
    version: "11.0",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Quản lý Logo Team với lệnh tiếng Việt",
    commandCategory: "Tiện ích",
    usages: [
        "🔑 QUẢN LÝ API KEY",
        "• setlogo key - Danh sách API key của bạn",
        "• setlogo thongtin - Thông tin chi tiết tài khoản",
        "• setlogo du - Kiểm tra số dư",
        "",
        "💰 MUA KEY",
        "• setlogo thue tuan <tên_key> (reply ảnh) - Thuê key 1 tuần",
        "• setlogo thue thang <tên_key> (reply ảnh) - Thuê key 1 tháng",
        "",
        "👥 QUẢN LÝ LOGO TEAM",
        "• setlogo them <api_key> <tên_team> <id1> <id2>... (reply ảnh)",
        "• setlogo danhsach - Danh sách logo đã tạo", 
        "• setlogo xoa <số_thứ_tự> - Xóa logo theo STT",
        "• setlogo xem <số_thứ_tự> - Xem chi tiết logo",
        "",
        "🤖 TÍNH NĂNG AI XÓA NỀN",
        "• setlogo xoanen <api_key> <tên_team> <id1>... (reply ảnh)",
        "",
        "💡 HƯỚNG DẪN",
        "• setlogo huongdan - Hướng dẫn chi tiết sử dụng",
        "",
        "📝 CHÚ THÍCH:",
        "- API Key: Cần mua key trước khi thêm logo",
        "- Key có thời hạn sử dụng (tuần/tháng)",
        "- Mỗi key có thể tạo nhiều logo team"
    ].join('\n'),
    cooldowns: 2,
};

// =================================================================
// UTILITY FUNCTIONS
// =================================================================
function formatCurrency(amount) { 
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ'; 
}

function formatDate(dateString) { 
    if (!dateString) return 'Không giới hạn';
    return moment(dateString).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = moment(dateString).tz('Asia/Ho_Chi_Minh');
    const now = moment();
    const diff = date.diff(now, 'days');
    
    if (diff < 0) return '(Đã hết hạn)';
    if (diff === 0) return '(Hết hạn hôm nay)';
    if (diff === 1) return '(Hết hạn ngày mai)';
    return `(Còn ${diff} ngày)`;
}

function validateTeamName(name) {
    return name && typeof name === 'string' && 
           name.trim().length >= 2 && name.trim().length <= 50 &&
           /^[a-zA-Z0-9_\s\u00C0-\u1EF9]+$/.test(name.trim());
}

function validatePlayerIds(ids) {
    return Array.isArray(ids) && ids.length > 0 && ids.length <= 20 &&
           ids.every(id => /^\d+$/.test(id.toString().trim()));
}

function validateKeyName(name) {
    return name && typeof name === 'string' && 
           name.trim().length >= 3 && name.trim().length <= 50 &&
           /^[a-zA-Z0-9_]+$/.test(name.trim());
}

function validateApiKey(key) {
    return key && typeof key === 'string' && 
           key.trim().length > 6 && key.startsWith('spn_');
}

function checkRateLimit(userId) {
    const lastRequest = userLastRequest.get(userId);
    const now = Date.now();
    if (lastRequest && (now - lastRequest) < REQUEST_COOLDOWN) {
        return { 
            allowed: false, 
            remaining: Math.ceil((REQUEST_COOLDOWN - (now - lastRequest)) / 1000) 
        };
    }
    userLastRequest.set(userId, now);
    return { allowed: true };
}

function clearUserCache(userId) {
    const patterns = [`user_${userId}`, `keys_${userId}`, `teams_${userId}`];
    patterns.forEach(pattern => {
        for (const key of userCache.keys()) {
            if (key.includes(pattern)) {
                userCache.delete(key);
            }
        }
    });
}

async function makeApiRequest(data, method = 'POST') {
    const headers = {
        'X-Bot-Auth-Key': BOT_TO_WEB_API_KEY,
        'User-Agent': 'SetLogBot/11.0',
        'Accept': 'application/json'
    };

    try {
        if (method.toUpperCase() === 'GET') {
            const response = await axios.get(WEB_API_URL, {
                params: data,
                headers,
                timeout: 30000
            });
            return response.data;
        } else {
            const form = new FormData();
            for (const key in data) {
                if (key === 'logo_buffer' && data[key]) {
                    form.append('logo', data[key], { 
                        filename: 'logo.jpg', 
                        contentType: 'image/jpeg' 
                    });
                } else if (Array.isArray(data[key])) {
                    form.append(key, JSON.stringify(data[key]));
                } else if (data[key] !== null && data[key] !== undefined) {
                    form.append(key, data[key]);
                }
            }

            const response = await axios.post(WEB_API_URL, form, {
                headers: { ...headers, ...form.getHeaders() },
                timeout: 90000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            return response.data;
        }
    } catch (error) {
        console.error('[SETLOGO API ERROR]:', error.response?.data || error.message);

        if (error.code === 'ECONNABORTED') {
            throw new Error('Yêu cầu quá lâu (có thể do AI đang xử lý), vui lòng thử lại sau.');
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('Tài khoản chưa được liên kết với web. Vui lòng dùng lệnh ".verify" để liên kết.');
        }
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }

        throw new Error('Không thể kết nối server. Vui lòng thử lại sau.');
    }
}

async function getUserKeys(userId) {
    const cacheKey = `keys_${userId}`;
    let cached = userCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }

    try {
        const result = await makeApiRequest({
            action: 'get_my_keys',
            userId: userId
        }, 'GET');

        if (result.success) {
            userCache.set(cacheKey, { 
                data: result, 
                timestamp: Date.now() 
            });
        }
        
        return result;
    } catch (error) {
        return { success: false, message: error.message, keys: [] };
    }
}

async function getUserTeams(userId, apiKey = null) {
    const cacheKey = `teams_${userId}_${apiKey || 'all'}`;
    let cached = userCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }

    try {
        const requestData = {
            action: apiKey ? 'get_team_logos' : 'get_all_user_teams',
            userId: userId
        };
        
        if (apiKey) {
            requestData.apiKey = apiKey;
        }

        const result = await makeApiRequest(requestData, 'GET');

        if (result.success) {
            userCache.set(cacheKey, { 
                data: result, 
                timestamp: Date.now() 
            });
        }
        
        return result;
    } catch (error) {
        return { success: false, message: error.message, teams: [] };
    }
}

// =================================================================
// MAIN RUN FUNCTION
// =================================================================
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();

    // Rate limit check
    const rateLimitCheck = checkRateLimit(senderID);
    if (!rateLimitCheck.allowed) {
        return api.sendMessage(
            `⏱️ Vui lòng đợi ${rateLimitCheck.remaining} giây trước khi thực hiện lệnh tiếp theo.`, 
            threadID, messageID
        );
    }

    // Show help if no command
    if (!command || command === 'huongdan') {
        return api.sendMessage(
            `📚 HƯỚNG DẪN SỬ DỤNG SETLOGO\n\n` +
            `🔄 QUY TRÌNH SỬ DỤNG:\n` +
            `1️⃣ Mua API key: setlogo thue tuan/thang <tên>\n` +
            `2️⃣ Thêm logo: setlogo them <key> <tên_team> <id1> <id2>\n` +
            `3️⃣ Quản lý: setlogo danhsach, xem, xoa\n\n` +
            `💡 LỆNH CHỦ YẾU:\n` +
            `🔑 setlogo key - Xem API keys\n` +
            `💰 setlogo thue tuan/thang <tên> - Mua key\n` +
            `👥 setlogo them <key> <team> <id>... - Thêm logo\n` +
            `🤖 setlogo xoanen <key> <team> <id>... - AI xóa nền\n` +
            `📋 setlogo danhsach - Xem danh sách\n` +
            `ℹ️ setlogo thongtin - Thông tin tài khoản\n\n` +
            this.config.usages, 
            threadID, messageID
        );
    }

    try {
        switch (command) {
            case 'key': {
                api.sendMessage("⏳ Đang lấy thông tin API key...", threadID);
                
                const result = await getUserKeys(senderID);
                if (!result.success) {
                    return api.sendMessage(
                        `❌ CHƯA LIÊN KẾT TÀI KHOẢN\n\n` +
                        `${result.message}\n\n` +
                        `🔗 Vui lòng dùng lệnh: .verify [mã OTP]\n` +
                        `📱 Lấy OTP tại: https://spn.io.vn`,
                        threadID, messageID
                    );
                }

                if (!result.keys || result.keys.length === 0) {
                    return api.sendMessage(
                        `📝 CHƯA CÓ API KEY\n\n` +
                        `Bạn chưa mua key nào. Mua key ngay:\n` +
                        `💰 setlogo thue tuan <tên_key> (reply ảnh)\n` +
                        `💰 setlogo thue thang <tên_key> (reply ảnh)\n\n` +
                        `🌐 Hoặc tạo tại: https://spn.io.vn/create/setkey`,
                        threadID, messageID
                    );
                }

                let message = `🔑 API KEY CỦA BẠN (${result.keys.length})\n\n`;
                result.keys.forEach((key, index) => {
                    const isActive = moment(key.expiry_date).isAfter(moment());
                    const status = isActive ? '🟢 Hoạt động' : '🔴 Hết hạn';
                    const timeInfo = formatRelativeTime(key.expiry_date);
                    
                    message += `${index + 1}. ${key.name}\n`;
                    message += `   🔑 Key: ${key.api_key}\n`;
                    message += `   📅 Hạn: ${formatDate(key.expiry_date)} ${timeInfo}\n`;
                    message += `   ${status}\n\n`;
                });
                
                message += `💡 Mua key mới: setlogo thue tuan/thang <tên>`;
                return api.sendMessage(message, threadID, messageID);
            }

            case 'thongtin': {
                api.sendMessage("⏳ Đang lấy thông tin tài khoản...", threadID);
                
                const keysResult = await getUserKeys(senderID);
                const teamsResult = await getUserTeams(senderID);
                
                if (!keysResult.success) {
                    return api.sendMessage(
                        `❌ LỖI LIÊN KẾT\n\n${keysResult.message}\n\n` +
                        `🔗 Vui lòng dùng lệnh: .verify [mã OTP]`,
                        threadID, messageID
                    );
                }

                const balanceResult = await makeApiRequest({
                    action: 'get_user_info',
                    userId: senderID
                }, 'GET');

                let message = `👤 THÔNG TIN TÀI KHOẢN\n\n`;
                message += `💳 Số dư: ${formatCurrency(balanceResult.balance || 0)}\n`;
                message += `🔑 API Keys: ${keysResult.keys?.length || 0}\n`;
                message += `👥 Logo teams: ${teamsResult.teams?.length || 0}\n\n`;
                
                if (keysResult.keys && keysResult.keys.length > 0) {
                    message += `📋 TRẠNG THÁI KEYS:\n`;
                    keysResult.keys.forEach((key, index) => {
                        const isActive = moment(key.expiry_date).isAfter(moment());
                        const status = isActive ? '🟢' : '🔴';
                        const timeLeft = formatRelativeTime(key.expiry_date);
                        message += `${status} ${key.name} ${timeLeft}\n`;
                    });
                }

                message += `\n🌐 Quản lý tại: https://spn.io.vn`;
                return api.sendMessage(message, threadID, messageID);
            }

            case 'du': {
                const result = await makeApiRequest({ 
                    action: 'get_user_info', 
                    userId: senderID 
                }, 'GET');
                
                if (!result.success) {
                    return api.sendMessage(
                        `❌ CHƯA LIÊN KẾT TÀI KHOẢN\n\n` +
                        `${result.message}\n\n` +
                        `🔗 Vui lòng dùng lệnh: .verify [mã OTP]`,
                        threadID, messageID
                    );
                }
                
                return api.sendMessage(
                    `💰 SỐ DƯ TÀI KHOẢN\n\n` +
                    `💳 Số dư hiện tại: ${formatCurrency(result.balance)}\n` +
                    `📊 Trạng thái: ${result.balance > 0 ? '🟢 Khả dụng' : '🔴 Cần nạp tiền'}\n\n` +
                    `🌐 Nạp tiền tại: https://spn.io.vn`,
                    threadID, messageID
                );
            }

            case 'thue': {
                const type = args[1]?.toLowerCase();
                const keyName = args.slice(2).join(' ').trim();
                
                if (!type || !['tuan', 'thang'].includes(type)) {
                    return api.sendMessage(
                        `⚠️ CÁCH THUÊ KEY\n\n` +
                        `📝 Cú pháp: setlogo thue <tuan/thang> <tên_key>\n` +
                        `📸 Phải reply vào ảnh logo mặc định\n\n` +
                        `💰 Giá:\n` +
                        `• Gói tuần: 1,000đ (7 ngày)\n` +
                        `• Gói tháng: 5,000đ (30 ngày)\n\n` +
                        `💡 Ví dụ: setlogo thue tuan tournament2025`,
                        threadID, messageID
                    );
                }
                
                if (!validateKeyName(keyName)) {
                    return api.sendMessage(
                        `❌ TÊN KEY KHÔNG HỢP LỆ\n\n` +
                        `📝 Tên key phải có từ 3-50 ký tự\n` +
                        `✅ Chỉ được chứa: chữ cái, số, dấu gạch dưới\n` +
                        `💡 Tên hiện tại: "${keyName}"\n\n` +
                        `✅ Ví dụ hợp lệ: tournament_2025, teamlogo_vip`,
                        threadID, messageID
                    );
                }
                
                if (event.type !== "message_reply" || !event.messageReply.attachments?.some(a => a.type === "photo")) {
                    return api.sendMessage(
                        `📸 THIẾU ẢNH LOGO MẶC ĐỊNH\n\n` +
                        `❗ Bạn cần reply (trả lời) vào ảnh logo mặc định trước khi thuê key\n\n` +
                        `📋 Các bước thực hiện:\n` +
                        `1️⃣ Reply vào ảnh logo mặc định\n` +
                        `2️⃣ Gõ: setlogo thue ${type} ${keyName}`,
                        threadID, messageID
                    );
                }
                
                const logoUrl = event.messageReply.attachments.find(a => a.type === "photo").url;
                const cost = type === 'tuan' ? 500 : 2000;
                const typeText = type === 'tuan' ? 'tuần' : 'tháng';
                
                let statusMsg = `⏳ ĐANG TẠO KEY\n\n`;
                statusMsg += `🔑 Tên key: ${keyName}\n`;
                statusMsg += `📦 Gói: ${typeText} (${type === 'tuan' ? '7' : '30'} ngày)\n`;
                statusMsg += `💰 Chi phí: ${formatCurrency(cost)}\n`;
                statusMsg += `📸 Đang tải và xử lý logo...`;
                
                api.sendMessage(statusMsg, threadID);

                // Download logo
                const logoResponse = await axios.get(logoUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 30000 
                });
                
                const result = await makeApiRequest({
                    action: 'create_key',
                    userId: senderID,
                    name: keyName,
                    type: type === 'tuan' ? 'week' : 'month',
                    logo_buffer: logoResponse.data
                });
                
                if (!result.success) throw new Error(result.message);

                clearUserCache(senderID);
                
                let successMsg = `✅ THUÊ KEY THÀNH CÔNG!\n\n`;
                successMsg += `🔑 Tên key: ${keyName}\n`;
                successMsg += `🆔 API Key: ${result.apiKey}\n`;
                successMsg += `📅 Hết hạn: ${formatDate(result.expiryDate)}\n`;
                successMsg += `💰 Đã trừ: ${formatCurrency(result.cost)}\n`;
                successMsg += `💳 Số dư còn: ${formatCurrency(result.newBalance)}\n\n`;
                successMsg += `🎉 Key đã sẵn sàng để thêm logo team!\n`;
                successMsg += `💡 Thêm logo: setlogo them ${result.apiKey} <tên_team> <id1> <id2>...`;
                
                return api.sendMessage(successMsg, threadID, messageID);
            }

            case 'danhsach': {
                api.sendMessage("⏳ Đang tải danh sách logo...", threadID);
                
                const result = await getUserTeams(senderID);
                
                if (!result.success) {
                    return api.sendMessage(
                        `❌ CHƯA LIÊN KẾT TÀI KHOẢN\n\n` +
                        `${result.message}\n\n` +
                        `🔗 Vui lòng dùng lệnh: .verify [mã OTP]`,
                        threadID, messageID
                    );
                }
                
                if (!result.teams || result.teams.length === 0) {
                    return api.sendMessage(
                        `📝 CHƯA CÓ LOGO NÀO\n\n` +
                        `Hãy thêm logo đầu tiên:\n` +
                        `1️⃣ Mua key: setlogo thue tuan/thang <tên>\n` +
                        `2️⃣ Thêm logo: setlogo them <key> <team> <id1> <id2>...\n` +
                        `🤖 Hoặc với AI: setlogo xoanen <key> <team> <id1>...\n` +
                        `📸 Nhớ reply vào ảnh logo\n\n` +
                        `💡 Ví dụ: setlogo them spn_teamvip TeamA 123456 789012`,
                        threadID, messageID
                    );
                }
                
                let message = `👥 DANH SÁCH LOGO TEAM (${result.teams.length})\n\n`;
                result.teams.forEach((team, index) => {
                    const playerIds = JSON.parse(team.player_ids || '[]');
                    
                    message += `${index + 1}. ${team.team_name}\n`;
                    message += `   🔑 Key: ${team.api_key || 'Auto'}\n`;
                    message += `   👥 IDs (${playerIds.length}): ${playerIds.slice(0, 3).join(', ')}${playerIds.length > 3 ? '...' : ''}\n`;
                    message += `   📅 Tạo: ${formatDate(team.created_at)}\n\n`;
                });
                
                message += `💡 Xem chi tiết: setlogo xem <số>\n`;
                message += `🗑️ Xóa logo: setlogo xoa <số>`;
                
                return api.sendMessage(message, threadID, messageID);
            }

            case 'them':
            case 'xoanen': {
                if (args.length < 4) {
                    return api.sendMessage(
                        `⚠️ CÁCH SỬ DỤNG\n\n` +
                        `📝 Cú pháp: setlogo ${command} <api_key> <tên_team> <id1> <id2>...\n` +
                        `📸 Phải reply vào ảnh logo\n\n` +
                        `${command === 'xoanen' ? '🤖 Tự động xóa nền bằng AI (mất 30-60s)\n' : ''}` +
                        `💡 Ví dụ: setlogo ${command} spn_teamvip "Team Việt Nam" 123456 789012`,
                        threadID, messageID
                    );
                }

                if (event.type !== "message_reply" || !event.messageReply.attachments?.some(a => a.type === "photo")) {
                    return api.sendMessage(
                        `📸 THIẾU ẢNH LOGO\n\n` +
                        `❗ Bạn cần reply (trả lời) vào ảnh logo trước khi gõ lệnh\n\n` +
                        `📋 Các bước thực hiện:\n` +
                        `1️⃣ Reply vào ảnh logo team\n` +
                        `2️⃣ Gõ: setlogo ${command} <api_key> <tên> <id1> <id2>...`,
                        threadID, messageID
                    );
                }

                const apiKey = args[1];
                
                if (!validateApiKey(apiKey)) {
                    return api.sendMessage(
                        `❌ API KEY KHÔNG HỢP LỆ\n\n` +
                        `🔑 API key phải bắt đầu bằng "spn_" và có độ dài phù hợp\n` +
                        `💡 Key hiện tại: "${apiKey}"\n\n` +
                        `📋 Xem key của bạn: setlogo key\n` +
                        `💰 Mua key mới: setlogo thue tuan/thang <tên>`,
                        threadID, messageID
                    );
                }

                // Parse arguments
                let teamName = '';
                let playerIds = [];
                
                const remainingArgs = args.slice(2);
                const fullArgs = remainingArgs.join(' ');
                const quotedMatch = fullArgs.match(/^"([^"]+)"\s+(.+)$/);
                
                if (quotedMatch) {
                    teamName = quotedMatch[1];
                    playerIds = quotedMatch[2].split(/\s+/).filter(id => /^\d+$/.test(id));
                } else {
                    const firstIdIndex = remainingArgs.findIndex(arg => /^\d+$/.test(arg));
                    if (firstIdIndex === -1) {
                        return api.sendMessage(
                            `🆔 THIẾU ID THÀNH VIÊN\n\n` +
                            `❗ Vui lòng cung cấp ít nhất 1 ID thành viên\n` +
                            `📝 Với tên team có dấu cách: "${apiKey}" "Tên Team" id1 id2\n` +
                            `📝 Với tên team không dấu cách: ${apiKey} TeamName id1 id2\n\n` +
                            `💡 Ví dụ: setlogo them ${apiKey} "Team Việt Nam" 123456 789012`,
                            threadID, messageID
                        );
                    }
                    
                    teamName = remainingArgs.slice(0, firstIdIndex).join(" ");
                    playerIds = remainingArgs.slice(firstIdIndex);
                }

                if (!validateTeamName(teamName)) {
                    return api.sendMessage(
                        `❌ TÊN TEAM KHÔNG HỢP LỆ\n\n` +
                        `📝 Tên team phải có từ 2-50 ký tự\n` +
                        `✅ Hỗ trợ tiếng Việt có dấu\n` +
                        `💡 Tên hiện tại: "${teamName}"\n\n` +
                        `✅ Ví dụ hợp lệ: "Team Việt Nam", "Đội Bóng ABC"`,
                        threadID, messageID
                    );
                }

                if (!validatePlayerIds(playerIds)) {
                    return api.sendMessage(
                        `🆔 ID KHÔNG HỢP LỆ\n\n` +
                        `❗ Tất cả ID phải là số (1-20 ID)\n` +
                        `📝 IDs nhận được: ${playerIds.join(', ')}\n\n` +
                        `💡 Ví dụ đúng: 123456 789012 555333`,
                        threadID, messageID
                    );
                }

                const logoUrl = event.messageReply.attachments.find(a => a.type === "photo").url;
                
                let statusMsg = `⏳ ĐANG XỬ LÝ LOGO\n\n`;
                statusMsg += `🔑 API Key: ${apiKey}\n`;
                statusMsg += `👥 Team: ${teamName}\n`;
                statusMsg += `🆔 Số thành viên: ${playerIds.length}\n`;
                statusMsg += `🆔 IDs: ${playerIds.slice(0, 5).join(', ')}${playerIds.length > 5 ? '...' : ''}\n`;
                statusMsg += `📸 Đang tải và xử lý logo...`;
                
                if (command === 'xoanen') {
                    statusMsg += `\n🤖 AI sẽ tự động xóa nền (có thể mất 30-90s)`;
                    statusMsg += `\n⚠️ Vui lòng kiên nhẫn chờ đợi...`;
                }
                
                api.sendMessage(statusMsg, threadID);

                // Download logo
                const logoResponse = await axios.get(logoUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 30000 
                });
                
                const apiData = { 
                    action: 'add_team_logo', 
                    userId: senderID,
                    apiKey: apiKey,
                    teamName: teamName.trim(), 
                    playerIds: playerIds.join(' '),
                    logo_buffer: logoResponse.data
                };
                
                if (command === 'xoanen') {
                    apiData.removeBg = '1';
                }

                const result = await makeApiRequest(apiData);
                
                if (!result.success) throw new Error(result.message);

                clearUserCache(senderID);
                
                let successMsg = `✅ THÊM LOGO THÀNH CÔNG!\n\n`;
                successMsg += `🔑 API Key: ${apiKey}\n`;
                successMsg += `👥 Team: ${teamName}\n`;
                successMsg += `👤 Số thành viên: ${playerIds.length}\n`;
                successMsg += `🆔 Player IDs: ${playerIds.slice(0, 5).join(', ')}${playerIds.length > 5 ? '...' : ''}\n`;
                
                if (command === 'xoanen') {
                    if (result.message.includes('Cảnh báo:') || result.message.includes('fallback')) {
                        successMsg += `\n⚠️ ${result.message}`;
                    } else {
                        successMsg += `\n🤖 AI đã xóa nền tự động thành công!`;
                    }
                }
                
                successMsg += `\n\n📋 Xem danh sách: setlogo danhsach`;
                
                return api.sendMessage(successMsg, threadID, messageID);
            }

            case 'xem': {
                const indexToView = parseInt(args[1]);
                if (!indexToView || indexToView < 1) {
                    return api.sendMessage(
                        `⚠️ SỐ THỨ TỰ KHÔNG HỢP LỆ\n\n` +
                        `📝 Cú pháp: setlogo xem <số_thứ_tự>\n` +
                        `📋 Xem danh sách: setlogo danhsach`,
                        threadID, messageID
                    );
                }

                const result = await getUserTeams(senderID);
                
                if (!result.success) throw new Error(result.message);
                
                if (!result.teams || result.teams.length === 0) {
                    return api.sendMessage(`📝 Bạn chưa có logo nào.`, threadID, messageID);
                }

                const team = result.teams[indexToView - 1];
                if (!team) {
                    return api.sendMessage(
                        `❌ Không tìm thấy logo thứ ${indexToView}.\n` +
                        `📊 Bạn có tổng cộng ${result.teams.length} logo.`,
                        threadID, messageID
                    );
                }

                const playerIds = JSON.parse(team.player_ids || '[]');
                let message = `📋 CHI TIẾT LOGO #${indexToView}\n\n`;
                message += `👥 Tên team: ${team.team_name}\n`;
                message += `🔑 API Key: ${team.api_key || 'Auto'}\n`;
                message += `👤 Số thành viên: ${playerIds.length}\n`;
                message += `🆔 Player IDs:\n`;
                
                if (playerIds.length <= 10) {
                    message += playerIds.join(', ');
                } else {
                    message += playerIds.slice(0, 10).join(', ') + `\n(và ${playerIds.length - 10} ID khác...)`;
                }
                
                message += `\n\n📅 Tạo lúc: ${formatDate(team.created_at)}\n`;
                message += `🖼️ Logo: ${team.logo_path ? 'Đã upload' : 'Có sẵn'}`;

                return api.sendMessage(message, threadID, messageID);
            }

            case 'xoa': {
                const indexToDelete = parseInt(args[1]);
                if (!indexToDelete || indexToDelete < 1) {
                    return api.sendMessage(
                        `⚠️ SỐ THỨ TỰ KHÔNG HỢP LỆ\n\n` +
                        `📝 Cú pháp: setlogo xoa <số_thứ_tự>\n` +
                        `📋 Xem danh sách: setlogo danhsach`,
                        threadID, messageID
                    );
                }

                const listResult = await getUserTeams(senderID);
                
                if (!listResult.success) throw new Error(listResult.message);
                
                if (!listResult.teams || listResult.teams.length === 0) {
                    return api.sendMessage(`📝 Bạn chưa có logo nào để xóa.`, threadID, messageID);
                }

                const teamToDelete = listResult.teams[indexToDelete - 1];
                if (!teamToDelete) {
                    return api.sendMessage(
                        `❌ Không tìm thấy logo thứ ${indexToDelete}.\n` +
                        `📊 Bạn có tổng cộng ${listResult.teams.length} logo.`,
                        threadID, messageID
                    );
                }

                api.sendMessage(
                    `⚠️ XÁC NHẬN XÓA LOGO\n\n` +
                    `👥 Team: ${teamToDelete.team_name}\n` +
                    `🔑 Key: ${teamToDelete.api_key || 'Auto'}\n` +
                    `⏳ Đang xử lý...`,
                    threadID
                );

                const result = await makeApiRequest({ 
                    action: 'delete_team_logo', 
                    userId: senderID, 
                    teamId: teamToDelete.id 
                });
                
                if (!result.success) throw new Error(result.message);

                clearUserCache(senderID);

                return api.sendMessage(
                    `✅ XÓA LOGO THÀNH CÔNG!\n\n` +
                    `🗑️ Đã xóa logo team: ${teamToDelete.team_name}\n` +
                    `📋 Xem danh sách còn lại: setlogo danhsach`,
                    threadID, messageID
                );
            }

            case 'giahan': {
                const indexToRenew = parseInt(args[1]);
                const type = args[2]?.toLowerCase();
                
                if (!indexToRenew || indexToRenew < 1 || !type || !['tuan', 'thang'].includes(type)) {
                    return api.sendMessage(
                        `⚠️ CÁCH GIA HẠN KEY\n\n` +
                        `📝 Cú pháp: setlogo giahan <số_thứ_tự> <tuan/thang>\n` +
                        `💰 Giá: Tuần (1,000đ) | Tháng (5,000đ)\n\n` +
                        `📋 Xem key: setlogo key\n` +
                        `💡 Ví dụ: setlogo giahan 1 thang`,
                        threadID, messageID
                    );
                }

                const keysResult = await getUserKeys(senderID);
                if (!keysResult.success) throw new Error(keysResult.message);
                
                const keyToRenew = keysResult.keys[indexToRenew - 1];
                if (!keyToRenew) {
                    return api.sendMessage(
                        `❌ Không tìm thấy key thứ ${indexToRenew}.\n` +
                        `📊 Bạn có tổng cộng ${keysResult.keys.length} key.`,
                        threadID, messageID
                    );
                }

                const cost = type === 'tuan' ? 1000 : 4000;
                const packageName = type === 'tuan' ? 'gói tuần' : 'gói tháng';
                
                api.sendMessage(
                    `⏳ ĐANG GIA HẠN KEY\n\n` +
                    `🔑 Key: ${keyToRenew.name}\n` +
                    `📦 Gói: ${packageName}\n` +
                    `💰 Chi phí: ${formatCurrency(cost)}\n` +
                    `⏳ Đang xử lý...`,
                    threadID
                );

                const result = await makeApiRequest({
                    action: 'renew_key',
                    userId: senderID,
                    apiKey: keyToRenew.api_key,
                    type: type === 'tuan' ? 'week' : 'month'
                });
                
                if (!result.success) throw new Error(result.message);

                clearUserCache(senderID);
                
                return api.sendMessage(
                    `✅ GIA HẠN THÀNH CÔNG!\n\n` +
                    `🔑 Key: ${keyToRenew.name}\n` +
                    `📅 Hạn cũ: ${formatDate(result.oldExpiry)}\n` +
                    `📅 Hạn mới: ${formatDate(result.newExpiry)}\n` +
                    `💰 Đã trừ: ${formatCurrency(result.cost)}\n` +
                    `💳 Số dư còn: ${formatCurrency(result.newBalance)}`,
                    threadID, messageID
                );
            }

            case 'trangthai': {
                const result = await makeApiRequest({
                    action: 'check_removebg_status',
                    userId: senderID
                }, 'GET');
                
                if (!result.success) throw new Error(result.message);
                
                const status = result.removebg_status;
                let message = `🤖 TRẠNG THÁI AI XÓA NỀN\n\n`;
                message += `📊 Tổng API keys: ${status.total_keys}\n`;
                message += `🟢 Keys hoạt động: ${status.active_keys}\n`;
                message += `📈 Tỷ lệ: ${Math.round((status.active_keys / status.total_keys) * 100)}%\n\n`;
                
                if (status.active_keys > 0) {
                    message += `✅ Tính năng AI xóa nền khả dụng\n`;
                    message += `💡 Sử dụng: setlogo xoanen <key> <tên> <id>...`;
                } else {
                    message += `❌ Tính năng AI tạm thời không khả dụng\n`;
                    message += `🔄 Vui lòng thử lại sau`;
                }
                
                return api.sendMessage(message, threadID, messageID);
            }

            default:
                return api.sendMessage(
                    `❌ LỆNH KHÔNG TỒN TẠI\n\n` +
                    `📖 Xem hướng dẫn: setlogo huongdan\n\n` +
                    `💡 Các lệnh chính:\n` +
                    `🔑 setlogo key - Xem API keys\n` +
                    `💰 setlogo thue tuan/thang <tên> - Thuê key\n` +
                    `👥 setlogo them <key> <tên> <id>... - Thêm logo\n` +
                    `🤖 setlogo xoanen <key> <tên> <id>... - AI xóa nền\n` +
                    `📋 setlogo danhsach - Danh sách logo\n` +
                    `ℹ️ setlogo thongtin - Thông tin tài khoản`,
                    threadID, messageID
                );
        }
    } catch (error) {
        console.error(`[SETLOGO ERROR] Command '${command}' User ${senderID}:`, error.message);
        
        let errorMsg = `❌ CÓ LỖI XẢY RA\n\n`;
        
        if (error.message.includes('chưa được liên kết') || error.message.includes('not linked') || error.message.includes('401') || error.message.includes('403')) {
            errorMsg += `🔗 Tài khoản chưa liên kết với web.\n` +
                      `🔗 Không có quyền sài apikey này.\n` +
                      `📱 Dùng lệnh: .verify [mã OTP]\n` +
                      `🌐 Lấy OTP tại: https://spn.io.vn`;
        } else if (error.message.includes('Số dư không đủ') || error.message.includes('insufficient')) {
            errorMsg += `💳 ${error.message}\n` +
                      `💰 Kiểm tra: setlogo du\n` +
                      `🌐 Nạp tiền: https://spn.io.vn`;
        } else if (error.message.includes('Key không tồn tại') || error.message.includes('hết hạn') || error.message.includes('expired') || error.message.includes('không hợp lệ')) {
            errorMsg += `🔑 ${error.message}\n` +
                      `💰 Thuê key: setlogo thue tuan/thang <tên>\n` +
                      `📋 Xem key: setlogo key\n` +
                      `🌐 Hoặc tại: https://spn.io.vn/apikey-taoanh`;
        } else if (error.message.includes('Yêu cầu quá lâu') || error.message.includes('timeout')) {
            errorMsg += `⏱️ ${error.message}\n` +
                      `💡 Server đang bận hoặc AI đang xử lý.\n` +
                      `🔄 Vui lòng thử lại sau 1-2 phút.`;
        } else if (error.message.includes('đã tồn tại') || error.message.includes('duplicate')) {
            errorMsg += `⚠️ ${error.message}\n` +
                      `💡 Hãy thử tên khác hoặc kiểm tra danh sách hiện có.`;
        } else if (error.message.includes('Remove.bg') || error.message.includes('AI')) {
            errorMsg += `🤖 Lỗi AI xóa nền: ${error.message}\n` +
                      `💡 Thử dùng lệnh "setlogo them" thay vì "xoanen"\n` +
                      `🔍 Kiểm tra: setlogo trangthai`;
        } else {
            errorMsg += `📝 ${error.message}\n` +
                      `🔄 Vui lòng thử lại sau hoặc liên hệ admin.\n\n` +
                      `💡 Nếu bạn mới sử dụng:\n` +
                      `1️⃣ Mua key: setlogo thue tuan/thang <tên>\n` +
                      `2️⃣ Thêm logo: setlogo them <key> <team> <id>...`;
        }
        
        return api.sendMessage(errorMsg, threadID, messageID);
    }
};

// =================================================================
// ADDITIONAL FUNCTIONS
// =================================================================
module.exports.onLoad = function() {
    console.log("✅ Module 'setlogo' version 11.0 loaded successfully.");
    console.log("🇻🇳 Vietnamese commands enabled.");
    console.log("🔗 Web integration enabled with improved API key logic.");
    console.log("🤖 AI Remove Background support enabled.");
    console.log("💰 Quick key rental feature enabled.");
};

module.exports.handleEvent = async function({ api, event, client }) {
    // Có thể thêm xử lý sự kiện đặc biệt nếu cần
    return;
};

module.exports.handleShutdown = async function() {
    console.log("🔄 [SETLOGO] Cleaning up before shutdown...");
    userLastRequest.clear();
    userCache.clear();
    console.log("✅ [SETLOGO] Cleanup completed.");
}; 