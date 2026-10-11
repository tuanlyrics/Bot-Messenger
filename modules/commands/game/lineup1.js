/**
 * @name lineup1
 * @version 7.3.0 (Sửa lỗi bot không phản hồi & Mất dữ liệu)
 * @description Tạo ảnh lineup thông qua API, hỗ trợ ảnh thành viên và tự động xóa nền.
 * @author D-Jukie & Gemini & Pcoder (API Integration)
 */

const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const sharp = require('sharp');

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/lineup/create';
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const COST_PER_USE = 300; // Chi phí mỗi lần dùng (chỉ áp dụng khi chưa thuê)

// ----- API KEYS CHO VIỆC XÓA NỀN -----
const REMOVEBG_API_KEYS = [
    'DMd29c7BYcYtyn2tS4FdLRRF',
    '9L5ituUqBZG9jA5uLo4nfTUW',
    '4eW43PN6z1tcFetMr7SEbJzc',
    'PC2b5MdGivL3sax8NQEABijy',
    'gAkwRqsAz9TEE2figF5DxAv8',
    'sebguwLtm29VWbrCmYcA6T7q',
    'L31iBW1KB7gZySEgBwkRZDpF',
    '371R4u73aFKnbKG5wksLSYep',
    'Qy2dWt4mMLZ4LaBRYwGqDrk6',
    'PqwmwmQMi1ngYuAGNwsGtift'
];

// ----- DỮ LIỆU MENU -----
const LAYOUT_DISPLAY_NAMES = {
    'canvas1': 'Mẫu Cổ Điển (Nền Vàng)',
    'canvas2': 'Mẫu Hiện Đại (Nền Tím)',
    'canvas_xanhla': 'Mẫu Scrim (Nền Xanh Lá)',
    'canvas_summer': 'Mẫu Summer (Nền Biển)'
};

const TEAM_SIZES = [
    { label: "Team 5 người", value: 5 },
    { label: "Team 4 người", value: 4 },
    { label: "Team 3 người", value: 3 },
    { label: "Team 2 người", value: 2 },
    { label: "Team 1 người", value: 1 }
];

// ----- HÀM TIỆN ÍCH -----

function getClient(global) {
    if (global && global.client) return global.client;
    if (global && global.data) return global.data;
    if (typeof client !== 'undefined') return client;
    return { handleReply: [] };
}

async function removeBackground(imageBuffer) {
    const apiKey = REMOVEBG_API_KEYS[Math.floor(Math.random() * REMOVEBG_API_KEYS.length)];
    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file', imageBuffer, 'image_to_remove_bg.png');

    try {
        const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
            headers: {
                ...formData.getHeaders(),
                'X-Api-Key': apiKey,
            },
            responseType: 'arraybuffer',
        });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        if (error.response && error.response.status === 402) {
            console.error("Lỗi khi xóa nền: API key hết lượt.");
            throw new Error("Một trong các API key đã hết lượt sử dụng miễn phí.");
        }
        const errorMsg = error.response?.data?.toString() || error.message;
        console.error("Lỗi khi xóa nền:", errorMsg);
        throw new Error("API xóa nền báo lỗi. Ảnh có thể không được hỗ trợ hoặc kích thước quá lớn.");
    }
}


async function checkRentalPermission(senderID, threadID, isGroup) {
    try {
        const isGroupDefined = (typeof isGroup === 'boolean') ? isGroup : !!threadID;
        const target_id = isGroupDefined ? threadID : senderID;
        if (!target_id) return false;

        const response = await axios.post(CHECK_PERMISSION_URL, {
            command_name: 'lineup1',
            target_id: target_id
        });
        return response.data.success && response.data.has_permission;
    } catch (error) {
        console.warn('[RENTAL_CHECK] Lỗi khi kiểm tra quyền thuê:', error.message);
        return false;
    }
}

