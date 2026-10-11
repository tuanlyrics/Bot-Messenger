const axios = require('axios');
const moment = require('moment-timezone');

// ----- CẤU HÌNH -----
const CREATE_URL = 'https://api.spn.io.vn/api/profile/create';
const GET_KEY_URL = 'https://spn.io.vn/Ajaxs/get_user_apikey.php';
const CHECK_PERMISSION_URL = 'https://api.spn.io.vn/api/keys/check-permission';
const CHARACTERS_URL = 'https://api.spn.io.vn/api/profile/characters';
const GUNS_URL = 'https://api.spn.io.vn/api/profile/guns';
const TEMPLATES_URL = 'https://api.spn.io.vn/api/profile/templates';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Chi phí mỗi lần dùng (chỉ áp dụng khi chưa thuê)
const COST_PER_USE = 1000;

// --- VALID ROLES CHO CANVAS VÀNG ---
const VALID_ROLES = ["sniper", "bommer", "rusher", "support", "cover"];

// ----- HÀM PARSE NGÀY SINH LINH HOẠT -----
function parseDateOfBirth(input) {
    const trimmed = input.trim();
    
    // Format 1: DD/MM/YYYY (01/01/2000)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
    }
    
    // Format 2: MM/YYYY (01/2000) -> convert to 01/MM/YYYY
    if (/^\d{1,2}\/\d{4}$/.test(trimmed)) {
        const parts = trimmed.split('/');
        return `01/${parts[0]}/${parts[1]}`;
    }
    
    // Format 3: YYYY (2000) -> convert to 01/01/YYYY
    if (/^\d{4}$/.test(trimmed)) {
        return `01/01/${trimmed}`;
    }
    
    return null; // Invalid format
}

// ----- HÀM KIỂM TRA QUYỀN THUÊ -----
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
            command_name: 'profile',
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

// ----- HÀM LẤY DANH SÁCH TEMPLATES -----
async function getTemplatesList(userApiKey) {
    try {
        const response = await axios.get(TEMPLATES_URL, {
            headers: { 'x-api-key': userApiKey }
        });
        if (response.data.success) {
            return response.data.templates;
        }
        return [];
    } catch (error) {
        console.warn('[GET_TEMPLATES] Lỗi khi lấy danh sách templates:', error.message);
        return [];
    }
}

// ----- HÀM LẤY DANH SÁCH NHÂN VẬT -----
async function getCharactersList(userApiKey) {
    try {
        const response = await axios.get(CHARACTERS_URL, {
            headers: { 'x-api-key': userApiKey }
        });
        if (response.data.success) {
            return response.data.characters;
        }
        return [];
    } catch (error) {
        console.warn('[GET_CHARACTERS] Lỗi khi lấy danh sách nhân vật:', error.message);
        return [];
    }
}

// ----- HÀM LẤY DANH SÁCH SÚNG -----
async function getGunsList(userApiKey) {
    try {
        const response = await axios.get(GUNS_URL, {
            headers: { 'x-api-key': userApiKey }
        });
        if (response.data.success) {
            return response.data.guns;
        }
        return [];
    } catch (error) {
        console.warn('[GET_GUNS] Lỗi khi lấy danh sách súng:', error.message);
        return [];
    }
}

// ----- HELPER FUNCTION ĐỂ LẤY CLIENT -----
function getClient(global) {
    if (global && global.client) return global.client;
    if (global && global.data) return global.data;
    if (typeof client !== 'undefined') return client;
    return { handleReply: [] };
}

// ----- HÀM GỌI API PROFILE -----
async function callProfileApi(api, event, payload) {
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

        const finalPayload = {
            ...payload,
            bot_sender_id: senderID,
            bot_thread_id: threadID,
            bot_is_group: isGroup.toString()
        };

        const response = await axios.post(CREATE_URL, finalPayload, {
            headers: { 'Content-Type': 'multipart/form-data', 'x-api-key': userApiKey },
            responseType: 'stream',
            timeout: 180000
        });

        let successMsg = `✅ Profile đã tạo thành công!\n`;
        successMsg += `🎮 ${payload.playerName} | 👤 ${payload.fullName}\n`;
        successMsg += `🎨 Mẫu: ${payload.template === 'canvas_vang' ? 'Vàng' : 'Xanh'}\n`;
        
        if (hasRentalPermission) {
            successMsg += `🆓 Miễn phí`;
        } else {
            successMsg += `💰 -${COST_PER_USE.toLocaleString()}đ`;
        }
        
        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);

    } catch (error) {
        return handleApiError(api, event, error);
    }
}

