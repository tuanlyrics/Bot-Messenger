// File: modules/commands/aitd.js
// Version: 1.0-AI-Integration-Refactored
// AI-powered command parser for TD command
// Created by: Claude & Gemini

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ==================== CẤU HÌNH ====================

// Gemini API Keys (rotation)
const GEMINI_API_KEYS = [
    'AIzaSyDPhZawz3W_fcciC3UhBr2uOLKP7Qb8Hk4',
    'AIzaSyACNVvOHvfWLk8hpEKB9cWahIUG0gU2-VY'
];

// Danh sách box được phép sử dụng AI (threadID)
// Để mảng rỗng [] = cho phép tất cả
const ALLOWED_AI_BOXES = [
    // Thêm threadID vào đây
    // Ví dụ: '1234567890', '0987654321'
];

// Chi phí sử dụng AI (miễn phí - không trừ tiền)
// Chỉ trừ tiền khi gọi lệnh .td thực tế
const AI_COST_PER_USE = 0;

let currentKeyIndex = 0;

// ==================== GEMINI AI SETUP ====================

const SYSTEM_PROMPT = `Bạn là trợ lý phân tích lệnh tính điểm Free Fire. Nhiệm vụ của bạn là chuyển đổi yêu cầu bằng ngôn ngữ tự nhiên thành các tham số chuẩn.

**CẤU TRÚC LỆNH TD:**

1. **BXH THƯỜNG:**
   - Cú pháp: td [ID] [Tên giải] [Key logo] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT] [Bỏ trận]
   - ID: Số Garena (bắt buộc)
   - Tên giải: Tên giải đấu (có thể "null")
   - Key logo: API key logo (có thể "null")
   - Bỏ trận: Có 3 định dạng:
     * Rời rạc: "2,4,6" - bỏ các trận 2, 4, 6
     * Range: "1-5" - bỏ trận từ 1 đến 5
     * Số lượng: "3" - bỏ 3 trận mới nhất

2. **CPR MODE:**
   - Cú pháp: td cpr [ID] [Mốc điểm] [Tên giải] [Key logo] [Ngày BĐ] [Giờ BĐ] [Ngày KT] [Giờ KT]
   - Mốc điểm: Số điểm tối thiểu (bắt buộc)

**KHUNG GIỜ:**
- "sáng": 08:00 - 10:00
- "trưa": 12:00 - 14:00
- "chiều": 14:00 - 16:00
- "tối": 20:00 - 22:00
- "đêm": 22:00 - 00:00 (ngày hôm sau)
- "cả ngày": 00:00 - 23:59
- Có thể ghi cụ thể: "13:00 - 15:00", "20:00 đến 21:30"

**NGÀY GIỜ:**
- Định dạng ngày: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
- "hôm nay", "ngày mai", "hôm qua"
- Nếu không có ngày giờ cụ thể, để null

**PHÂN TÍCH NGÔN NGỮ TỰ NHIÊN:**
- "tính trong khung giờ sáng" → start: 08:00, end: 10:00
- "bỏ trận 2 và 4" → skip: "2,4"
- "bỏ từ trận 1 đến 5" → skip: "1-5"
- "bỏ 3 trận mới nhất" → skip: "3"
- "tên giải là Champions" → tournament_name: "Champions"
- "key logo abc123" → logo_key: "abc123"
- "mốc 50 điểm" → point_threshold: 50

**YÊU CẦU TRẢ VỀ:**
Phân tích yêu cầu và trả về JSON với cấu trúc:
{
  "mode": "ffrank" hoặc "cpr",
  "id": "ID Garena",
  "tournament_name": "Tên giải hoặc null",
  "logo_key": "Key logo hoặc null",
  "start_date": "DD/MM/YYYY hoặc null",
  "start_time": "HH:mm hoặc null",
  "end_date": "DD/MM/YYYY hoặc null",
  "end_time": "HH:mm hoặc null",
  "skip_matches": "Định dạng bỏ trận hoặc 0",
  "point_threshold": số (chỉ cho CPR) hoặc null,
  "confidence": số từ 0-100,
  "explanation": "Giải thích ngắn gọn"
}

**VÍ DỤ PHÂN TÍCH:**

Input: "td 1234567890 tính trong khung giờ sáng bỏ trận 2 và 4"
Output:
{
  "mode": "ffrank",
  "id": "1234567890",
  "tournament_name": null,
  "logo_key": null,
  "start_date": null,
  "start_time": "08:00",
  "end_date": null,
  "end_time": "10:00",
  "skip_matches": "2,4",
  "point_threshold": null,
  "confidence": 95,
  "explanation": "Tính BXH sáng (8h-10h), bỏ trận 2 và 4"
}

Input: "td 9999 tên giải Champions key logo abc123 tính chiều hôm nay"
Output:
{
  "mode": "ffrank",
  "id": "9999",
  "tournament_name": "Champions",
  "logo_key": "abc123",
  "start_date": "HÔM_NAY",
  "start_time": "14:00",
  "end_date": "HÔM_NAY",
  "end_time": "16:00",
  "skip_matches": "0",
  "point_threshold": null,
  "confidence": 95,
  "explanation": "Giải Champions, chiều (14h-16h), có key logo"
}

Input: "td cpr 5555 mốc 50 điểm tối nay tên giải Test"
Output:
{
  "mode": "cpr",
  "id": "5555",
  "tournament_name": "Test",
  "logo_key": null,
  "start_date": "HÔM_NAY",
  "start_time": "20:00",
  "end_date": "HÔM_NAY",
  "end_time": "22:00",
  "skip_matches": "0",
  "point_threshold": 50,
  "confidence": 95,
  "explanation": "CPR mốc 50 điểm, tối (20h-22h)"
}

Input: "td 7777 từ 13:00 đến 15:00 ngày 20/10/2025 bỏ trận 1-5"
Output:
{
  "mode": "ffrank",
  "id": "7777",
  "tournament_name": null,
  "logo_key": null,
  "start_date": "20/10/2025",
  "start_time": "13:00",
  "end_date": "20/10/2025",
  "end_time": "15:00",
  "skip_matches": "1-5",
  "point_threshold": null,
  "confidence": 95,
  "explanation": "Tính từ 13h-15h ngày 20/10, bỏ trận 1-5"
}

QUAN TRỌNG: Chỉ trả về JSON, không thêm text khác.`;