async function callApiAndSend(api, event, payload) {
    const { threadID, messageID, senderID } = event;
    const isGroup = event.isGroup || false;

    try {
        const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup);
        api.sendMessage(
            hasRentalPermission ? "🎯 [LINEUP] Miễn phí! Đang xử lý..." : `💰 [LINEUP] Phí: ${COST_PER_USE.toLocaleString()}đ. Đang xử lý...`,
            threadID
        );

        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ [LINEUP] Lỗi khi lấy API Key: ${e.message}`, threadID, messageID);
        }
        
        const memberNames = payload.members.map(m => m.name).join(', ');
        let summaryMessage = `📊 Chuẩn bị tạo ảnh Lineup...\n\n` +
            `🎨 Layout: ${LAYOUT_DISPLAY_NAMES[payload.layoutName] || payload.layoutName}\n` +
            `👥 Tên Team: ${payload.teamName}\n` +
            `👤 Số thành viên: ${payload.teamSize}\n` +
            (payload.totalKills !== undefined ? `🔥 Tổng Kills: ${payload.totalKills}\n` : '') +
            `📝 Tên thành viên: ${memberNames}\n\n` +
            `⏳ Vui lòng chờ trong giây lát...`;
        api.sendMessage(summaryMessage, threadID, messageID);

        const formData = new FormData();
        formData.append('teamName', payload.teamName);
        formData.append('layoutName', payload.layoutName);
        formData.append('teamSize', payload.teamSize.toString());

        payload.members.forEach((member, index) => {
            formData.append('names[]', member.name);
            formData.append('images[]', member.imageBuffer, `member_${index}.png`);
        });

        if (payload.totalKills !== undefined) {
            formData.append('totalKills', payload.totalKills.toString());
        }
        if (payload.logoBuffer) {
            formData.append('logo', payload.logoBuffer, 'logo.png');
        }
        formData.append('bot_sender_id', senderID);
        formData.append('bot_thread_id', threadID);
        formData.append('bot_is_group', isGroup.toString());
        
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
    name: "lineup1",
    version: "7.3.0 (Sửa lỗi bot không phản hồi & Mất dữ liệu)",
    hasPermssion: 0,
    credits: "D-Jukie & Gemini & Pcoder",
    description: "Tạo ảnh lineup thông qua API, hỗ trợ ảnh thành viên và tự động xóa nền.",
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
    const isGroup = !!event.isGroup;

    if (args[0]?.toLowerCase() === 'help') {
        const hasRental = await checkRentalPermission(senderID, threadID, isGroup);
        let costInfo = hasRental
            ? `🎯 TRẠNG THÁI: Bạn đã thuê lệnh này - SỬ DỤNG MIỄN PHÍ!\n\n`
            : `💰 CHI PHÍ: ${COST_PER_USE.toLocaleString()}đ mỗi lần sử dụng\n🎫 Muốn dùng không giới hạn? Thuê lệnh tại: https://spn.io.vn/thue\n\n`;
        const helpMessage = `📌 HƯỚNG DẪN LỆNH .lineup (API Version 7.3)\n\n${costInfo}` +
            `🎨 CÁCH SỬ DỤNG:\n.lineup\n» Bot sẽ hiện menu từng bước:\n` +
            `1. Chọn layout\n` +
            `2. Chọn số lượng thành viên\n` +
            `3. Nhập tên team\n` +
            `4. Gửi logo team\n` +
            `5. Gửi ảnh và tên cho từng thành viên theo yêu cầu.\n\n` +
            `🌟 Tính năng mới:\n` +
            `• Gửi ảnh từng thành viên.\n` +
            `• Bot tự động xóa nền ảnh thành viên.\n` +
            `• Giao diện hỏi đáp thân thiện hơn.`;
        return api.sendMessage(helpMessage, threadID, messageID);
    }

    const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
    let layoutMessage = `🎨 [LINEUP] Vui lòng chọn một mẫu layout:\n\n` +
        layouts.map((layout, index) => `${index + 1}. ${LAYOUT_DISPLAY_NAMES[layout]}`).join('\n');

    const hasRental = await checkRentalPermission(senderID, threadID, isGroup);
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
        });
    }, messageID);
};