// ----- HÀM XỬ LÝ LỖI API -----
function handleApiError(api, event, error) {
    console.error('API Error:', error);
    let errorMessage = '❌ Lỗi khi tạo profile.\n';
    
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 402) {
            errorMessage = `❌ Không đủ tiền (cần ${COST_PER_USE.toLocaleString()}đ)`;
        } else if (status === 401 || status === 403) {
            errorMessage = '❌ Lỗi xác thực';
        } else if (status === 400 && data && data.message) {
            errorMessage = `❌ ${data.message}`;
        } else if (status === 500) {
            errorMessage = '❌ Lỗi server';
        } else {
            errorMessage += `Status: ${status}`;
        }
    } else if (error.code === 'ECONNABORTED') {
        errorMessage = '❌ Timeout';
    } else {
        errorMessage += error.message;
    }
    
    api.sendMessage(errorMessage, event.threadID, event.messageID);
}

// ----- HELPER SEND CREATED LIST IMAGE -----
async function sendCreatedListImage(api, event, title, items, columns = 4) {
    try {
        const { threadID, messageID, senderID } = event;
        
        let userApiKey;
        try {
            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
            userApiKey = keyResponse.data.apiKey;
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi lấy API Key: ${e.message}`, threadID, messageID);
        }

        const response = await axios.post('https://api.spn.io.vn/api/profile/create-list-image', 
            { title, items, columns },
            {
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': userApiKey 
                },
                responseType: 'stream',
                timeout: 30000
            }
        );

        return api.sendMessage({ body: `📋 ${title}`, attachment: response.data }, threadID, messageID);
        
    } catch (error) {
        console.error('Error creating list image:', error);
        
        let textList = `📋 ${title}\n\n`;
        items.forEach((item, index) => {
            textList += `${index + 1}. ${item}\n`;
        });
        
        return api.sendMessage(textList, event.threadID, event.messageID);
    }
}

// ----- HÀM PARSE QUICK INPUT -----
function parseQuickInput(input) {
    // Format canvas vàng (8 phần - không có social): template | mainChar | playerName | fullName | DOB | gameId | position | guns | favChars
    // Format canvas xanh (9 phần - có social): template | mainChar | playerName | fullName | DOB | gameId | position | guns | favChars | social
    const parts = input.split('|').map(s => s.trim());
    
    if (parts.length < 8) {
        return null;
    }
    
    // Chuyển đổi template từ vang/xanh sang canvas_vang/canvas_xanh
    let template = 'canvas_xanh';
    const templateInput = parts[0].toLowerCase();
    if (templateInput === 'vang' || templateInput === 'vàng') {
        template = 'canvas_vang';
    } else if (templateInput === 'xanh') {
        template = 'canvas_xanh';
    }
    
    // Xử lý mainCharacter: "anh" = custom upload, số = từ database
    const mainCharInput = parts[1].toLowerCase().trim();
    let mainCharacter = 'custom';
    let needUpload = false;
    
    if (mainCharInput === 'anh' || mainCharInput === 'ảnh' || mainCharInput === 'upload') {
        mainCharacter = 'custom';
        needUpload = true;
    } else {
        const charNum = parseInt(parts[1]);
        if (!isNaN(charNum) && charNum > 0) {
            mainCharacter = charNum;
            needUpload = false;
        } else {
            return null;
        }
    }
    
    const cleanGuns = parts[7].replace(/\s+/g, '');
    const cleanChars = parts[8].replace(/\s+/g, '');
    
    // Parse dateOfBirth linh hoạt
    const parsedDOB = parseDateOfBirth(parts[4]);
    if (!parsedDOB) {
        return null; // Invalid date format
    }
    
    // Canvas vàng không cần social (8 phần), canvas xanh cần social (9 phần)
    let socialName = 'SPN.IO.VN';
    if (template === 'canvas_xanh') {
        if (parts.length < 9) {
            return null; // Canvas xanh cần ít nhất 9 phần
        }
        socialName = parts[9] || 'SPN.IO.VN';
    }
    
    return {
        template: template,
        mainCharacter: mainCharacter,
        needUpload: needUpload,
        playerName: parts[2],
        fullName: parts[3],
        dateOfBirth: parsedDOB,
        gameId: parts[5],
        position: parts[6],
        gunChoices: cleanGuns,
        charChoices: cleanChars,
        socialName: template === 'canvas_xanh' ? socialName : null
    };
}

// ----- HÀM MAIN RUN -----
async function run({ api, event, args, Users, Threads, Currencies }) {
    const { threadID, messageID, senderID } = event;

    let userApiKey;
    try {
        const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
        if (!keyResponse.data.success) {
            return api.sendMessage(`❌ ${keyResponse.data.message}`, threadID, messageID);
        }
        userApiKey = keyResponse.data.apiKey;
    } catch (error) {
        return api.sendMessage(`❌ Lỗi khi lấy API Key: ${error.message}`, threadID, messageID);
    }

    // ===== NHẬP NHANH: .profile DATA | DATA | DATA =====
    if (args.length > 0 && args.join(' ').includes('|')) {
        const input = args.join(' ');
        const parsed = parseQuickInput(input);
        
        console.log('[DEBUG] Input:', input);
        console.log('[DEBUG] Parsed:', parsed);
        
        if (!parsed) {
            return api.sendMessage(
                `❌ Sai format!\n\n` +
                `📝 Format Canvas Vàng (8 phần - không có social):\n` +
                `.profile vang | {NV} | TênGame | Họ Tên | NgàySinh | GameID | Vị trí | Súng1,Súng2 | NV1,NV2,NV3,NV4\n\n` +
                `📝 Format Canvas Xanh (9 phần - có social):\n` +
                `.profile xanh | {NV} | TênGame | Họ Tên | NgàySinh | GameID | Vị trí | Súng1,Súng2 | NV1,NV2,NV3,NV4 | Social\n\n` +
                `📅 Format Ngày Sinh:\n` +
                `• DD/MM/YYYY (VD: 01/01/2000)\n` +
                `• MM/YYYY (VD: 01/2000)\n` +
                `• YYYY (VD: 2000)\n\n` +
                `📌 Ví dụ:\n` +
                `• Canvas Vàng: .profile vang | anh | SPIDER | Nguyễn Văn A | 2000 | 123456 | sniper | 23,2 | 1,5,10,22\n` +
                `• Canvas Xanh: .profile xanh | 15 | SPIDER | Nguyễn Văn A | 01/2000 | 123456 | Rusher | 23,2 | 1,5,10,22 | fb.com/spider\n\n` +
                `🎨 Mẫu:\n` +
                `• xanh - Không giới hạn role, CÓ link social\n` +
                `• vang - YÊU CẦU role (${VALID_ROLES.join(', ')}), KHÔNG có link social`,
                threadID, messageID
            );
        }
        
        // Nếu cần upload ảnh
        if (parsed.needUpload) {
            const clientObj = getClient(global);
            return api.sendMessage(
                `✅ Đã nhận thông tin!\n\n` +
                `📸 Vui lòng reply ảnh nhân vật của bạn (tự động xóa nền)`,
                threadID, (err, info) => {
                    if (err) return;
                    if (!clientObj.handleReply) clientObj.handleReply = [];
                    clientObj.handleReply.push({
                        name: 'profile',
                        messageID: info.messageID,
                        author: senderID,
                        type: 'quick_upload_image',
                        parsedData: parsed
                    });
                }, messageID
            );
        }
        
        // Validate template
        if (!['canvas_xanh', 'canvas_vang'].includes(parsed.template)) {
            return api.sendMessage(`❌ Mẫu không hợp lệ. Chọn: xanh hoặc vang`, threadID, messageID);
        }
        
        // Validate role cho canvas vàng
        if (parsed.template === 'canvas_vang') {
            const lowerPosition = parsed.position.toLowerCase().trim();
            if (!VALID_ROLES.includes(lowerPosition)) {
                return api.sendMessage(
                    `❌ Mẫu Vàng chỉ chấp nhận các role sau:\n${VALID_ROLES.join(', ')}\n\nBạn đã nhập: "${parsed.position}"`,
                    threadID, messageID
                );
            }
        }
        
        // Validate mainCharacter (nếu là số)
        if (typeof parsed.mainCharacter === 'number') {
            const mainChar = parsed.mainCharacter;
            if (mainChar < 1) {
                return api.sendMessage("❌ Nhân vật chính phải là số > 0", threadID, messageID);
            }
        }
        
        // Validate guns
        const guns = parsed.gunChoices.split(',').map(item => parseInt(item.trim()));
        if (guns.length < 2 || guns.some(isNaN) || guns.some(n => n < 1)) {
            return api.sendMessage(`❌ Súng phải là 2 số hợp lệ (VD: 23,2)`, threadID, messageID);
        }
        
        // Validate favChars
        const favChars = parsed.charChoices.split(',').map(item => parseInt(item.trim()));
        if (favChars.length < 4 || favChars.some(isNaN) || favChars.some(n => n < 1)) {
            return api.sendMessage(`❌ Nhân vật yêu thích phải là 4 số hợp lệ (VD: 1,5,10,22)`, threadID, messageID);
        }
        
        // Tạo payload
        const payload = {
            playerName: parsed.playerName,
            fullName: parsed.fullName,
            dateOfBirth: parsed.dateOfBirth,
            gameId: parsed.gameId,
            position: parsed.position,
            mainCharacter: parsed.mainCharacter,
            gunChoices: parsed.gunChoices,
            charChoices: parsed.charChoices,
            template: parsed.template
        };
        
        // Chỉ thêm socialName cho canvas xanh
        if (parsed.template === 'canvas_xanh') {
            payload.socialName = parsed.socialName;
        }
        
        return callProfileApi(api, event, payload);
    }

    // Xử lý các lệnh phụ
    if (args[0]) {
        const subCommand = args[0].toLowerCase();

        // Lệnh: .profile list char
        if (subCommand === 'list' && args[1] === 'char') {
            try {
                const characters = await getCharactersList(userApiKey);
                if (characters.length === 0) {
                    return api.sendMessage("❌ Không tìm thấy danh sách nhân vật.", threadID, messageID);
                }

                const characterNames = characters.map((char, index) => `${index + 1}. ${char.name}`);
                return sendCreatedListImage(api, event, 'DANH SÁCH NHÂN VẬT', characterNames, 4);

            } catch (error) {
                console.error('Error fetching characters:', error);
                return api.sendMessage("❌ Lỗi khi lấy danh sách nhân vật.", threadID, messageID);
            }
        }

        // Lệnh: .profile list gun
        if (subCommand === 'list' && args[1] === 'gun') {
            try {
                const guns = await getGunsList(userApiKey);
                if (guns.length === 0) {
                    return api.sendMessage("❌ Không tìm thấy danh sách súng.", threadID, messageID);
                }

                const gunNames = guns.map((gun, index) => `${index + 1}. ${gun.name}`);
                return sendCreatedListImage(api, event, 'DANH SÁCH SÚNG', gunNames, 4);

            } catch (error) {
                console.error('Error fetching guns:', error);
                return api.sendMessage("❌ Lỗi khi lấy danh sách súng.", threadID, messageID);
            }
        }

        // Lệnh: .profile help
        if (subCommand === 'help') {
            const helpMsg = `🎮 PROFILE HELP\n\n` +
                `📌 NHẬP NHANH:\n` +
                `• Canvas Vàng (8 phần): .profile vang | {NV} | TênGame | Họ Tên | DD/MM/YYYY | GameID | Vị trí | Súng1,Súng2 | NV1,NV2,NV3,NV4\n` +
                `• Canvas Xanh (9 phần): .profile xanh | {NV} | TênGame | Họ Tên | DD/MM/YYYY | GameID | Vị trí | Súng1,Súng2 | NV1,NV2,NV3,NV4 | Social\n\n` +
                `VD Vàng: .profile vang | anh | SPIDER | Nguyễn Văn A | 01/01/2000 | 123456 | sniper | 23,2 | 1,5,10,22\n` +
                `VD Xanh: .profile xanh | 15 | SPIDER | Nguyễn Văn A | 01/01/2000 | 123456 | Rusher | 23,2 | 1,5,10,22 | fb.com/spider\n\n` +
                `🎨 MẪU:\n` +
                `• xanh - Không giới hạn role, CÓ link social\n` +
                `• vang - YÊU CẦU role (${VALID_ROLES.join(', ')}), KHÔNG có link social\n\n` +
                `👤 NHÂN VẬT:\n` +
                `• "anh" = Upload ảnh\n` +
                `• Số (VD: 15) = Chọn từ database\n\n` +
                `📋 LỆNH PHỤ:\n` +
                `• .profile list char → Xem nhân vật\n` +
                `• .profile list gun → Xem súng\n` +
                `• .profile → Nhập từng bước\n\n` +
                `💰 CHI PHÍ: ${COST_PER_USE.toLocaleString()}đ/lần (miễn phí nếu đã thuê)`;
            
            return api.sendMessage(helpMsg, threadID, messageID);
        }
    }

    // Bắt đầu tạo profile theo từng bước (interactive)
    const clientObj = getClient(global);
    
    const welcomeMsg = `🎨 TẠO FREE FIRE PROFILE\n\n` +
        `Chọn mẫu:\n` +
        `1️⃣ Mẫu Xanh (không giới hạn role, có link social)\n` +
        `2️⃣ Mẫu Vàng (role: ${VALID_ROLES.join(', ')}, không có link social)\n\n` +
        `💡 TIP: Gõ .profile help để xem cách nhập nhanh!`;

    api.sendMessage(welcomeMsg, threadID, (err, info) => {
        if (err) return;
        if (!clientObj.handleReply) clientObj.handleReply = [];
        clientObj.handleReply.push({
            name: 'profile',
            messageID: info.messageID,
            author: senderID,
            type: 'choose_template'
        });
    }, messageID);
}

// ----- HÀM HANDLE REPLY -----
async function handleReply({ api, event, handleReply, Users, Threads, Currencies }) {
    const { threadID, messageID, senderID, body, attachments } = event;

    if (handleReply.author !== senderID) return;

    const clientObj = getClient(global);
    
    function pushNewReply(type, message, additionalData = {}) {
        api.sendMessage(message, threadID, (err, info) => {
            if (err) return;
            if (!clientObj.handleReply) clientObj.handleReply = [];
            clientObj.handleReply.push({
                ...handleReply,
                name: 'profile',
                messageID: info.messageID,
                author: senderID,
                type: type,
                ...additionalData
            });
        }, messageID);
    }

    switch (handleReply.type) {
        // === QUICK INPUT: User reply ảnh sau khi nhập nhanh ===
        case 'quick_upload_image': {
            if (!attachments || attachments.length === 0 || attachments[0].type !== 'photo') {
                return api.sendMessage("❌ Vui lòng reply ảnh", threadID, messageID);
            }
            
            const parsed = handleReply.parsedData;
            const isGroup = event.isGroup || false;
            const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, api);

            let userApiKey;
            try {
                const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
                if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
                userApiKey = keyResponse.data.apiKey;
            } catch (e) {
                return api.sendMessage(`❌ Lỗi API Key: ${e.message}`, threadID, messageID);
            }

            api.sendMessage("✅ Đã nhận ảnh! Đang xử lý...", threadID, messageID);

            try {
                const FormData = require('form-data');
                const formData = new FormData();
                
                formData.append('playerName', parsed.playerName);
                formData.append('fullName', parsed.fullName);
                formData.append('dateOfBirth', parsed.dateOfBirth);
                formData.append('gameId', parsed.gameId);
                formData.append('position', parsed.position);
                
                // Chỉ thêm socialName cho canvas xanh
                if (parsed.template === 'canvas_xanh') {
                    formData.append('socialName', parsed.socialName);
                }
                
                formData.append('mainCharacter', 'custom');
                formData.append('gunChoices', parsed.gunChoices);
                formData.append('charChoices', parsed.charChoices);
                formData.append('template', parsed.template);
                
                formData.append('bot_sender_id', senderID);
                formData.append('bot_thread_id', threadID);
                formData.append('bot_is_group', isGroup.toString());
                
                const imageResponse = await axios.get(attachments[0].url, { responseType: 'stream' });
                formData.append('characterImage', imageResponse.data, 'character.jpg');

                const response = await axios.post(CREATE_URL, formData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data', 
                        'x-api-key': userApiKey,
                        ...formData.getHeaders()
                    },
                    responseType: 'stream',
                    timeout: 180000
                });

                let successMsg = `✅ Profile tạo thành công!\n🎮 ${parsed.playerName} | 👤 ${parsed.fullName}\n`;
                successMsg += `🎨 Mẫu: ${parsed.template === 'canvas_vang' ? 'Vàng' : 'Xanh'}\n`;
                successMsg += hasRentalPermission ? `🆓 Miễn phí` : `💰 -${COST_PER_USE.toLocaleString()}đ`;
                
                return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);
            } catch (e) {
                console.error("Lỗi khi tạo ảnh:", e);
                return api.sendMessage(`❌ Lỗi: ${e.message || 'Lỗi không xác định'}`, threadID, messageID);
            }
        }

        case 'choose_template': {
            if (body === '1') {
                pushNewReply('image_source', 
                    `✅ Đã chọn Mẫu Xanh (có link social)\n\n` +
                    `Chọn nguồn nhân vật:\n` +
                    `1️⃣ Upload ảnh (tự động xóa nền)\n` +
                    `2️⃣ Chọn từ database (.profile list char)`,
                    { template: 'canvas_xanh' }
                );
            } else if (body === '2') {
                pushNewReply('image_source', 
                    `✅ Đã chọn Mẫu Vàng (không có link social)\n` +
                    `⚠️ Lưu ý: Phải nhập role hợp lệ (${VALID_ROLES.join(', ')})\n\n` +
                    `Chọn nguồn nhân vật:\n` +
                    `1️⃣ Upload ảnh (tự động xóa nền)\n` +
                    `2️⃣ Chọn từ database (.profile list char)`,
                    { template: 'canvas_vang' }
                );
            } else {
                api.sendMessage("❌ Chọn 1 hoặc 2", threadID, messageID);
            }
            break;
        }

        case 'image_source': {
            if (body === '1') {
                pushNewReply('upload_image', "📸 Reply ảnh của bạn (tự động xóa nền)");
            } else if (body === '2') {
                pushNewReply('choose_character', "🔢 Nhập số thứ tự nhân vật");
            } else { 
                api.sendMessage("❌ Chọn 1 hoặc 2", threadID, messageID); 
            }
            break;
        }

        case 'upload_image': {
            if (!attachments || attachments.length === 0 || attachments[0].type !== 'photo') {
                return api.sendMessage("❌ Vui lòng reply ảnh", threadID, messageID);
            }
            
            api.sendMessage("✅ Đã nhận ảnh!", threadID, messageID);
            pushNewReply('player_name', "📝 Tên người chơi:", { characterImageUrl: attachments[0].url });
            break;
        }

        case 'choose_character': {
            const choice = parseInt(body);
            if (isNaN(choice) || choice < 1) {
                return api.sendMessage("❌ Số không hợp lệ", threadID, messageID);
            }
            
            pushNewReply('player_name', "📝 Tên người chơi:", { characterChoice: choice });
            break;
        }

        case 'player_name': {
            pushNewReply('full_name', "📝 Họ và Tên:", { playerName: body });
            break;
        }

        case 'full_name': {
            pushNewReply('date_of_birth', "📅 Ngày sinh (DD/MM/YYYY):", { fullName: body });
            break;
        }

        case 'date_of_birth': {
            if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(body)) {
                return api.sendMessage("❌ Format: DD/MM/YYYY", threadID, messageID);
            }
            pushNewReply('game_id', "🎮 ID Game:", { dateOfBirth: body });
            break;
        }

        case 'game_id': {
            if (handleReply.template === 'canvas_vang') {
                pushNewReply('position', 
                    `🎯 Vị trí (BẮT BUỘC chọn một trong các role sau):\n` +
                    `${VALID_ROLES.join(', ')}`,
                    { gameId: body }
                );
            } else {
                pushNewReply('position', "🎯 Vị trí (VD: Rusher):", { gameId: body });
            }
            break;
        }

        case 'position': {
            if (handleReply.template === 'canvas_vang') {
                const lowerPosition = body.toLowerCase().trim();
                if (!VALID_ROLES.includes(lowerPosition)) {
                    return api.sendMessage(
                        `❌ Mẫu Vàng chỉ chấp nhận các role sau:\n${VALID_ROLES.join(', ')}\n\nBạn đã nhập: "${body}"`,
                        threadID, messageID
                    );
                }
            }
            
            pushNewReply('guns', "🔫 2 súng (VD: 23,2):", { position: body });
            break;
        }

        case 'guns': {
            const choices = body.split(',').map(item => parseInt(item.trim()));
            if (choices.length < 2 || choices.some(isNaN)) {
                return api.sendMessage("❌ Phải nhập 2 số súng", threadID, messageID);
            }
            
            pushNewReply('fav_chars', "👥 4 nhân vật yêu thích (VD: 1,5,10,22):", { gunChoices: body.trim() });
            break;
        }

        case 'fav_chars': {
            const choices = body.split(',').map(item => parseInt(item.trim()));
            if (choices.length < 4 || choices.some(isNaN)) {
                return api.sendMessage("❌ Phải nhập 4 số nhân vật", threadID, messageID);
            }
            
            // Nếu dùng canvas vàng thì tạo luôn, không hỏi social
            if (handleReply.template === 'canvas_vang') {
                const finalData = { ...handleReply, charChoices: body.trim() };
                
                api.sendMessage(`⏳ Đang tạo profile với Mẫu Vàng...`, threadID, messageID);
                
                try {
                    const payload = {
                        playerName: finalData.playerName,
                        fullName: finalData.fullName,
                        dateOfBirth: finalData.dateOfBirth,
                        gameId: finalData.gameId,
                        position: finalData.position,
                        mainCharacter: finalData.characterImageUrl ? 'custom' : finalData.characterChoice,
                        gunChoices: finalData.gunChoices,
                        charChoices: finalData.charChoices,
                        template: 'canvas_vang'
                        // Không có socialName cho canvas vàng
                    };

                    if (finalData.characterImageUrl) {
                        const isGroup = event.isGroup || false;
                        const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, api);

                        let userApiKey;
                        try {
                            const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
                            if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
                            userApiKey = keyResponse.data.apiKey;
                        } catch (e) {
                            return api.sendMessage(`❌ Lỗi API Key: ${e.message}`, threadID, messageID);
                        }

                        const FormData = require('form-data');
                        const formData = new FormData();
                        
                        formData.append('playerName', finalData.playerName);
                        formData.append('fullName', finalData.fullName);
                        formData.append('dateOfBirth', finalData.dateOfBirth);
                        formData.append('gameId', finalData.gameId);
                        formData.append('position', finalData.position);
                        // KHÔNG thêm socialName cho canvas vàng
                        formData.append('mainCharacter', 'custom');
                        formData.append('gunChoices', finalData.gunChoices);
                        formData.append('charChoices', finalData.charChoices);
                        formData.append('template', 'canvas_vang');
                        
                        formData.append('bot_sender_id', senderID);
                        formData.append('bot_thread_id', threadID);
                        formData.append('bot_is_group', isGroup.toString());
                        
                        const imageResponse = await axios.get(finalData.characterImageUrl, { responseType: 'stream' });
                        formData.append('characterImage', imageResponse.data, 'character.jpg');

                        const response = await axios.post(CREATE_URL, formData, {
                            headers: { 
                                'Content-Type': 'multipart/form-data', 
                                'x-api-key': userApiKey,
                                ...formData.getHeaders()
                            },
                            responseType: 'stream',
                            timeout: 180000
                        });

                        let successMsg = `✅ Profile tạo thành công!\n🎮 ${finalData.playerName} | 👤 ${finalData.fullName}\n`;
                        successMsg += `🎨 Mẫu: Vàng\n`;
                        successMsg += hasRentalPermission ? `🆓 Miễn phí` : `💰 -${COST_PER_USE.toLocaleString()}đ`;
                        
                        return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);

                    } else {
                        return callProfileApi(api, event, payload);
                    }
                    
                } catch(e) {
                    console.error("Lỗi khi tạo ảnh:", e);
                    return api.sendMessage(`❌ Lỗi: ${e.message || 'Lỗi không xác định'}`, threadID, messageID);
                }
            } else {
                // Canvas xanh thì hỏi social
                pushNewReply('social', "📱 Social (VD: facebook.com/username):", { charChoices: body.trim() });
            }
            break;
        }

        case 'social': {
            const finalData = { ...handleReply, socialName: body };
            
            api.sendMessage(`⏳ Đang tạo profile với Mẫu Xanh...`, threadID, messageID);
            
            try {
                const payload = {
                    playerName: finalData.playerName,
                    fullName: finalData.fullName,
                    dateOfBirth: finalData.dateOfBirth,
                    gameId: finalData.gameId,
                    position: finalData.position,
                    socialName: finalData.socialName, // Canvas xanh CÓ socialName
                    mainCharacter: finalData.characterImageUrl ? 'custom' : finalData.characterChoice,
                    gunChoices: finalData.gunChoices,
                    charChoices: finalData.charChoices,
                    template: 'canvas_xanh'
                };

                if (finalData.characterImageUrl) {
                    const isGroup = event.isGroup || false;
                    const hasRentalPermission = await checkRentalPermission(senderID, threadID, isGroup, api);

                    let userApiKey;
                    try {
                        const keyResponse = await axios.get(`${GET_KEY_URL}?userId=${senderID}`);
                        if (!keyResponse.data.success) throw new Error(keyResponse.data.message);
                        userApiKey = keyResponse.data.apiKey;
                    } catch (e) {
                        return api.sendMessage(`❌ Lỗi API Key: ${e.message}`, threadID, messageID);
                    }

                    const FormData = require('form-data');
                    const formData = new FormData();
                    
                    formData.append('playerName', finalData.playerName);
                    formData.append('fullName', finalData.fullName);
                    formData.append('dateOfBirth', finalData.dateOfBirth);
                    formData.append('gameId', finalData.gameId);
                    formData.append('position', finalData.position);
                    formData.append('socialName', finalData.socialName); // Canvas xanh CÓ socialName
                    formData.append('mainCharacter', 'custom');
                    formData.append('gunChoices', finalData.gunChoices);
                    formData.append('charChoices', finalData.charChoices);
                    formData.append('template', 'canvas_xanh');
                    
                    formData.append('bot_sender_id', senderID);
                    formData.append('bot_thread_id', threadID);
                    formData.append('bot_is_group', isGroup.toString());
                    
                    const imageResponse = await axios.get(finalData.characterImageUrl, { responseType: 'stream' });
                    formData.append('characterImage', imageResponse.data, 'character.jpg');

                    const response = await axios.post(CREATE_URL, formData, {
                        headers: { 
                            'Content-Type': 'multipart/form-data', 
                            'x-api-key': userApiKey,
                            ...formData.getHeaders()
                        },
                        responseType: 'stream',
                        timeout: 180000
                    });

                    let successMsg = `✅ Profile tạo thành công!\n🎮 ${finalData.playerName} | 👤 ${finalData.fullName}\n`;
                    successMsg += `🎨 Mẫu: Xanh\n`;
                    successMsg += hasRentalPermission ? `🆓 Miễn phí` : `💰 -${COST_PER_USE.toLocaleString()}đ`;
                    
                    return api.sendMessage({ body: successMsg, attachment: response.data }, threadID, messageID);

                } else {
                    return callProfileApi(api, event, payload);
                }
                
            } catch(e) {
                console.error("Lỗi khi tạo ảnh:", e);
                api.sendMessage(`❌ Lỗi: ${e.message || 'Lỗi không xác định'}`, threadID, messageID);
            }
            break;
        }

        default:
            return api.sendMessage("⚠️ [PROFILE] Bước xử lý không xác định.", threadID, messageID);
    }
}

// ----- MODULE EXPORTS -----
module.exports = {
    config: {
        name: "profile",
        version: "9.0.0",
        hasPermssion: 0,
        credits: "Pcoder",
        description: "Tạo ảnh profile Free Fire - Canvas Xanh (có social) & Canvas Vàng (không social)",
        commandCategory: "Tạo ảnh",
        usages: "[Mẫu | NV | TênGame | Họ Tên | DOB | GameID | Vị trí | Súng | NV | Social (chỉ xanh)]",
        cooldowns: 5,
        dependencies: {
            "axios": "",
            "moment-timezone": "",
            "form-data": ""
        }
    },
    
    run,
    handleReply
};