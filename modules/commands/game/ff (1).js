// File: modules/commands/ffrank.js (Đã sửa lại để gọi API từ ffrank/api.js)
// được code bởi Gemini & Pcoder

const axios = require('axios');
const moment = require('moment-timezone');

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/ffrank/create'; 
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission'; // API kiểm tra quyền thuê
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Chi phí mỗi lần dùng (chỉ áp dụng khi chưa thuê)
const COST_PER_USE = 300;

// ----- DỮ LIỆU MENU -----
const LAYOUT_DISPLAY_NAMES = {
    'canvas1': 'Layout Tết', 'canvas2': 'Layout Xanh', 'canvas3': 'Layout Xám', 'canvas4': 'Layout Vàng Chanh',
    'canvas5': 'Layout Hồng 4K', 'canvas_hellokitty': 'Layout Hello Kitty', 'canvas_standings': 'Layout Standings (Phải)',
    'canvas_standings_left': 'Layout Standings (Trái)', 'canvas_standings_2': 'Layout Standings 2', 'canvas_overall': 'Layout OverAll',
    'canvas_dcqb': 'Layout DCQB', 'canvas_spn': 'Layout SPN SCRIM', 'canvas_khaixuangiaochien': 'Layout Khai Xuân', 'canvas_vongbang': 'Layout Vòng Bảng', 'canvas_ffws': 'Layout FFWS'
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

// ----- HÀM KIỂM TRA QUYỀN THUÊ (Có hỗ trợ QTV) -----
async function checkRentalPermission(senderID, threadID, isGroup, api = null) {
    try {
        // Xác định target_id: nếu là nhóm thì dùng threadID, nếu chat riêng thì dùng senderID
        const target_id = isGroup ? threadID : senderID;
        
        let adminIDs = [];
        if (isGroup && api) {
            try {
                // Lấy thông tin nhóm để kiểm tra QTV
                const threadInfo = await api.getThreadInfo(threadID);
                adminIDs = (threadInfo.adminIDs || []).map(admin => admin.id);
            } catch (error) {
                console.warn('[RENTAL_CHECK] Không thể lấy thông tin QTV:', error.message);
            }
        }
        
        // Kiểm tra quyền thuê với thông tin admin
        const response = await axios.post(CHECK_PERMISSION_URL, {
            command_name: 'ffrank',  // Tên lệnh hiện tại
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
        return false; // Fallback về trả phí nếu không check được
    }
}

// ----- HÀM KIỂM TRA SỐ TRẬN ĐẤU (Sử dụng API từ ffrank/api.js) -----
async function getMatchCountFromAPI(accountId, startTime, endTime) {
    try {
        // Import API module để gọi Garena API
        const garenaApi = require('./ffrank/api.js');
        
        // Chuyển đổi thời gian sang moment nếu cần
        if (!moment.isMoment(startTime)) startTime = moment.tz(startTime, TIME_ZONE);
        if (!moment.isMoment(endTime)) endTime = moment.tz(endTime, TIME_ZONE);
        
        console.log(`[MATCH_COUNT] Đang tìm matches cho account ${accountId} từ ${startTime.format()} đến ${endTime.format()}`);
        
        // Gọi API tìm matches thông qua module ffrank/api.js
        const foundMatches = await garenaApi.findMatches(accountId, startTime, endTime);
        
        if (!foundMatches || !Array.isArray(foundMatches)) {
            console.warn('[MATCH_COUNT] Không tìm thấy matches hoặc dữ liệu không hợp lệ');
            return 0;
        }
        
        console.log(`[MATCH_COUNT] Tìm thấy ${foundMatches.length} matches cho account ${accountId}`);
        return foundMatches.length;
        
    } catch (error) {
        console.warn('[MATCH_COUNT] Lỗi khi lấy số trận từ API:', error.message);
        return 0; // Trả về 0 nếu có lỗi
    }
}

// ----- HELPER FUNCTION ĐỂ KIỂM TRA VÀ LẤY CLIENT -----
function getClient(global) {
    if (global && global.client) {
        return global.client;
    }
    if (global && global.data) {
        return global.data;
    }
    if (typeof client !== 'undefined') {
        return client;
    }
    return {
        handleReply: []
    };
}

// ----- HÀM FORMAT THỜI GIAN -----
function formatDateTime(dateTime) {
    return moment(dateTime).format('DD/MM/YYYY HH:mm');
}

// ----- HÀM CHÍNH ĐỂ GỌI API (Đã sửa để sử dụng API) -----
async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    const isGroup = event.isGroup || false;
    
    try {
        // BƯỚC 1: Kiểm tra quyền thuê (có truyền api để check QTV)
        const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, api);
        
        if (hasRentalPermission) {
            api.sendMessage("🎯 Miễn phí! Đang xử lý...", threadID, messageID);
        } else {
            api.sendMessage(`💰 Phí: ${COST_PER_USE.toLocaleString()}đ. Đang xử lý...`, threadID, messageID);
        }

        // BƯỚC 2: Lấy API Key của người dùng
        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key của bạn: ${e.message}`, threadID, messageID);
        }

        // BƯỚC 3: Kiểm tra số trận đấu thực tế từ API
        const matchCount = await getMatchCountFromAPI(payload.accountId, payload.startTime, payload.endTime);
        const startTimeFormatted = formatDateTime(payload.startTime);
        const endTimeFormatted = formatDateTime(payload.endTime);
        
        // Thông báo về số trận với đầy đủ thông tin
        let summaryMessage = `📊 Bắt đầu tổng hợp dữ liệu...\n\n`;
        summaryMessage += `🆔 ID Garena: ${payload.accountId}\n`;

        // Chỉ hiển thị Tên giải nếu người dùng có nhập
        if (payload.customName) {
            summaryMessage += `🏆 Tên giải: ${payload.customName}\n`;
        }

        // Chỉ hiển thị Key Logo nếu người dùng có nhập
        if (payload.logoApiKey) {
            summaryMessage += `🔑 Key Logo: ${payload.logoApiKey}\n`;
        }

        // Lấy tên layout thân thiện để hiển thị
        const layoutDisplayName = LAYOUT_DISPLAY_NAMES[payload.layoutName] || payload.layoutName;
        summaryMessage += `🎨 Layout: ${layoutDisplayName}\n`;
        
        summaryMessage += `⏰ Bắt đầu: ${startTimeFormatted}\n`;
        summaryMessage += `⏰ Kết thúc: ${endTimeFormatted}\n\n`;
        summaryMessage += `🎮 Đang tìm ${matchCount} trận đấu...`;

        api.sendMessage(summaryMessage, threadID, messageID);

        // BƯỚC 4: Thêm thông tin để server biết đây là từ bot
        const finalPayload = {
            ...payload,
            bot_sender_id: senderID,
            bot_thread_id: threadID,
            bot_is_group: isGroup.toString(),
            // Server sẽ tự động kiểm tra rental permission dựa trên thông tin này
        };
        // BƯỚC 5: Gọi API tạo ảnh
        const response = await axios.post(CREATE_URL, finalPayload, {
            headers: { 'Content-Type': 'application/json', 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });

        // BƯỚC 6: Thông báo thành công với thông tin chi tiết
        let successMsg = `✅ Yêu cầu tạo BXH hoàn tất!\n`;
        successMsg += `⏰ Khung giờ: ${startTimeFormatted} - ${endTimeFormatted}\n`;
        successMsg += `🎮 Tổng ${matchCount} trận đấu`;
        
        if (hasRentalPermission) {
            successMsg += `\n🆓 Miễn phí (đã thuê lệnh)`;
        } else {
            successMsg += `\n💰 Đã trừ ${COST_PER_USE.toLocaleString()}đ`;
        }
        
        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);

    } catch (error) {
        let errorMessage = "Có lỗi không xác định xảy ra.";
        
        if (error.response) {
            let errorData = '';
            try {
                const chunks = [];
                for await (const chunk of error.response.data) chunks.push(chunk);
                errorData = Buffer.concat(chunks).toString('utf8');
                errorMessage = JSON.parse(errorData).message || 'Lỗi không rõ từ API.';
            } catch (e) { 
                errorMessage = `Lỗi từ server (${error.response.status}).`; 
            }
            
            if (error.response.status === 402) {
                errorMessage = "💰 Số dư không đủ để sử dụng lệnh này.";
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = "Server xử lý quá lâu, vui lòng thử lại.";
        } else { 
            errorMessage = error.message; 
        }
        
        console.error("[FFRANK_API_FINAL] Lỗi:", error);
        return api.sendMessage(`❌ Đã có lỗi xảy ra: ${errorMessage}`, threadID, messageID);
    }
}

// ----- CẤU HÌNH LỆNH -----
module.exports.config = {
    name: "ffrandsadadasdasdasdk",
    version: "API-2.6-UseFFRankAPI",
    hasPermssion: 0,
    credits: "Gemini & Pcoder",
    description: "Tạo BXH FF với hệ thống thuê lệnh tự động và lấy số trận từ API.",
    commandCategory: "game",
    usages: ".ffrank [ID Garena] [Tên giải] [Key logo] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]",
    cooldowns: 30,
    costPerUse: COST_PER_USE // Thêm thông tin chi phí cho server
};

// ----- HELPER FUNCTION ĐỂ PARSE NGÀY THÁNG NHIỀU ĐỊNH DẠNG -----
function parseDate(dateStr) {
    const formats = [
        "DD-MM-YYYY",
        "DD/MM/YYYY", 
        "DD.MM.YYYY",
        "YYYY-MM-DD",
        "YYYY/MM/DD",
        "MM/DD/YYYY",
        "MM-DD-YYYY"
    ];
    
    for (const format of formats) {
        const parsed = moment(dateStr, format, true);
        if (parsed.isValid()) {
            return { isValid: true, format };
        }
    }
    return { isValid: false, format: null };
}

function parseDateTime(dateStr, timeStr, timezone) {
    const dateResult = parseDate(dateStr);
    if (!dateResult.isValid) return null;
    
    const dateTime = moment.tz(`${dateStr} ${timeStr}`, `${dateResult.format} HH:mm`, timezone);
    return dateTime.isValid() ? dateTime : null;
}

// ----- HÀM CHẠY CHÍNH -----
module.exports.run = async function({ api, event, args, Users, global }) {
    const { threadID, messageID, senderID } = event;
    
    // Lấy client một cách an toàn
    const clientObject = getClient(global);

    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
        // Kiểm tra quyền để hiển thị thông báo phù hợp (có truyền api)
        const hasRental = await checkRentalPermission(senderID, threadID, event.isGroup || false, api);
        
        let costInfo = '';
        if (hasRental) {
            // Kiểm tra xem có phải do là QTV không
            if (event.isGroup) {
                try {
                    const threadInfo = await api.getThreadInfo(threadID);
                    const adminIDs = threadInfo.adminIDs || [];
                    const isAdmin = adminIDs.some(admin => admin.id === senderID);
                    
                    if (isAdmin) {
                        costInfo = `🎯 TRẠNG THÁI: QTV nhóm có thuê - MIỄN PHÍ!\n\n`;
                    } else {
                        costInfo = `🎯 TRẠNG THÁI: Đã thuê lệnh - MIỄN PHÍ!\n\n`;
                    }
                } catch (e) {
                    costInfo = `🎯 TRẠNG THÁI: Có quyền miễn phí!\n\n`;
                }
            } else {
                costInfo = `🎯 TRẠNG THÁI: Đã thuê lệnh - MIỄN PHÍ!\n\n`;
            }
        } else {
            costInfo = `💰 CHI PHÍ: ${COST_PER_USE.toLocaleString()}đ/lần\n🎫 Thuê không giới hạn: https://spn.io.vn/thue\n📌 QTV miễn phí nếu nhóm đã thuê!\n\n`;
        }
        
        const helpMessage = `📌 HƯỚNG DẪN LỆNH .ffrank\n\n${costInfo}` +
            `1. DÙNG MENU (Khuyên dùng):\n.ffrank [ID Garena] [Tên giải] [Key logo]\n` +
            `» Bot sẽ hiện menu chọn layout và thời gian.\n\n` +
            `2. NHẬP THỦ CÔNG:\n.ffrank [ID] [Tên giải] [Key logo] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]\n\n` +
            `📅 Định dạng ngày hỗ trợ: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY\n\n` +
            `Ví dụ:\n` +
            `.ffrank 1234 "Giao Hữu" null 15/08/2025 20:00 15/08/2025 22:00\n` +
            `.ffrank 3348924136 16/08/2025 22:00 17/08/2025 00:00\n\n` +
            `📌 Tên giải & Key logo có thể điền "null" để bỏ trống.`;
        return api.sendMessage(helpMessage, threadID, messageID);
    }
    
    const accountId = args[0];
    
    // Kiểm tra format rút gọn: .ffrank ID ngày giờ ngày giờ (4 args)
    if (args.length >= 5) {
        // Tìm vị trí bắt đầu của thông tin thời gian
        let timeStartIndex = -1;
        let customName = '';
        let logoApiKey = '';
        
        // Nếu có 5 args: ID + 4 thời gian
        if (args.length === 5) {
            timeStartIndex = 1;
            customName = '';
            logoApiKey = '';
        }
        // Nếu có 6+ args: ID + tên giải + thời gian hoặc ID + tên + logo + thời gian
        else {
            // Tìm vị trí đầu tiên có định dạng ngày
            // Tìm vị trí đầu tiên có định dạng ngày
            timeStartIndex = args.findIndex((arg, index) => index > 0 && parseDate(arg).isValid);
            
            if (timeStartIndex === -1) {
                return api.sendMessage("⚠️ Không tìm thấy thông tin ngày giờ hợp lệ.", threadID, messageID);
            }

            // Lấy tất cả các phần tử nằm giữa ID và ngày bắt đầu
            const nameAndKeyArgs = args.slice(1, timeStartIndex);
            
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
            // Kiểm tra có đủ 4 tham số thời gian không
            const timeArgs = args.slice(timeStartIndex);
        }
        
        // Kiểm tra có đủ 4 tham số thời gian không
        const timeArgs = args.slice(timeStartIndex);
        if (timeArgs.length < 4) {
            return api.sendMessage("⚠️ Thiếu thông tin thời gian. Cần: [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]", threadID, messageID);
        }
        
        const startTime = parseDateTime(timeArgs[0], timeArgs[1], TIME_ZONE);
        const endTime = parseDateTime(timeArgs[2], timeArgs[3], TIME_ZONE);

        if (!startTime || !endTime) {
            return api.sendMessage("⚠️ Định dạng ngày giờ không hợp lệ.\n📅 Hỗ trợ: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY\n🕐 Giờ: HH:mm", threadID, messageID);
        }

        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        let layoutMessage = `🎨 Đã nhận thời gian. Vui lòng chọn layout:\n\n` +
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
                data: { accountId, customName, logoApiKey, startTime: startTime.format("YYYY-MM-DD HH:mm:ss"), endTime: endTime.format("YYYY-MM-DD HH:mm:ss") },
                type: 'choose_layout_manual_time'
            });
        }, messageID);

    } else {
        // Format thông thường với menu
        const customName = args[1] === 'null' ? '' : args[1] || '';
        const logoApiKey = args[2] === 'null' ? '' : args[2] || '';
        
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        let layoutMessage = `🎨 Vui lòng chọn layout cho BXH:\n\n` +
            layouts.map((l, i) => `${i + 1}. ${LAYOUT_DISPLAY_NAMES[l]}`).join('\n') +
            `\n\n👉 Phản hồi tin nhắn này bằng số thứ tự.`;

        return api.sendMessage(layoutMessage, threadID, (err, info) => {
            if (err) return console.error(err);
            
            if (!clientObject.handleReply) {
                clientObject.handleReply = [];
            }
            
            clientObject.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                data: { accountId, customName, logoApiKey },
                type: 'choose_layout'
            });
        }, messageID);
    }
};

