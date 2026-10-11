/**
 * @name lineup
 * @version 6.2.0 (Sửa lỗi logic menu)
 * @description Tạo ảnh lineup thông qua API. Có hệ thống thuê lệnh tự động.
 * @author D-Jukie & Gemini & Pcoder (API Integration)
 */

const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/lineup/create';
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Chi phí mỗi lần dùng (chỉ áp dụng khi chưa thuê)
const COST_PER_USE = 300;

// ----- DỮ LIỆU MENU -----
const LAYOUT_DISPLAY_NAMES = {
    'canvas1': 'Mẫu Cổ Điển (Nền Vàng)',
    'canvas2': 'Mẫu Hiện Đại (Nền Tím)',
    'canvas_xanhla': 'Mẫu Scrim (Nền Xanh Lá)',
    'canvas_summer': 'Mẫu Summer (Nền Biển)',
    'canvas_vietnam': 'Mẫu Việt Nam (Nền Đỏ)'
    
};

const TEAM_SIZES = [
    { label: "Team 5 người", value: 5 },
    { label: "Team 4 người", value: 4 },
    { label: "Team 3 người", value: 3 },
    { label: "Team 2 người", value: 2 },
    { label: "Team 1 người", value: 1 }
];

// ----- HÀM KIỂM TRA QUYỀN THUÊ (ĐÃ SỬA LỖI) -----
async function checkRentalPermission(senderID, threadID, isGroup) {
    try {
        // Đảm bảo isGroup luôn là boolean và target_id không bao giờ undefined
        const isGroupDefined = (typeof isGroup === 'boolean') ? isGroup : !!threadID;
        const target_id = isGroupDefined ? threadID : senderID;

        // Kiểm tra nếu target_id vẫn không hợp lệ thì không gửi request
        if (!target_id) {
            console.warn('[RENTAL_CHECK] Không thể xác định target_id. Bỏ qua kiểm tra quyền thuê.');
            return false; // Mặc định là không có quyền nếu không xác định được ID
        }

        const response = await axios.post(CHECK_PERMISSION_URL, {
            command_name: 'lineup',
            target_id: target_id
        });

        if (response.data.success) {
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

// ----- HELPER FUNCTION ĐỂ LẤY CLIENT -----
function getClient(global) {
    if (global && global.client) return global.client;
    if (global && global.data) return global.data;
    if (typeof client !== 'undefined') return client;
    return { handleReply: [] };
}

// ----- HÀM GỌI API VÀ GỬI KẾT QUẢ (ĐÃ SỬA LỖI) -----
async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    const isGroup = event.isGroup || false;

    try {
        const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup);
        if (hasRentalPermission) {
            api.sendMessage("🎯 [LINEUP] Miễn phí! Đang xử lý...", threadID, messageID);
        } else {
            api.sendMessage(`💰 [LINEUP] Phí: ${COST_PER_USE.toLocaleString()}đ. Đang xử lý...`, threadID, messageID);
        }

        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ [LINEUP] Lỗi khi lấy API Key: ${e.message}`, threadID, messageID);
        }

        let summaryMessage = `📊 Chuẩn bị tạo ảnh Lineup...\n\n`;
        summaryMessage += `🎨 Layout: ${LAYOUT_DISPLAY_NAMES[payload.layoutName] || payload.layoutName}\n`;
        summaryMessage += `👥 Tên Team: ${payload.teamName}\n`;
        summaryMessage += `👤 Số thành viên: ${payload.teamSize}\n`;
        if (payload.totalKills !== undefined) {
            summaryMessage += `🔥 Tổng Kills: ${payload.totalKills}\n`;
        }
        summaryMessage += `📝 Tên thành viên: ${payload.names.join(', ')}\n\n`;
        summaryMessage += `⏳ Vui lòng chờ trong giây lát...`;
        api.sendMessage(summaryMessage, threadID, messageID);

        // --- [SỬA LỖI GỬI DỮ LIỆU] ---
        const FormData = require('form-data');
        const formData = new FormData();
        
        formData.append('teamName', payload.teamName);
        formData.append('layoutName', payload.layoutName);
        formData.append('teamSize', payload.teamSize.toString());
        
        // <<< ĐOẠN CẦN THAY THẾ Ở ĐÂY >>>
        // Gửi tên thành viên dưới dạng mảng để tương thích với API mới
        payload.names.forEach(name => {
            formData.append('names[]', name);
        });
        // <<< KẾT THÚC THAY THẾ >>>

        if (payload.totalKills !== undefined) {
            formData.append('totalKills', payload.totalKills.toString());
        }
        if (payload.logoBuffer) {
            formData.append('logo', payload.logoBuffer, 'logo.png');
        }
        formData.append('bot_sender_id', senderID);
        formData.append('bot_thread_id', threadID);
        formData.append('bot_is_group', isGroup.toString());
        // --- [KẾT THÚC SỬA LỖI] ---
        
        const response = await axios.post(CREATE_URL, formData, {
            headers: {
                'x-api-key': userApiKey,
                ...formData.getHeaders()
            },
            responseType: 'stream',
            timeout: 180000
        });

        let successMsg = hasRentalPermission
            ? `✅ [LINEUP] Yêu cầu tạo ảnh lineup hoàn tất! 🆓 Miễn phí (đã thuê lệnh)`
            : `✅ [LINEUP] Yêu cầu tạo ảnh lineup hoàn tất!\n💰 Đã trừ ${COST_PER_USE.toLocaleString()}đ từ số dư.`;

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
                errorMessage = "💰 Số dư của bạn trên web không đủ để sử dụng lệnh này.";
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = "Server xử lý quá lâu, vui lòng thử lại.";
        } else {
            errorMessage = error.message;
        }
        console.error("[LINEUP_API_FINAL] Lỗi:", error);
        return api.sendMessage(`❌ [LINEUP] Đã có lỗi xảy ra: ${errorMessage}`, threadID, messageID);
    }
}

// ----- CẤU HÌNH LỆNH -----
module.exports.config = {
    name: "lineup",
    version: "6.2.0 (Sửa lỗi logic menu)",
    hasPermssion: 0,
    credits: "D-Jukie & Gemini & Pcoder",
    description: "Tạo ảnh lineup thông qua API với hệ thống thuê lệnh tự động.",
    commandCategory: "Tạo ảnh",
    aliases: ["ln"],
    usages: ".lineup",
    cooldowns: 20,
    costPerUse: COST_PER_USE
};

// ----- HÀM CHẠY CHÍNH -----
module.exports.run = async function({ api, event, args, global }) {
    const { threadID, messageID, senderID } = event;
    const clientObject = getClient(global);

    if (args[0]?.toLowerCase() === 'help') {
        const hasRental = await checkRentalPermission(senderID, threadID, event.isGroup || false);
        let costInfo = hasRental
            ? `🎯 TRẠNG THÁI: Bạn đã thuê lệnh này - SỬ DỤNG MIỄN PHÍ!\n\n`
            : `💰 CHI PHÍ: ${COST_PER_USE.toLocaleString()}đ mỗi lần sử dụng\n🎫 Muốn dùng không giới hạn? Thuê lệnh tại: https://spn.io.vn/thue\n\n`;
        const helpMessage = `📌 HƯỚNG DẪN LỆNH .lineup (API Version)\n\n${costInfo}` +
            `🎨 CÁCH SỬ DỤNG:\n.lineup\n» Bot sẽ hiện menu từng bước:\n` +
            `1. Chọn layout (4 mẫu có sẵn)\n` +
            `2. Chọn số lượng thành viên (1-5 người)\n` +
            `3. Nhập tên team\n` +
            `4. Gửi logo team\n` +
            `5. Nhập tổng kills (chỉ layout Tím)\n` +
            `6. Nhập tên các thành viên\n\n` +
            `🌟 Tính năng:\n` +
            `• 4 layout đẹp mắt\n` +
            `• Hỗ trợ team 1-5 người\n` +
            `• Upload logo tùy chỉnh\n` +
            `• Xử lý qua API chuyên nghiệp`;
        return api.sendMessage(helpMessage, threadID, messageID);
    }

    const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
    let layoutMessage = `🎨 [LINEUP] Vui lòng chọn một mẫu layout:\n\n` +
        layouts.map((layout, index) => `${index + 1}. ${LAYOUT_DISPLAY_NAMES[layout]}`).join('\n');

    const hasRental = await checkRentalPermission(senderID, threadID, event.isGroup || false);
    layoutMessage += hasRental
        ? `\n\n🚀 Đã thuê lệnh - Sử dụng miễn phí!`
        : `\n\n💰 Phí sử dụng: ${COST_PER_USE.toLocaleString()}đ/lần`;
    layoutMessage += "\n\n👉 Phản hồi tin nhắn này bằng số tương ứng.";

    return api.sendMessage(layoutMessage, threadID, (err, info) => {
        if (err) return console.error(err);
        if (!clientObject.handleReply) clientObject.handleReply = [];
        clientObject.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: 'choose_layout',
            hasRental: hasRental
        });
    }, messageID);
};

