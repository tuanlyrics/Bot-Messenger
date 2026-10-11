/**
 * @name antiimage
 * @version 2.0.0
 * @description Test và quản lý tính năng Anti-Change Group Image (Hỗ trợ upload thủ công)
 * @author Claude
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// Đường dẫn lưu trữ dữ liệu
const dataPath = path.join(__dirname, 'cache', 'anti_images');
const settingsPath = path.join(__dirname, 'cache', 'anti_image_settings.json');

// Đảm bảo thư mục tồn tại
function ensureDirectoryExists() {
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }
}

// Đọc settings
function readSettings() {
    if (!fs.existsSync(settingsPath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi đọc settings:', e);
        return {};
    }
}

// Ghi settings
function writeSettings(data) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi ghi settings:', e);
    }
}

// Lấy settings của thread
function getThreadSettings(threadID) {
    const allSettings = readSettings();
    return allSettings[threadID] || { antiChangeGroupImage: false };
}

// Lưu settings của thread
function saveThreadSettings(threadID, newSettings) {
    const allSettings = readSettings();
    allSettings[threadID] = { ...allSettings[threadID], ...newSettings };
    writeSettings(allSettings);
}

// Lưu ảnh nhóm từ URL hoặc attachment
async function saveGroupImageFromSource(api, threadID, imageSource) {
    try {
        ensureDirectoryExists();
        
        const imagePath = path.join(dataPath, `${threadID}.png`);
        
        console.log('[ANTI-IMAGE] Đang lưu ảnh nhóm...');
        
        // Nếu imageSource là URL string
        if (typeof imageSource === 'string') {
            const response = await axios.get(imageSource, { 
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(imagePath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        }
        // Nếu imageSource là attachment object
        else if (imageSource && imageSource.url) {
            const response = await axios.get(imageSource.url, { 
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(imagePath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } else {
            throw new Error('Invalid image source');
        }
        
        // Kiểm tra file
        const fileStats = fs.statSync(imagePath);
        console.log('[ANTI-IMAGE] File size:', fileStats.size, 'bytes');
        
        if (fileStats.size < 1000) {
            throw new Error('File quá nhỏ, có thể bị lỗi');
        }
        
        // Lưu thông tin
        saveThreadSettings(threadID, {
            groupImage: typeof imageSource === 'string' ? imageSource : imageSource.url,
            groupImagePath: imagePath,
            savedAt: new Date().toISOString()
        });
        
        return { 
            success: true, 
            message: 'Đã lưu ảnh nhóm thành công!',
            imagePath,
            fileSize: `${(fileStats.size / 1024).toFixed(2)} KB`
        };
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi lưu ảnh:', e);
        throw e;
    }
}

// Lưu ảnh nhóm hiện tại (tự động từ API)
async function saveCurrentGroupImage(api, threadID) {
    try {
        console.log('[ANTI-IMAGE] Đang lấy ảnh nhóm qua getThreadInfo...');

        const threadInfo = await api.getThreadInfo(threadID);
        let imageUrl = null;

        // Các khả năng có thể chứa ảnh nhóm
        if (threadInfo.imageSrc) imageUrl = threadInfo.imageSrc;
        else if (threadInfo.threadImage && threadInfo.threadImage.url) imageUrl = threadInfo.threadImage.url;
        else if (threadInfo.image) imageUrl = threadInfo.image;
        else if (threadInfo.threadPicture) imageUrl = threadInfo.threadPicture;

        // Nếu chưa tìm thấy, thử kiểm tra sâu hơn
        if (!imageUrl && threadInfo?.userInfo?.length > 0) {
            const found = threadInfo.userInfo.find(u => u.type === "group");
            if (found?.profilePicture) imageUrl = found.profilePicture;
        }

        // Nếu vẫn không có thì báo lỗi và hướng dẫn upload thủ công
        if (!imageUrl) {
            console.warn('[ANTI-IMAGE] Không thể lấy ảnh nhóm qua API, cần upload thủ công.');
            return {
                success: false,
                message:
                    '⚠️ Không thể tự động lấy ảnh nhóm.\n\n' +
                    '💡 Vui lòng reply ảnh đại diện nhóm hiện tại và gõ: "antiimage upload"',
                apiNotSupported: true
            };
        }

        console.log('[ANTI-IMAGE] Ảnh nhóm tìm thấy:', imageUrl);
        return await saveGroupImageFromSource(api, threadID, imageUrl);
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi khi lấy ảnh nhóm:', e);
        return {
            success: false,
            message: `⚠️ Lỗi khi lấy ảnh nhóm: ${e.message}`,
            apiNotSupported: true
        };
    }
}


// Khôi phục ảnh nhóm
async function restoreGroupImage(api, threadID) {
    try {
        const settings = getThreadSettings(threadID);
        const imagePath = settings.groupImagePath;
        
        if (!imagePath || !fs.existsSync(imagePath)) {
            return { 
                success: false, 
                message: 'Không tìm thấy ảnh đã lưu.\n💡 Vui lòng dùng "antiimage upload" để lưu ảnh trước.' 
            };
        }
        
        // Đổi ảnh nhóm về ảnh cũ
        await api.changeGroupImage(fs.createReadStream(imagePath), threadID);
        
        return { 
            success: true, 
            message: 'Đã khôi phục ảnh nhóm thành công!' 
        };
    } catch (e) {
        console.error('[ANTI-IMAGE] Lỗi khôi phục ảnh:', e);
        return { 
            success: false, 
            message: `Lỗi khôi phục: ${e.message}` 
        };
    }
}

// Kiểm tra user có phải admin không
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

module.exports.config = {
    name: "antiimage",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Claude",
    description: "Quản lý và test tính năng Anti-Change Group Image (Hỗ trợ upload thủ công)",
    commandCategory: "Group",
    usages: "[on|off|upload|restore|status|test]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, isGroup, type, messageReply } = event;
    
    // Chỉ hoạt động trong nhóm
    if (!isGroup) {
        return api.sendMessage("❌ Lệnh này chỉ dùng trong nhóm!", threadID, messageID);
    }
    
    // Kiểm tra quyền admin
    const isAdmin = await isGroupAdmin(api, threadID, senderID);
    
    const command = args[0]?.toLowerCase();
    
    switch (command) {
        case 'upload': {
            if (!isAdmin) {
                return api.sendMessage("❌ Chỉ QTV nhóm mới được upload ảnh!", threadID, messageID);
            }
            
            // Kiểm tra có reply ảnh không
            if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments.length === 0) {
                return api.sendMessage(
                    `📸 CÁCH UPLOAD ẢNH NHÓM\n\n` +
                    `1️⃣ Chụp/tải ảnh đại diện nhóm hiện tại\n` +
                    `2️⃣ Gửi ảnh đó vào chat\n` +
                    `3️⃣ Reply (trả lời) tin nhắn ảnh đó\n` +
                    `4️⃣ Gõ "antiimage upload"\n\n` +
                    `💡 Ảnh này sẽ được dùng để khôi phục khi có người đổi ảnh nhóm.`,
                    threadID,
                    messageID
                );
            }
            
            const attachment = messageReply.attachments[0];
            
            if (attachment.type !== 'photo') {
                return api.sendMessage("❌ Vui lòng reply vào ảnh, không phải file khác!", threadID, messageID);
            }
            
            api.sendMessage("⏳ Đang lưu ảnh...", threadID);
            
            try {
                const result = await saveGroupImageFromSource(api, threadID, attachment);
                
                return api.sendMessage(
                    `✅ ${result.message}\n\n` +
                    `📍 Đường dẫn: ${result.imagePath}\n` +
                    `📊 Dung lượng: ${result.fileSize}\n` +
                    `🕐 Lưu lúc: ${new Date().toLocaleString('vi-VN')}\n\n` +
                    `💡 Giờ có thể dùng "antiimage on" để bật bảo vệ!`,
                    threadID,
                    messageID
                );
            } catch (e) {
                return api.sendMessage(
                    `❌ Lỗi khi lưu ảnh: ${e.message}\n\n` +
                    `💡 Thử lại hoặc dùng ảnh khác.`,
                    threadID,
                    messageID
                );
            }
        }
        
        case 'on': {
            if (!isAdmin) {
                return api.sendMessage("❌ Chỉ QTV nhóm mới được bật tính năng này!", threadID, messageID);
            }
            
            const settings = getThreadSettings(threadID);
            
            // Kiểm tra đã có ảnh lưu chưa
            if (!settings.groupImagePath || !fs.existsSync(settings.groupImagePath)) {
                api.sendMessage("⏳ Đang thử lấy ảnh nhóm tự động...", threadID);
                
                const saveResult = await saveCurrentGroupImage(api, threadID);
                
                if (!saveResult.success) {
                    if (saveResult.apiNotSupported) {
                        return api.sendMessage(
                            `⚠️ ${saveResult.message}`,
                            threadID,
                            messageID
                        );
                    }
                    return api.sendMessage(`❌ ${saveResult.message}`, threadID, messageID);
                }
                
                api.sendMessage(`✅ Đã lưu ảnh tự động!`, threadID);
            }
            
            // Bật tính năng
            saveThreadSettings(threadID, { antiChangeGroupImage: true });
            
            return api.sendMessage(
                `✅ ĐÃ BẬT ANTI-CHANGE GROUP IMAGE\n\n` +
                `📸 Ảnh nhóm đã được lưu.\n` +
                `🛡️ Từ giờ, chỉ QTV mới được đổi ảnh nhóm.\n` +
                `⚠️ Thành viên thường đổi ảnh sẽ bị kick ngay lập tức!`,
                threadID,
                messageID
            );
        }
        
        case 'off': {
            if (!isAdmin) {
                return api.sendMessage("❌ Chỉ QTV nhóm mới được tắt tính năng này!", threadID, messageID);
            }
            
            saveThreadSettings(threadID, { antiChangeGroupImage: false });
            
            return api.sendMessage(
                `✅ ĐÃ TẮT ANTI-CHANGE GROUP IMAGE\n\n` +
                `📸 Mọi người đều có thể đổi ảnh nhóm bình thường.`,
                threadID,
                messageID
            );
        }
        
        case 'restore': {
            if (!isAdmin) {
                return api.sendMessage("❌ Chỉ QTV nhóm mới được khôi phục ảnh!", threadID, messageID);
            }
            
            api.sendMessage("⏳ Đang khôi phục ảnh nhóm...", threadID);
            
            const result = await restoreGroupImage(api, threadID);
            
            return api.sendMessage(
                result.success 
                    ? `✅ ${result.message}` 
                    : `❌ ${result.message}`,
                threadID,
                messageID
            );
        }
        
        case 'status': {
            const settings = getThreadSettings(threadID);
            const hasImage = settings.groupImagePath && fs.existsSync(settings.groupImagePath);
            
            let statusMsg = `📊 TRẠNG THÁI ANTI-CHANGE IMAGE\n\n`;
            statusMsg += `🔐 Tình trạng: ${settings.antiChangeGroupImage ? '✅ Đang BẬT' : '❌ Đang TẮT'}\n`;
            statusMsg += `📸 Ảnh đã lưu: ${hasImage ? '✅ Có' : '❌ Chưa có'}\n`;
            
            if (hasImage && settings.savedAt) {
                statusMsg += `🕐 Lưu lúc: ${new Date(settings.savedAt).toLocaleString('vi-VN')}\n`;
                
                // Hiển thị file size
                try {
                    const fileStats = fs.statSync(settings.groupImagePath);
                    statusMsg += `📊 Dung lượng: ${(fileStats.size / 1024).toFixed(2)} KB\n`;
                } catch (e) {}
            }
            
            if (!hasImage) {
                statusMsg += `\n💡 Dùng "antiimage upload" để lưu ảnh (reply kèm ảnh).`;
            } else if (!settings.antiChangeGroupImage) {
                statusMsg += `\n💡 Dùng "antiimage on" để bật bảo vệ.`;
            }
            
            return api.sendMessage(statusMsg, threadID, messageID);
        }
        
        case 'test': {
            if (!isAdmin) {
                return api.sendMessage("❌ Chỉ QTV nhóm mới được test!", threadID, messageID);
            }
            
            const settings = getThreadSettings(threadID);
            
            let testMsg = `🧪 KẾT QUẢ TEST ANTI-CHANGE IMAGE\n\n`;
            testMsg += `1️⃣ Tính năng: ${settings.antiChangeGroupImage ? '✅ Đã bật' : '❌ Chưa bật'}\n`;
            testMsg += `2️⃣ Ảnh đã lưu: ${settings.groupImagePath && fs.existsSync(settings.groupImagePath) ? '✅ Có' : '❌ Không'}\n`;
            testMsg += `3️⃣ Bạn là: ${isAdmin ? '✅ QTV' : '❌ Thành viên'}\n`;
            
            if (settings.antiChangeGroupImage && settings.groupImagePath && fs.existsSync(settings.groupImagePath)) {
                testMsg += `\n✅ Hệ thống đã sẵn sàng!\n`;
                testMsg += `💡 Thử nghiệm: Dùng member thường đổi ảnh nhóm → sẽ bị kick ngay.`;
            } else if (!settings.antiChangeGroupImage) {
                testMsg += `\n⚠️ Tính năng chưa bật.\n`;
                testMsg += `💡 Dùng "antiimage on" để bật.`;
            } else {
                testMsg += `\n⚠️ Chưa lưu ảnh nhóm.\n`;
                testMsg += `💡 Dùng "antiimage upload" để lưu ảnh (reply kèm ảnh).`;
            }
            
            return api.sendMessage(testMsg, threadID, messageID);
        }
        
        default: {
            const helpMsg = `📖 HƯỚNG DẪN SỬ DỤNG ANTI-CHANGE IMAGE\n\n` +
                `📝 Các lệnh:\n` +
                `1️⃣ antiimage upload - Lưu ảnh nhóm (reply kèm ảnh)\n` +
                `2️⃣ antiimage on - Bật bảo vệ\n` +
                `3️⃣ antiimage off - Tắt bảo vệ\n` +
                `4️⃣ antiimage restore - Khôi phục ảnh đã lưu\n` +
                `5️⃣ antiimage status - Xem trạng thái\n` +
                `6️⃣ antiimage test - Test hệ thống\n\n` +
                `⚠️ Chỉ QTV nhóm mới dùng được.\n` +
                `🛡️ Khi bật: Chỉ QTV đổi ảnh được, member thường sẽ bị kick!\n\n` +
                `💡 BẮT ĐẦU NHANH:\n` +
                `1. Chụp ảnh đại diện nhóm hiện tại\n` +
                `2. Gửi ảnh vào chat, reply nó rồi gõ "antiimage upload"\n` +
                `3. Gõ "antiimage on" để bật bảo vệ`;
            
            return api.sendMessage(helpMsg, threadID, messageID);
        }
    }
};

// Export helper functions để dùng trong event listener
module.exports.helpers = {
    getThreadSettings,
    saveThreadSettings,
    restoreGroupImage,
    isGroupAdmin,
    saveGroupImageFromSource
};