// ----- HÀM XỬ LÝ PHẢN HỒI (ĐÃ SỬA LỖI) -----
module.exports.handleReply = async function({ api, event, handleReply, global }) {
    const { threadID, senderID, messageID, body, attachments } = event;
    const { author, type } = handleReply;

    if (senderID !== author) return;

    if (handleReply.messageID) {
        api.unsendMessage(handleReply.messageID).catch(console.error);
    }

    const clientObject = getClient(global);

    const nextReply = (newData) => {
        api.sendMessage(newData.message, threadID, (err, info) => {
            if (err) return console.error(err);
            if (!clientObject.handleReply) clientObject.handleReply = [];
            clientObject.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                ...newData.data
            });
        });
    };

    switch (type) {
        case 'choose_layout': {
            const layouts = Object.keys(LAYOUT_DISPLAY_NAMES);
            const choice = parseInt(body);
            if (isNaN(choice) || choice < 1 || choice > layouts.length) {
                return api.sendMessage("⚠️ [LINEUP] Lựa chọn layout không hợp lệ.", threadID, messageID);
            }
            const selectedLayout = layouts[choice - 1];
            
            return nextReply({
                message: `✅ Layout đã chọn: **${LAYOUT_DISPLAY_NAMES[selectedLayout]}**\n\n📝 Vui lòng chọn số lượng thành viên:\n\n` +
                         TEAM_SIZES.map((size, index) => `${index + 1}. ${size.label}`).join('\n') +
                         "\n\n👉 Phản hồi bằng số tương ứng.",
                data: { layoutName: selectedLayout, type: 'choose_size' }
            });
        }

        case 'choose_size': {
            const choice = parseInt(body);
            if (isNaN(choice) || choice < 1 || choice > TEAM_SIZES.length) {
                return api.sendMessage("⚠️ [LINEUP] Lựa chọn không hợp lệ.", threadID, messageID);
            }
            const teamSize = TEAM_SIZES[choice - 1].value;

            return nextReply({
                message: `✅ Đã chọn team ${teamSize} người.\n✍️ Vui lòng nhập Tên Team của bạn.`,
                data: {
                    layoutName: handleReply.layoutName,
                    teamSize: teamSize,
                    type: 'send_team_name'
                }
            });
        }

        case 'send_team_name': {
            const teamName = body.trim();
            if (!teamName) return api.sendMessage("⚠️ [LINEUP] Tên team không được để trống.", threadID, messageID);

            return nextReply({
                message: `✅ Tên team: ${teamName}\n🖼️ Vui lòng gửi logo của team bạn (chỉ 1 ảnh).`,
                data: {
                    layoutName: handleReply.layoutName,
                    teamSize: handleReply.teamSize,
                    teamName: teamName,
                    type: 'send_logo'
                }
            });
        }
        
        case 'send_logo': {
            if (!attachments || attachments.length === 0 || attachments[0].type !== 'photo') {
                return api.sendMessage("⚠️ [LINEUP] Bạn chưa gửi ảnh logo. Vui lòng thử lại.", threadID, messageID);
            }
            try {
                const logoUrl = attachments[0].url;
                const logoResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
                const resizedLogoBuffer = await sharp(logoResponse.data)
                    .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
                    .png().toBuffer();

                const commonData = {
                    layoutName: handleReply.layoutName,
                    teamSize: handleReply.teamSize,
                    teamName: handleReply.teamName,
                    logoBuffer: resizedLogoBuffer
                };

                if (handleReply.layoutName === 'canvas2') {
                    return nextReply({
                        message: `✅ Logo đã nhận.\n🔥 Vui lòng nhập tổng số kill của team:`,
                        data: {
                            ...commonData,
                            type: 'send_kills'
                        }
                    });
                } else {
                    return nextReply({
                        message: `✅ Logo đã nhận.\n\nBây giờ, hãy bắt đầu gửi thông tin thành viên.\n\n[👤] Vui lòng gửi ảnh cho **Thành viên 1**:`,
                        data: {
                            ...commonData,
                            type: 'collect_member_photo',
                            members: [],
                            currentMemberIndex: 0
                        }
                    });
                }
            } catch (error) {
                console.error("[LINEUP] Lỗi khi xử lý logo:", error);
                return api.sendMessage("❌ [LINEUP] Có lỗi khi xử lý logo của bạn.", threadID, messageID);
            }
        }

        case 'send_kills': {
            const totalKills = parseInt(body);
            if (isNaN(totalKills)) {
                return api.sendMessage("⚠️ [LINEUP] Vui lòng chỉ nhập số.", threadID, messageID);
            }
            return nextReply({
                message: `✅ Tổng kill: ${totalKills}.\n\nBây giờ, hãy bắt đầu gửi thông tin thành viên.\n\n[👤] Vui lòng gửi ảnh cho **Thành viên 1**:`,
                data: {
                    layoutName: handleReply.layoutName,
                    teamSize: handleReply.teamSize,
                    teamName: handleReply.teamName,
                    logoBuffer: handleReply.logoBuffer,
                    totalKills: totalKills,
                    type: 'collect_member_photo',
                    members: [],
                    currentMemberIndex: 0
                }
            });
        }
        
        case 'collect_member_photo': {
            if (!attachments || attachments.length === 0 || attachments[0].type !== 'photo') {
                return api.sendMessage("⚠️ [LINEUP] Bạn chưa gửi ảnh. Vui lòng gửi ảnh cho thành viên.", threadID, messageID);
            }
            try {
                const memberIndex = handleReply.currentMemberIndex;
                api.sendMessage(`⏳ Đang tải và xóa nền ảnh cho thành viên ${memberIndex + 1}...`, threadID);
                
                const imageUrl = attachments[0].url;
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(imageResponse.data, 'binary');

                const removedBgBuffer = await removeBackground(imageBuffer);

                return nextReply({
                    message: `✅ Đã xử lý ảnh xong!\n✍️ Bây giờ, hãy nhập tên cho **Thành viên ${memberIndex + 1}**:`,
                    data: {
                        ...handleReply,
                        type: 'collect_member_name',
                        tempImageBuffer: removedBgBuffer
                    }
                });
            } catch (error) {
                return api.sendMessage(`❌ [LINEUP] Lỗi xóa nền: ${error.message}. Vui lòng thử lại với ảnh khác.`, threadID, messageID);
            }
        }

        case 'collect_member_name': {
            const memberName = body.trim();
            if (!memberName) return api.sendMessage("⚠️ [LINEUP] Tên thành viên không được để trống.", threadID, messageID);

            const memberIndex = handleReply.currentMemberIndex;
            const updatedMembers = [...handleReply.members, {
                name: memberName,
                imageBuffer: handleReply.tempImageBuffer
            }];

            const nextMemberIndex = memberIndex + 1;

            if (nextMemberIndex < handleReply.teamSize) {
                return nextReply({
                    message: `✅ Đã lưu thành viên: ${memberName}.\n\n[👤] Vui lòng gửi ảnh cho **Thành viên ${nextMemberIndex + 1}**:`,
                    data: {
                        layoutName: handleReply.layoutName,
                        teamSize: handleReply.teamSize,
                        teamName: handleReply.teamName,
                        logoBuffer: handleReply.logoBuffer,
                        totalKills: handleReply.totalKills,
                        members: updatedMembers,
                        currentMemberIndex: nextMemberIndex,
                        type: 'collect_member_photo'
                    }
                });
            } else {
                api.sendMessage("✅ [LINEUP] Đã thu thập đủ thông tin! Bắt đầu tạo ảnh...", threadID);
                try {
                    const payload = {
                        teamName: handleReply.teamName,
                        layoutName: handleReply.layoutName,
                        teamSize: handleReply.teamSize,
                        members: updatedMembers,
                        logoBuffer: handleReply.logoBuffer,
                        totalKills: handleReply.totalKills
                    };
                    await callApiAndSend(api, event, payload);
                } catch (error) {
                    console.error("[LINEUP] Lỗi tạo ảnh:", error);
                    api.sendMessage(`❌ [LINEUP] Đã xảy ra lỗi trong quá trình tạo ảnh: ${error.message}`, threadID, messageID);
                }
                // FIX: Thêm return để kết thúc hàm sau khi đã xử lý xong thành viên cuối cùng.
                return;
            }
        }
    }
};