// ----- HÀM XỬ LÝ PHẢN HỒI -----
module.exports.handleReply = async function({ api, event, handleReply, global }) {
    const { threadID, senderID, messageID, body, attachments } = event;
    const { author, type } = handleReply;

    if (senderID !== author) return;

    if (handleReply.messageID) {
        api.unsendMessage(handleReply.messageID).catch(console.error);
    }

    const clientObject = getClient(global);

    switch (type) {
        case 'choose_layout': {
            const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
            const choice = parseInt(body);
            if (isNaN(choice) || choice < 1 || choice > layouts.length) {
                return api.sendMessage("⚠️ [LINEUP] Lựa chọn layout không hợp lệ.", threadID, messageID);
            }
            const selectedLayout = layouts[choice - 1];
            let msg = `✅ Layout đã chọn: **${LAYOUT_DISPLAY_NAMES[selectedLayout]}**\n\n📝 Vui lòng chọn số lượng thành viên:\n\n` +
                TEAM_SIZES.map((size, index) => `${index + 1}. ${size.label}`).join('\n') +
                "\n\n👉 Phản hồi bằng số tương ứng.";
            return api.sendMessage(msg, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    ...handleReply,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    layoutName: selectedLayout,
                    type: 'choose_size'
                });
            }, messageID);
        }

        case 'choose_size': {
            const choice = parseInt(body);
            if (isNaN(choice) || choice < 1 || choice > TEAM_SIZES.length) {
                return api.sendMessage("⚠️ [LINEUP] Lựa chọn không hợp lệ.", threadID, messageID);
            }
            const teamSize = TEAM_SIZES[choice - 1].value;
            return api.sendMessage(`✅ Đã chọn team ${teamSize} người.\n✍️ Vui lòng nhập Tên Team của bạn.`, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    ...handleReply,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    teamSize: teamSize,
                    type: 'send_team_name'
                });
            }, messageID);
        }

        case 'send_team_name': {
            const teamName = body.trim();
            if (!teamName) return api.sendMessage("⚠️ [LINEUP] Tên team không được để trống.", threadID, messageID);
            return api.sendMessage(`✅ Tên team: ${teamName}\n🖼️ Vui lòng gửi logo của team bạn (chỉ 1 ảnh).`, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    ...handleReply,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    teamName: teamName,
                    type: 'send_logo'
                });
            }, messageID);
        }