// ----- HÀM XỬ LÝ PHẢN HỒI -----
module.exports.handleReply = async function({ api, event, handleReply, global }) {
    if (event.senderID !== handleReply.author) return;
    const { threadID, messageID, senderID, body } = event;
    
    // Lấy client một cách an toàn
    const clientObject = getClient(global);
    
    api.unsendMessage(handleReply.messageID).catch(() => {});

    const choice = parseInt(body);
    let { data } = handleReply;

    if (handleReply.type === 'choose_layout_manual_time') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (isNaN(choice) || choice < 1 || choice > layouts.length) {
            return api.sendMessage("⚠️ Lựa chọn layout không hợp lệ.", threadID, messageID);
        }
        data.layoutName = layouts[choice - 1];
        
        return callApiAndSend(api, event, data);
    }
    
    if (handleReply.type === 'choose_layout') {
        const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
        if (isNaN(choice) || choice < 1 || choice > layouts.length) {
            return api.sendMessage("⚠️ Lựa chọn layout không hợp lệ.", threadID, messageID);
        }
        data.layoutName = layouts[choice - 1];

        let timeMessage = `📊 Vui lòng chọn khung giờ:\n\n` +
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
                author: senderID,
                data: data,
                type: 'choose_time'
            });
        }, messageID);
    }

    if (handleReply.type === 'choose_time') {
        if (isNaN(choice) || choice < 1 || choice > timeSlots.length) {
            return api.sendMessage("⚠️ Lựa chọn khung giờ không hợp lệ.", threadID, messageID);
        }
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
        
        return callApiAndSend(api, event, payload);
    }
};