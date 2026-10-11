const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dbPool = require("./1connect"); // Import database pool từ file 1connect.js

// === MAIN MODULE CONFIG ===
module.exports.config = {
    name: "aisp",
    version: "3.0.1",
    hasPermssion: 3, // Chỉ Admin/QTV mới dùng được lệnh add/remove
    credits: "SPN.IO.VN Team",
    description: "Quản lý AI Chat cho nhóm + Auto reply khi nhắn 'sp'",
    commandCategory: "AI System",
    usages: "aisp add {threadID} | aisp remove {threadID} | aisp list",
    cooldowns: 2,
};

// === DATABASE FUNCTIONS ===
// Lấy AI settings từ database
async function getAISettings() {
    try {
        const [rows] = await dbPool.execute("SELECT setting_key, setting_value FROM ai_settings");
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        return settings;
    } catch (error) {
        console.error("[AI-DB] Get settings error:", error);
        throw error;
    }
}

// Tạo bảng ai_enabled_groups và ai_settings nếu chưa có
async function initDatabase() {
    try {
        // Tạo bảng ai_enabled_groups
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS ai_enabled_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                thread_id VARCHAR(50) NOT NULL UNIQUE,
                group_name VARCHAR(255) DEFAULT NULL,
                enabled_by VARCHAR(50) DEFAULT NULL,
                enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Tạo bảng ai_settings
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS ai_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT DEFAULT NULL,
                description VARCHAR(255) DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Chèn dữ liệu mặc định cho ai_settings nếu chưa có
        await dbPool.execute(`
            INSERT IGNORE INTO ai_settings (setting_key, setting_value, description) VALUES
            ('gemini_api_key', 'AIzaSyDPhZawz3W_fcciC3UhBr2uOLKP7Qb8Hk4', 'Google Gemini API Key'),
            ('ai_enabled', '1', 'Bật/tắt tính năng AI Chat'),
            ('system_prompt', 'Bạn là trợ lý AI thông minh của website SPN.IO.VN - hệ thống tạo ảnh AI & dịch vụ Free Fire chuyên nghiệp tại Việt Nam.', 'System prompt cho AI')
        `);
        
        console.log("[AI-DB] Database initialized successfully");
    } catch (error) {
        console.error("[AI-DB] Init error:", error);
    }
}

// Kiểm tra xem nhóm có được bật AI không
async function isGroupEnabled(threadID) {
    try {
        const [rows] = await dbPool.execute(
            "SELECT id FROM ai_enabled_groups WHERE thread_id = ?", 
            [threadID]
        );
        return rows.length > 0;
    } catch (error) {
        console.error("[AI-DB] Check group error:", error);
        return false;
    }
}

// Thêm nhóm vào danh sách AI được bật
async function addGroupToAI(threadID, groupName, enabledBy) {
    try {
        await dbPool.execute(`
            INSERT INTO ai_enabled_groups (thread_id, group_name, enabled_by) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            group_name = VALUES(group_name),
            enabled_by = VALUES(enabled_by),
            updated_at = CURRENT_TIMESTAMP
        `, [threadID, groupName, enabledBy]);
        return true;
    } catch (error) {
        console.error("[AI-DB] Add group error:", error);
        return false;
    }
}

// Xóa nhóm khỏi danh sách AI
async function removeGroupFromAI(threadID) {
    try {
        const [result] = await dbPool.execute(
            "DELETE FROM ai_enabled_groups WHERE thread_id = ?", 
            [threadID]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error("[AI-DB] Remove group error:", error);
        return false;
    }
}

// Lấy danh sách tất cả nhóm đã bật AI
async function getAllEnabledGroups() {
    try {
        const [rows] = await dbPool.execute(`
            SELECT thread_id, group_name, enabled_by, enabled_at 
            FROM ai_enabled_groups 
            ORDER BY enabled_at DESC
        `);
        return rows;
    } catch (error) {
        console.error("[AI-DB] Get all groups error:", error);
        return [];
    }
}

// === GEMINI AI FUNCTIONS ===
function imageToBase64(filePath) { 
    return fs.readFileSync(filePath, { encoding: "base64" }); 
}

function getImageMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
}