// ==================== HELPER FUNCTIONS ====================

/**
 * Lấy Gemini client với rotation keys
 */
function getGeminiClient() {
    const apiKey = GEMINI_API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Kiểm tra quyền sử dụng AI
 */
function checkAIPermission(threadID) {
    // Nếu danh sách rỗng, cho phép tất cả
    if (ALLOWED_AI_BOXES.length === 0) {
        return true;
    }
    return ALLOWED_AI_BOXES.includes(threadID);
}

/**
 * Format ngày từ Date object
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Xử lý ngày tương đối (hôm nay, ngày mai, hôm qua)
 */
function processRelativeDate(dateString) {
    if (!dateString) return null;
    
    const today = new Date();
    const normalized = dateString.toLowerCase().trim();
    
    if (normalized === 'hôm_nay' || normalized === 'hôm nay') {
        return formatDate(today);
    }
    
    if (normalized === 'ngày_mai' || normalized === 'ngày mai') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
    }
    
    if (normalized === 'hôm_qua' || normalized === 'hôm qua') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return formatDate(yesterday);
    }
    
    return dateString;
}

// ==================== AI PROCESSING ====================

/**
 * Phân tích yêu cầu với Gemini AI
 */
async function parseWithAI(userInput) {
    try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            }
        });

        const prompt = `${SYSTEM_PROMPT}\n\nYêu cầu của người dùng: "${userInput}"\n\nPhân tích và trả về JSON:`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Loại bỏ markdown code blocks nếu có
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const parsed = JSON.parse(text);
        
        // Validate kết quả
        if (!parsed.id || !parsed.mode) {
            throw new Error("Thiếu thông tin ID hoặc mode");
        }
        
        // Xử lý ngày tương đối
        parsed.start_date = processRelativeDate(parsed.start_date);
        parsed.end_date = processRelativeDate(parsed.end_date);
        
        return parsed;
        
    } catch (error) {
        console.error('[AITD] Lỗi phân tích AI:', error);
        throw new Error(`Không thể phân tích yêu cầu: ${error.message}`);
    }
}

/**
 * Chuyển đổi kết quả AI sang cú pháp TD
 */
function convertToTDCommand(aiResult) {
    const parts = [];
    
    // Mode (nếu là CPR)
    if (aiResult.mode === 'cpr') {
        parts.push('cpr');
    }
    
    // ID (bắt buộc)
    parts.push(aiResult.id);
    
    // Mốc điểm (chỉ cho CPR)
    if (aiResult.mode === 'cpr' && aiResult.point_threshold) {
        parts.push(aiResult.point_threshold.toString());
    }
    
    // Tên giải
    parts.push(aiResult.tournament_name || 'null');
    
    // Key logo
    parts.push(aiResult.logo_key || 'null');
    
    // Ngày giờ (nếu có đầy đủ)
    if (aiResult.start_date && aiResult.start_time && 
        aiResult.end_date && aiResult.end_time) {
        parts.push(aiResult.start_date);
        parts.push(aiResult.start_time);
        parts.push(aiResult.end_date);
        parts.push(aiResult.end_time);
    }
    
    // Bỏ trận (chỉ cho ffrank)
    if (aiResult.mode === 'ffrank' && aiResult.skip_matches && aiResult.skip_matches !== '0') {
        parts.push(aiResult.skip_matches);
    }
    
    return parts.join(' ');
}