case 'send_logo': {
    if (!attachments || attachments.length === 0 || attachments[0].type !== 'photo') {
        return api.sendMessage("⚠️ [LINEUP] Bạn chưa gửi ảnh logo. Vui lòng thử lại.", threadID, messageID);
    }
    try {
        const sharp = require('sharp');
        const logoUrl = attachments[0].url;

        const logoResponse = await axios.get(logoUrl, { 
            responseType: 'arraybuffer',
            family: 4, // Ép IPv4 
            timeout: 20000, 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const resizedLogoBuffer = await sharp(logoResponse.data)
            .resize({
                width: 400,
                height: 400,
                fit: 'inside', 
                withoutEnlargement: true 
            })
            .png()
            .toBuffer();
        
        const logoBuffer = resizedLogoBuffer;

        if (handleReply.layoutName === 'canvas2') {
            return api.sendMessage(`✅ Logo đã được nhận & tối ưu hóa.\n🔥 Vui lòng nhập tổng số kill của team:`, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    ...handleReply,
                    messageID: info.messageID,
                    logoBuffer: logoBuffer, // Dùng buffer đã resize
                    type: 'send_kills'
                });
            }, messageID);
        } else {
            return api.sendMessage(`✅ Logo đã được nhận & tối ưu hóa.\n✍️ Vui lòng nhập tên của ${handleReply.teamSize} thành viên, cách nhau bằng dấu "|" hoặc ",".`, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    ...handleReply,
                    messageID: info.messageID,
                    logoBuffer: logoBuffer, // Dùng buffer đã resize
                    type: 'send_names'
                });
            }, messageID);
        }
    } catch (error) {
        console.error("[LINEUP] Lỗi khi xử lý logo:", error);
        return api.sendMessage("❌ [LINEUP] Có lỗi khi xử lý logo của bạn. Ảnh có thể bị hỏng hoặc không được hỗ trợ.", threadID, messageID);
    }
}

        case 'send_kills': {
            const totalKills = parseInt(body);
            if (isNaN(totalKills)) {
                return api.sendMessage("⚠️ [LINEUP] Vui lòng chỉ nhập số.", threadID, messageID);
            }
            return api.sendMessage(`✅ Tổng kill: ${totalKills}.\n✍️ Vui lòng nhập tên của ${handleReply.teamSize} thành viên, cách nhau bằng dấu "|" hoặc ",".`, threadID, (err, info) => {
                if (err) return console.error(err);
                if (!clientObject.handleReply) clientObject.handleReply = [];
                clientObject.handleReply.push({
                    ...handleReply,
                    messageID: info.messageID,
                    totalKills: totalKills,
                    type: 'send_names'
                });
            }, messageID);
        }

        case 'send_names': {
            const names = body.split(/\s*[,|]\s*/).map(name => name.trim()).filter(Boolean);
            if (names.length !== handleReply.teamSize) {
                return api.sendMessage(`⚠️ [LINEUP] Bạn đã nhập ${names.length} tên, nhưng yêu cầu là ${handleReply.teamSize} tên. Vui lòng thử lại.`, threadID, messageID);
            }
            api.sendMessage("⏳ [LINEUP] Đang xử lý và tạo ảnh qua API, vui lòng chờ...", threadID, async (err) => {
                if (err) return console.error(err);
                try {
                    const payload = {
                        teamName: handleReply.teamName,
                        layoutName: handleReply.layoutName,
                        teamSize: handleReply.teamSize,
                        names: names,
                        logoBuffer: handleReply.logoBuffer
                    };
                    if (handleReply.totalKills !== undefined) {
                        payload.totalKills = handleReply.totalKills;
                    }
                    await callApiAndSend(api, event, payload);
                } catch (error) {
                    console.error("[LINEUP] Lỗi tạo ảnh:", error);
                    api.sendMessage(`❌ [LINEUP] Đã xảy ra lỗi trong quá trình tạo ảnh: ${error.message}`, threadID, messageID);
                }
            });
            break;
        }
    }
};