async function geminiVisionRequest({ prompt, imagePath, apiKey }) {
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const reqBody = {
        contents: [{
            parts: [
                { text: prompt || "Phân tích nội dung ảnh này." },
                { inline_data: { mime_type: getImageMimeType(imagePath), data: imageToBase64(imagePath) } }
            ]
        }]
    };
    const { data } = await axios.post(GEMINI_API_URL, reqBody);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function geminiTextRequest(prompt, apiKey, systemPrompt = "") {
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\nCâu hỏi người dùng: ${prompt}` : prompt;
    const reqBody = { 
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
        }
    };
    const { data } = await axios.post(GEMINI_API_URL, reqBody);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

// === MAIN COMMAND HANDLER ===
module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    
    // Khởi tạo database khi cần
    await initDatabase();
    
    if (args.length === 0) {
        return api.sendMessage(`
🤖 HƯỚNG DẪN SỬ DỤNG AI CHAT BOT

📝 CÁC LỆNH QUẢN LÝ:
• ${this.config.name} add {threadID} - Bật AI cho nhóm
• ${this.config.name} remove {threadID} - Tắt AI cho nhóm  
• ${this.config.name} list - Xem danh sách nhóm đã bật

💡 CÁCH HOẠT ĐỘNG:
• Khi nhóm được bật AI, người dùng nhắn "sp [nội dung]" sẽ được bot trả lời
• Không cần prefix, chỉ cần gõ: sp tôi muốn hỏi gì đó
• Hỗ trợ cả text và ảnh (reply ảnh + sp câu hỏi)

⚠️ LƯU Ý: Chỉ Admin/QTV mới được dùng lệnh quản lý!
        `, threadID, messageID);
    }

    const action = args[0].toLowerCase();
    const targetThreadID = args[1];

    switch (action) {
        case "add":
            if (!targetThreadID) {
                return api.sendMessage("❌ Thiếu Thread ID! Sử dụng: aisp add {threadID}", threadID, messageID);
            }

            try {
                // Lấy thông tin nhóm (nếu có thể)
                let groupName = `Nhóm ${targetThreadID}`;
                try {
                    const threadInfo = await api.getThreadInfo(targetThreadID);
                    groupName = threadInfo.threadName || groupName;
                } catch (e) {
                    console.log("[AI] Không thể lấy tên nhóm, dùng tên mặc định");
                }

                // Lấy tên người bật
                const userInfo = await Users.getData(senderID);
                const enabledBy = userInfo.name || senderID;

                const success = await addGroupToAI(targetThreadID, groupName, enabledBy);
                if (success) {
                    api.sendMessage(`✅ ĐÃ BẬT AI CHAT CHO NHÓM!

📍 Thread ID: ${targetThreadID}
👥 Tên nhóm: ${groupName}  
👤 Được bật bởi: ${enabledBy}
⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}

🎯 Từ giờ thành viên nhóm có thể nhắn "sp [câu hỏi]" để chat với AI!`, threadID, messageID);
                } else {
                    api.sendMessage("❌ Có lỗi xảy ra khi thêm nhóm vào hệ thống AI!", threadID, messageID);
                }
            } catch (error) {
                console.error("[AI] Add group error:", error);
                api.sendMessage("❌ Lỗi hệ thống! Không thể thêm nhóm.", threadID, messageID);
            }
            break;

        case "remove":
            if (!targetThreadID) {
                return api.sendMessage("❌ Thiếu Thread ID! Sử dụng: aisp remove {threadID}", threadID, messageID);
            }

            try {
                const success = await removeGroupFromAI(targetThreadID);
                if (success) {
                    api.sendMessage(`✅ ĐÃ TẮT AI CHAT CHO NHÓM!

📍 Thread ID: ${targetThreadID}
⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}