// ==================== MESSAGE TEMPLATES ====================

function getHelpMessage() {
    return `📌 HƯỚNG DẪN LỆNH td (AI Tính Điểm - NoPrefix)

🤖 Sử dụng AI để tính điểm bằng ngôn ngữ tự nhiên!

🎁 AI MIỄN PHÍ - Chỉ trừ tiền khi tính điểm thực tế!

📝 CÚ PHÁP:
td [ID] [yêu cầu tự nhiên...]

✨ VÍ DỤ SỬ DỤNG:

1️⃣ Khung giờ + Bỏ trận:
   td 1234567890 tính trong khung giờ sáng bỏ trận 2 và 4
   td 9999 chiều hôm nay bỏ từ trận 1 đến 5

2️⃣ Với tên giải:
   td 7777 tên giải Champions tính tối nay
   td 5555 giải Test khung 13:00 - 15:00

3️⃣ Với key logo:
   td 8888 key logo abc123 tính sáng
   td 6666 tên giải FFWS key xyz789 tối nay

4️⃣ Tính CPR:
   td cpr 4444 mốc 50 điểm tối nay
   td cpr 3333 50 điểm giải Champions

5️⃣ Đầy đủ:
   td 2222 tên giải Test key abc123 từ 13:00 đến 15:00 ngày 20/10/2025 bỏ trận 2,4,6

🕐 KHUNG GIỜ HỖ TRỢ:
• sáng → 08:00-10:00
• trưa → 12:00-14:00
• chiều → 14:00-16:00
• tối → 20:00-22:00
• đêm → 22:00-00:00
• cả ngày → 00:00-23:59
• Hoặc ghi cụ thể: "13:00 đến 15:00"

📅 NGÀY THÁNG:
• hôm nay, ngày mai, hôm qua
• Hoặc: DD/MM/YYYY, DD-MM-YYYY

🔢 BỎ TRẬN:
• Rời rạc: "bỏ trận 2 và 4" → 2,4
• Range: "bỏ từ trận 1 đến 5" → 1-5
• Số lượng: "bỏ 3 trận mới nhất" → 3

⚠️ LƯU Ý:
• AI phân tích MIỄN PHÍ
• Chỉ trừ tiền khi thực sự tính điểm (gọi lệnh .td)
• Chi phí tính điểm: 300đ/lần (hoặc miễn phí nếu đã thuê)
• Chỉ hỗ trợ các box được chỉ định
• AI sẽ phân tích và chuyển đổi sang lệnh .td`;
}

function getNoPermissionMessage() {
    return "⚠️ Box này chưa được cấp quyền sử dụng AI!\n\n" +
           "📌 Vui lòng liên hệ admin để được thêm vào danh sách.";
}

function getLowConfidenceMessage(confidence, explanation) {
    return `⚠️ AI không chắc chắn về yêu cầu của bạn (${confidence}%)\n\n` +
           `📝 Hiểu được: ${explanation}\n\n` +
           `💡 Vui lòng thử diễn đạt rõ ràng hơn hoặc dùng lệnh .td trực tiếp.`;
}

function getConfirmMessage(explanation, confidence, tdCommand) {
    return `✅ AI đã phân tích thành công!\n\n` +
           `📊 Hiểu được: ${explanation}\n` +
           `🎯 Độ chắc chắn: ${confidence}%\n` +
           `📝 Lệnh tương ứng: .td ${tdCommand}\n\n` +
           `🔄 Đang thực hiện...`;
}

function getErrorMessage(error) {
    let errorMsg = "❌ Đã có lỗi xảy ra khi xử lý yêu cầu!\n\n";
    
    if (error.message.includes("Không thể phân tích")) {
        errorMsg += "🤖 AI không hiểu yêu cầu của bạn.\n\n";
        errorMsg += "💡 Gợi ý:\n";
        errorMsg += "• Đảm bảo có ID Garena\n";
        errorMsg += "• Diễn đạt rõ ràng hơn\n";
        errorMsg += "• Hoặc sử dụng lệnh .td trực tiếp";
    } else {
        errorMsg += `Chi tiết: ${error.message}`;
    }
    
    return errorMsg;
}

