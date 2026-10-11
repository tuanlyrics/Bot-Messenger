/**
 * @name anti-change-image-event
 * @version 1.0.0
 * @description Event listener cho Anti-Change Group Image
 * @author Claude
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// Import helper functions từ lệnh antiimage
let antiimageHelpers;
try {
    const antiimageModule = require('../commands/antiimage.js');
    antiimageHelpers = antiimageModule.helpers;
} catch (e) {
    console.warn('[ANTI-IMAGE EVENT] Chưa có module antiimage.js');
}

// Đường dẫn lưu trữ
const dataPath = path.join(__dirname, '..', 'commands', 'cache', 'anti_images');
const settingsPath = path.join(__dirname, '..', 'commands', 'cache', 'anti_image_settings.json');

// Fallback functions nếu không có antiimageHelpers
function readSettings() {
    if (!fs.existsSync(settingsPath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function getThreadSettings(threadID) {
    const allSettings = readSettings();
    return allSettings[threadID] || { antiChangeGroupImage: false };
}

function writeSettings(data) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi ghi settings:', e);
    }
}

function saveThreadSettings(threadID, newSettings) {
    const allSettings = readSettings();
    allSettings[threadID] = { ...allSettings[threadID], ...newSettings };
    writeSettings(allSettings);
}

async function isGroupAdmin(api, threadID, userID) {
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const adminIDs = threadInfo.adminIDs.map(e => e.id);
        return adminIDs.includes(userID);
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi kiểm tra admin:', e);
        return false;
    }
}

async function restoreGroupImage(api, threadID, settings, kickedUserName) {
    try {
        const imagePath = settings.groupImagePath;
        
        if (!imagePath || !fs.existsSync(imagePath)) {
            console.error('[ANTI-IMAGE] Không tìm thấy ảnh đã lưu để khôi phục.');
            return;
        }
        
        // Đổi ảnh nhóm về ảnh cũ
        await api.changeGroupImage(fs.createReadStream(imagePath), threadID);
        
        console.log('[ANTI-IMAGE] Đã khôi phục ảnh nhóm thành công.');
        
        // Gửi thông báo
        if (kickedUserName) {
            api.sendMessage(
                `🛡️ ANTI-CHANGE IMAGE\n\n` +
                `❌ Đã kick ${kickedUserName} vì tự ý đổi ảnh nhóm.\n` +
                `✅ Đã khôi phục ảnh nhóm về trạng thái ban đầu.`,
                threadID
            );
        }
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi khôi phục ảnh:', e);
        api.sendMessage(
            `⚠️ Không thể khôi phục ảnh nhóm tự động.\n` +
            `💡 QTV vui lòng dùng lệnh "antiimage restore" để khôi phục thủ công.`,
            threadID
        );
    }
}

async function updateNewGroupImage(api, threadID) {
    try {
        // Đợi 3 giây để ảnh mới load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const newThreadInfo = await api.getThreadInfo(threadID);
        const newImageUrl = newThreadInfo.imageSrc;
        
        if (!newImageUrl) {
            console.log('[ANTI-IMAGE] Không có ảnh mới để cập nhật.');
            return;
        }
        
        // Đảm bảo thư mục tồn tại
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
        
        const imagePath = path.join(dataPath, `${threadID}.png`);
        
        // Tải và lưu ảnh mới
        const response = await axios.get(newImageUrl, { 
            responseType: 'stream',
            timeout: 30000 
        });
        
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(imagePath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        // Cập nhật settings
        saveThreadSettings(threadID, { 
            groupImage: newImageUrl,
            groupImagePath: imagePath,
            savedAt: new Date().toISOString()
        });
        
        console.log('[ANTI-IMAGE] Đã cập nhật ảnh nhóm mới thành công.');
        
        api.sendMessage(
            `✅ QTV đã đổi ảnh nhóm.\n📸 Ảnh mới đã được lưu để bảo vệ.`,
            threadID
        );
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi khi cập nhật ảnh mới:', e);
    }
}

module.exports.config = {
    name: "anti-change-image-event",
    eventType: ["log:thread-icon", "log:thread-image", "change_thread_image"],
    version: "1.0.0",
    credits: "Claude",
    description: "Bảo vệ ảnh nhóm khỏi bị thay đổi bởi thành viên thường"
};

module.exports.run = async function({ api, event, Users, Threads }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    
    // Chỉ xử lý sự kiện thay đổi ảnh nhóm
    const imageChangeEvents = [
        "log:thread-icon",
        "log:thread-image", 
        "change_thread_image"
    ];
    
    if (!imageChangeEvents.includes(logMessageType)) {
        return;
    }
    
    // Lấy settings của nhóm
    const settings = getThreadSettings(threadID);
    
    // Nếu không bật tính năng thì bỏ qua
    if (!settings.antiChangeGroupImage) {
        return;
    }
    
    console.log(`[ANTI-IMAGE] Phát hiện thay đổi ảnh nhóm ${threadID} bởi ${author}`);
    
    // Kiểm tra xem người đổi có phải admin không
    const isAdmin = await isGroupAdmin(api, threadID, author);
    
    if (isAdmin) {
        // QTV được phép đổi ảnh, tự động cập nhật ảnh mới
        console.log('[ANTI-IMAGE] QTV đổi ảnh nhóm, đang cập nhật...');
        await updateNewGroupImage(api, threadID);
    } else {
        // Thành viên thường bị kick ngay lập tức
        let userName = 'Thành viên';
        
        try {
            // Lấy tên user nếu có hệ thống Users
            if (Users && typeof Users.getNameUser === 'function') {
                userName = await Users.getNameUser(author) || 'Thành viên';
            }
        } catch (e) {
            console.warn('[ANTI-IMAGE] Không thể lấy tên user:', e);
        }
        
        console.log(`[ANTI-IMAGE] Đang kick ${userName} (${author}) vì đổi ảnh nhóm...`);
        
        // Kick user
        api.removeUserFromGroup(author, threadID, async (err) => {
            if (err) {
                console.error('[ANTI-IMAGE] Lỗi khi kick user:', err);
                // Nếu không kick được thì chỉ khôi phục ảnh
                await restoreGroupImage(api, threadID, settings);
            } else {
                console.log(`[ANTI-IMAGE] Đã kick ${userName} (${author}) thành công.`);
                // Đợi 2 giây rồi khôi phục ảnh
                setTimeout(async () => {
                    await restoreGroupImage(api, threadID, settings, userName);
                }, 2000);
            }
        });
    }
};

module.exports.handleEvent = async function({ api, event, Users, Threads }) {
    // Alias cho .run()
    return this.run({ api, event, Users, Threads });
};