🚫 Nhóm này không còn được sử dụng AI chat nữa!`, threadID, messageID);
                } else {
                    api.sendMessage("❌ Nhóm này chưa được bật AI hoặc không tồn tại!", threadID, messageID);
                }
            } catch (error) {
                console.error("[AI] Remove group error:", error);
                api.sendMessage("❌ Lỗi hệ thống! Không thể xóa nhóm.", threadID, messageID);
            }
            break;

        case "list":
            try {
                const groups = await getAllEnabledGroups();
                if (groups.length === 0) {
                    api.sendMessage("📝 CHƯA CÓ NHÓM NÀO ĐƯỢC BẬT AI CHAT!", threadID, messageID);
                } else {
                    let message = `📋 DANH SÁCH NHÓM ĐÃ BẬT AI CHAT (${groups.length} nhóm):\n\n`;
                    
                    groups.forEach((group, index) => {
                        const enabledDate = new Date(group.enabled_at).toLocaleString('vi-VN');
                        message += `${index + 1}. ${group.group_name || 'Không rõ tên'}\n`;
                        message += `   📍 ID: ${group.thread_id}\n`;
                        message += `   👤 Bởi: ${group.enabled_by}\n`;
                        message += `   ⏰ Ngày: ${enabledDate}\n\n`;
                    });

                    api.sendMessage(message, threadID, messageID);
                }
            } catch (error) {
                console.error("[AI] List groups error:", error);
                api.sendMessage("❌ Lỗi hệ thống! Không thể lấy danh sách nhóm.", threadID, messageID);
            }
            break;

        default:
            api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng: add, remove, hoặc list", threadID, messageID);
    }
};

// === AUTO REPLY HANDLER ===
module.exports.handleEvent = async function ({ api, event, Users }) {
    const { threadID, messageID, body, messageReply, senderID } = event;
    
    // Chỉ xử lý tin nhắn văn bản
    if (event.type !== "message" || !body) return;
    
    // Kiểm tra xem tin nhắn có bắt đầu bằng "sp " không (không phân biệt hoa thường)
    const normalizedBody = body.toLowerCase().trim();
    if (!normalizedBody.startsWith("sp ") && normalizedBody !== "sp") return;
    
    // Kiểm tra nhóm có được bật AI không
    const isEnabled = await isGroupEnabled(threadID);
    if (!isEnabled) return;
    
    try {
        // Lấy AI settings từ database
        const settings = await getAISettings();
        const apiKey = settings.gemini_api_key;
        const systemPrompt = settings.system_prompt;
        const aiEnabled = settings.ai_enabled === '1';
        
        if (!aiEnabled) {
            return api.sendMessage("🚫 Hệ thống AI hiện đang bảo trì, vui lòng thử lại sau!", threadID, messageID);
        }
        
        // Kiểm tra đơn giản hơn:
if (!apiKey || apiKey.trim() === '') {
    return api.sendMessage("❌ API Key chưa được cấu hình đúng cách!", threadID, messageID);
}
        
        // Lấy nội dung sau "sp "
        const prompt = body.slice(2).trim(); // Bỏ "sp" và khoảng trắng
        
        if (!prompt && !messageReply) {
            return api.sendMessage(`
🤖 CÁCH SỬ DỤNG AI CHAT:

💬 Chat thường: sp [câu hỏi]
🖼️ Hỏi về ảnh: reply ảnh + sp [câu hỏi]

📝 VÍ DỤ:
• sp hướng dẫn tạo bxh free fire
• sp giải thích cách dùng bot
• (reply ảnh) + sp phân tích ảnh này
            `, threadID, messageID);
        }
        
        // Lấy thông tin user để cá nhân hóa response
        let userInfo = null;
        try {
            userInfo = await Users.getData(senderID);
        } catch (e) {
            console.log("[AI] Không thể lấy thông tin user");
        }
        
        // Tạo system prompt với thông tin user
        let enhancedSystemPrompt = systemPrompt;
        if (userInfo) {
            enhancedSystemPrompt += `\n\nThông tin người dùng hiện tại:\n- Tên: ${userInfo.name}\n- ID: ${senderID}`;
        }
        
        let responseText = "";
        
        // Xử lý câu hỏi text thuần
        responseText = await geminiTextRequest(prompt, apiKey, enhancedSystemPrompt);
        
        // Gửi phản hồi
        if (responseText && responseText.length > 0) {
            // Giới hạn độ dài response để tránh spam
            if (responseText.length > 2000) {
                responseText = responseText.substring(0, 1950) + "\n\n... (đã rút gọn để tránh tin nhắn quá dài)\n liên hệ AD: fb.com/pcoder090 \n zalo.me/0786888655";
            }
            api.sendMessage(responseText, threadID, messageID);
        } else {
            api.sendMessage("🤖 Xin lỗi, tôi không thể tạo ra câu trả lời phù hợp lúc này. Bạn có thể thử hỏi cách khác không?", threadID, messageID);
        }
        
    } catch (error) {
        console.error("[AI-AUTO] Error:", error);
        
        // Phản hồi lỗi thân thiện
        let errorMessage = "🤖 Có lỗi xảy ra khi xử lý yêu cầu của bạn. ";
        
        if (error.response?.status === 429) {
            errorMessage += "Hệ thống đang quá tải, vui lòng thử lại sau ít phút!";
        } else if (error.response?.status === 401) {
            errorMessage += "Có vấn đề với cấu hình API, đã thông báo admin!";
        } else {
            errorMessage += "Vui lòng thử lại sau hoặc liên hệ admin nếu lỗi vẫn tiếp diễn.";
        }
        
        api.sendMessage(errorMessage, threadID, messageID);
    }
};