// ==================== MAIN COMMAND ====================

module.exports.config = {
    name: "aitd",
    version: "1.0-AI-Integration-Refactored",
    hasPermssion: 0,
    credits: "Claude & Gemini",
    description: "Tính điểm FF bằng AI (ngôn ngữ tự nhiên) - NoPrefix",
    commandCategory: "game",
    usages: "td [ID] [yêu cầu...]",
    cooldowns: 10,
    costPerUse: AI_COST_PER_USE,
    noPrefix: true
};

module.exports.run = async function({ api, event, args, global }) {
    const { threadID, messageID, senderID } = event;
    
    // DEBUG: Log để kiểm tra
    console.log('[AITD DEBUG] Event body:', event.body);
    console.log('[AITD DEBUG] Args:', args);
    
    // Kiểm tra xem có phải lệnh td không (noPrefix)
    const text = event.body.trim();
    
    // Chỉ xử lý nếu bắt đầu bằng "td " hoặc chính xác là "td"
    if (!text.toLowerCase().startsWith('td ') && text.toLowerCase() !== 'td') {
        console.log('[AITD DEBUG] Không phải lệnh td, bỏ qua');
        return;
    }
    
    console.log('[AITD DEBUG] Đã nhận lệnh td!');
    
    // Lấy phần sau "td"
    const afterTd = text.slice(2).trim();
    
    console.log('[AITD DEBUG] Phần sau td:', afterTd);
    
    // Xử lý help
    if (afterTd === '' || afterTd.toLowerCase() === 'help') {
        return api.sendMessage(getHelpMessage(), threadID, messageID);
    }
    
    // Kiểm tra quyền sử dụng AI
    if (!checkAIPermission(threadID)) {
        console.log('[AITD DEBUG] Box không có quyền AI');
        return api.sendMessage(getNoPermissionMessage(), threadID, messageID);
    }
    
    console.log('[AITD DEBUG] Box có quyền AI, bắt đầu xử lý...');
    
    try {
        // Thông báo đang xử lý
        api.sendMessage("🤖 AI đang phân tích yêu cầu của bạn...", threadID, messageID);
        
        // Phân tích với AI
        console.log('[AITD DEBUG] Gọi parseWithAI...');
        const aiResult = await parseWithAI(afterTd);
        
        console.log('[AITD DEBUG] AI Result:', JSON.stringify(aiResult, null, 2));
        
        // Kiểm tra confidence
        if (aiResult.confidence < 70) {
            return api.sendMessage(
                getLowConfidenceMessage(aiResult.confidence, aiResult.explanation),
                threadID,
                messageID
            );
        }
        
        // Chuyển đổi sang cú pháp td
        const tdCommand = convertToTDCommand(aiResult);
        
        console.log('[AITD DEBUG] TD Command:', tdCommand);
        
        // Gửi thông báo xác nhận
        await api.sendMessage(
            getConfirmMessage(aiResult.explanation, aiResult.confidence, tdCommand),
            threadID,
            messageID
        );
        
        // Gọi lệnh td
        const tdModule = require('./ff.js');
        
        // Tạo event giả để gọi td
        const fakeEvent = {
            ...event,
            body: `.td ${tdCommand}`
        };
        
        // Parse args cho td
        const tdArgs = tdCommand.split(' ');
        
        console.log('[AITD DEBUG] Gọi td.run với args:', tdArgs);
        
        // Gọi td.run
        await tdModule.run({
            api,
            event: fakeEvent,
            args: tdArgs,
            global: global
        });
        
    } catch (error) {
        console.error('[AITD] Lỗi:', error);
        console.error('[AITD] Stack:', error.stack);
        return api.sendMessage(getErrorMessage(error), threadID, messageID);
    }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Thêm box vào danh sách được phép dùng AI
 */
module.exports.addAIBox = function(threadID) {
    if (!ALLOWED_AI_BOXES.includes(threadID)) {
        ALLOWED_AI_BOXES.push(threadID);
        return true;
    }
    return false;
};

/**
 * Xóa box khỏi danh sách được phép dùng AI
 */
module.exports.removeAIBox = function(threadID) {
    const index = ALLOWED_AI_BOXES.indexOf(threadID);
    if (index > -1) {
        ALLOWED_AI_BOXES.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Lấy danh sách box được phép dùng AI
 */
module.exports.getAIBoxes = function() {
    return [...ALLOWED_AI_BOXES];
};