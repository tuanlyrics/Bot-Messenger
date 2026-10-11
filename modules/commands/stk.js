const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const Fuse = require('fuse.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const crypto = require('crypto');

// --- HỆ THỐNG THEME ---
const THEMES = {
    'luffy': {
        backgroundUrl: 'https://i.imgur.com/hLjj6cw.jpeg',
        displayName: 'Luffy Gear 5'
    }
};

const ADMIN_BANK = {
    accountNo: "0786888655",
    accountName: "Nguyễn Trương Thiện Phát",
    acqId: 970422,
    bankName: "MBBANK",
    isManual: false
};

module.exports.config = {
    name: "stk",
    version: "7.0.0",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Hiển thị STK với layout ảnh và mã QR (Full Cache System).",
    commandCategory: "Tiện ích",
    usages: "[set/setnotk/reset] | [số tiền] [nội dung]",
    cooldowns: 5,
    dependencies: { "axios": "", "fs-extra": "", "fuse.js": "", "canvas": "" }
};

const cachePath = path.join(__dirname, 'cache');
const configPath = path.join(cachePath, 'stk_config.json');
const qrCachePath = path.join(cachePath, 'stk_qr'); // Cache cho QR code
const imageCachePath = path.join(cachePath, 'stk_images'); // Cache cho ảnh final
const bgCachePath = path.join(cachePath, 'stk_bg'); // Cache cho background

// --- HÀM HELPER ---
function readStkConfig() { 
    try { 
        return JSON.parse(fs.readFileSync(configPath, 'utf-8')); 
    } catch (e) { 
        return {}; 
    } 
}

function writeStkConfig(data) { 
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8'); 
}

async function getBankInfo(bankInput) { 
    try { 
        const res = await axios.get('https://api.vietqr.io/v2/banks'); 
        const fuse = new Fuse(res.data.data, { keys: ['name', 'shortName'], threshold: 0.3 }); 
        return fuse.search(bankInput.trim())[0]?.item || null; 
    } catch (e) { 
        return null; 
    } 
}

// --- HÀM TẠO CACHE KEY ---
function generateCacheKey(bankInfo) {
    const data = `${bankInfo.accountNo}-${bankInfo.accountName}-${bankInfo.acqId}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

function generateQrCacheKey(bankInfo) {
    // Key riêng cho QR code (không bao gồm accountName vì QR không đổi theo tên)
    const data = `${bankInfo.acqId}-${bankInfo.accountNo}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

// --- HÀM TẢI VÀ CACHE QR CODE ---
async function downloadAndCacheQR(bankInfo) {
    const qrKey = generateQrCacheKey(bankInfo);
    const qrPath = path.join(qrCachePath, `${qrKey}.png`);
    
    // Nếu đã có cache, trả về luôn
    if (fs.existsSync(qrPath)) {
        console.log(`[STK] ✅ QR cache HIT: ${qrKey}`);
        return qrPath;
    }
    
    console.log(`[STK] ⏳ Downloading QR code...`);
    
    try {
        const qrUrl = `https://img.vietqr.io/image/${bankInfo.acqId}-${bankInfo.accountNo}-qr_only.png?accountName=${encodeURIComponent(bankInfo.accountName)}`;
        
        const response = await axios.get(qrUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        fs.writeFileSync(qrPath, response.data);
        console.log(`[STK] ✅ QR đã lưu: ${qrKey}`);
        
        return qrPath;
        
    } catch (error) {
        console.error("[STK] ❌ Lỗi tải QR:", error.message);
        throw new Error("Không thể tải mã QR. Vui lòng thử lại sau.");
    }
}

// --- HÀM TẢI VÀ CACHE BACKGROUND ---
async function downloadAndCacheBackground() {
    const theme = THEMES.luffy;
    const bgKey = crypto.createHash('md5').update(theme.backgroundUrl).digest('hex');
    const bgPath = path.join(bgCachePath, `${bgKey}.jpg`);
    
    // Nếu đã có cache, trả về luôn
    if (fs.existsSync(bgPath)) {
        console.log(`[STK] ✅ Background cache HIT`);
        return bgPath;
    }
    
    console.log(`[STK] ⏳ Downloading background...`);
    
    try {
        const response = await axios.get(theme.backgroundUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        fs.writeFileSync(bgPath, response.data);
        console.log(`[STK] ✅ Background đã lưu`);
        
        return bgPath;
        
    } catch (error) {
        console.error("[STK] ❌ Lỗi tải background:", error.message);
        throw new Error("Không thể tải background.");
    }
}

// --- HÀM VẼ CANVAS ---
async function renderCanvas({ ctx, accountName, accountNo, qrImagePath }) {
    const qrImage = await loadImage(qrImagePath);
    const qrX = 171, qrY = 755, qrSize = 620;

    // Vẽ background trắng cho QR
    ctx.save();
    ctx.translate(qrX + qrSize / 2, qrY + qrSize / 2);
    ctx.rotate(-13.8 * Math.PI / 180);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-qrSize / 2, -qrSize / 2, qrSize, qrSize);
    ctx.drawImage(qrImage, -qrSize / 2, -qrSize / 2, qrSize, qrSize);
    ctx.restore();

    // Vẽ text
    ctx.font = 'bold 38px "Prompt ExtraBold Italic"';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    ctx.textAlign = 'center';
    ctx.fillText(accountName.toUpperCase(), 1291, 1287);
    
    ctx.font = 'bold 55px "Prompt Bold Italic"';
    ctx.fillText(accountNo, 1533, 1456);

    ctx.shadowColor = 'transparent';
    return ctx.canvas.toBuffer('image/png');
}

// --- HÀM TẠO ẢNH FINAL (SỬ DỤNG CACHE LOCAL) ---
async function createBankImage(bankInfo) {
    const cacheKey = generateCacheKey(bankInfo);
    const finalImagePath = path.join(imageCachePath, `${cacheKey}.png`);
    
    // Kiểm tra cache final image
    if (fs.existsSync(finalImagePath)) {
        console.log(`[STK] ✅ Final image cache HIT: ${cacheKey}`);
        return finalImagePath;
    }

    console.log(`[STK] 🎨 Tạo ảnh mới cho: ${bankInfo.accountName}`);
    
    try {
        // Tải QR và Background (hoặc lấy từ cache)
        const [qrPath, bgPath] = await Promise.all([
            downloadAndCacheQR(bankInfo),
            downloadAndCacheBackground()
        ]);
        
        // Load các ảnh đã cache
        const background = await loadImage(bgPath);
        const canvas = createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Render canvas
        const finalImageBuffer = await renderCanvas({
            ctx,
            accountName: bankInfo.accountName,
            accountNo: bankInfo.accountNo,
            qrImagePath: qrPath
        });

        // Lưu final image
        fs.writeFileSync(finalImagePath, finalImageBuffer);
        console.log(`[STK] ✅ Final image đã lưu: ${cacheKey}`);
        
        return finalImagePath;

    } catch (error) {
        console.error("[STK] ❌ Lỗi tạo ảnh:", error);
        throw error;
    }
}

// --- HÀM HIỂN THỊ CHÍNH ---
async function displayStkInfo(api, event, bankInfo, args = []) {
    const { threadID, messageID } = event;

    // Xử lý manual image
    if (bankInfo.isManual) {
        try {
            const imageStream = await axios.get(bankInfo.imageUrl, { responseType: 'stream' }).then(r => r.data);
            return api.sendMessage({
                body: `💳 ${bankInfo.description}\n\nQuét mã QR trong ảnh để thanh toán.`,
                attachment: imageStream
            }, threadID, messageID);
        } catch (error) {
            return api.sendMessage("❌ Không thể tải ảnh QR đã lưu.", threadID, messageID);
        }
    }

    try {
        const amount = !isNaN(args[0]) ? args[0] : "";
        const addInfo = !isNaN(args[0]) ? args.slice(1).join(' ') : args.join(' ');

        // Tạo/lấy ảnh từ cache
        const imagePath = await createBankImage(bankInfo);
        
        const messageBody =
            `🏦 Ngân hàng: ${bankInfo.bankName}` +
            `\n👤 Chủ TK: ${bankInfo.accountName.toUpperCase()}` +
            `\n🔢 STK: ${bankInfo.accountNo}` +
            (amount ? `\n💰 Số tiền: ${Number(amount).toLocaleString('vi-VN')} VND` : '') +
            (addInfo ? `\n📝 Nội dung: ${addInfo}` : '');

        api.sendMessage({ 
            body: messageBody, 
            attachment: fs.createReadStream(imagePath)
        }, threadID, messageID);

    } catch (error) {
        console.error("[STK] ❌ Lỗi hiển thị:", error);
        
        if (error.message.includes('Không thể tải')) {
            return api.sendMessage(
                "⚠️ Không thể tải dữ liệu từ API.\n" +
                "Vui lòng thử lại sau hoặc liên hệ admin.",
                threadID, messageID
            );
        }
        
        api.sendMessage("❌ Lỗi khi tạo ảnh STK. Vui lòng thử lại.", threadID, messageID);
    }
}

// --- HÀM XÓA CACHE CŨ ---
function clearOldCache() {
    try {
        const cacheDirs = [imageCachePath, qrCachePath, bgCachePath];
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        cacheDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtime.getTime() < oneWeekAgo) {
                        fs.unlinkSync(filePath);
                        console.log(`[STK] 🗑️ Đã xóa cache cũ: ${file}`);
                    }
                });
            }
        });
    } catch (error) {
        console.error("[STK] ❌ Lỗi xóa cache:", error);
    }
}

// --- ONLOAD ---
module.exports.onLoad = async function() {
    // Tạo các thư mục cache
    [cachePath, imageCachePath, qrCachePath, bgCachePath].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    
    console.log(`[STK] 📁 Cache directories initialized`);
    console.log(`[STK] 📁 QR cache: ${qrCachePath}`);
    console.log(`[STK] 📁 Image cache: ${imageCachePath}`);
    console.log(`[STK] 📁 BG cache: ${bgCachePath}`);
    
    // Đếm cache hiện có
    const qrCount = fs.readdirSync(qrCachePath).length;
    const imgCount = fs.readdirSync(imageCachePath).length;
    console.log(`[STK] 💾 QR cached: ${qrCount} | Images cached: ${imgCount}`);
    
    // Download fonts
    const fontDir = path.join(cachePath, 'fonts');
    if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir);

    const fonts = {
        "Prompt-BoldItalic.ttf": "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-BoldItalic.ttf",
        "Prompt-ExtraBoldItalic.ttf": "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-ExtraBoldItalic.ttf"
    };

    for (const font in fonts) {
        const fontPath = path.join(fontDir, font);
        if (!fs.existsSync(fontPath)) {
            try {
                console.log(`[STK] ⏳ Downloading font: ${font}`);
                const response = await axios.get(fonts[font], { responseType: 'arraybuffer' });
                fs.writeFileSync(fontPath, response.data);
                registerFont(fontPath, { family: path.basename(font, '.ttf').replace('-', ' ') });
                console.log(`[STK] ✅ Font downloaded: ${font}`);
            } catch (e) {
                console.error(`[STK] ❌ Lỗi tải font ${font}:`, e.message);
            }
        } else {
            registerFont(fontPath, { family: path.basename(font, '.ttf').replace('-', ' ') });
        }
    }

    // Xóa cache cũ
    clearOldCache();
    console.log("[STK] ✅ Module loaded successfully!");
}

// --- RUN ---
module.exports.run = async ({ api, event, args, Threads }) => {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();
    
    if (!fs.existsSync(configPath)) writeStkConfig({});
    const stkConfig = readStkConfig();

    if (["set", "setnotk", "reset"].includes(command)) {
        const threadInfo = await Threads.getInfo(threadID);
        const adminIDs = (threadInfo.adminIDs.map(item => item.id) || []).concat(global.config.ADMINBOT);
        if (!adminIDs.includes(senderID)) {
            return api.sendMessage("⚠️ Chỉ quản trị viên mới có quyền dùng lệnh này.", threadID, messageID);
        }

        switch (command) {
            case 'set': {
                const [_, bankInput, accountNo, ...accountNameArr] = args;
                const accountName = accountNameArr.join(' ');
                if (!bankInput || !accountNo || !accountName) {
                    return api.sendMessage("⚠️ Sai cú pháp!\nVí dụ: .stk set mbbank 12345 NGUYEN VAN A", threadID, messageID);
                }
                
                const bank = await getBankInfo(bankInput);
                if (!bank) {
                    return api.sendMessage(`❌ Không tìm thấy ngân hàng "${bankInput}".`, threadID, messageID);
                }
                
                // Xóa cache cũ
                const oldConfig = stkConfig[threadID];
                if (oldConfig && !oldConfig.isManual) {
                    const oldCacheKey = generateCacheKey(oldConfig);
                    const oldImagePath = path.join(imageCachePath, `${oldCacheKey}.png`);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log(`[STK] 🗑️ Đã xóa final image cũ`);
                    }
                }
                
                stkConfig[threadID] = { 
                    accountNo, 
                    accountName, 
                    acqId: bank.bin, 
                    bankName: bank.shortName, 
                    isManual: false 
                };
                writeStkConfig(stkConfig);
                
                // Tạo cache ngay
                api.sendMessage("⏳ Đang tạo và lưu ảnh STK...", threadID, async (err, info) => {
                    try {
                        await createBankImage(stkConfig[threadID]);
                        api.sendMessage("✅ Đã cài đặt STK và lưu cache thành công!", threadID);
                    } catch (error) {
                        api.sendMessage("⚠️ Đã lưu cấu hình nhưng chưa tạo được cache.\nẢnh sẽ được tạo khi dùng lần đầu.", threadID);
                    }
                });
                return;
            }
            case 'setnotk': {
                if (!event.messageReply?.attachments?.[0] || event.messageReply.attachments[0].type !== 'photo') {
                    return api.sendMessage("⚠️ Bạn phải reply một ảnh chứa mã QR.", threadID, messageID);
                }
                const imageUrl = event.messageReply.attachments[0].url;
                const description = args.slice(1).join(' ') || "Thông tin thanh toán của nhóm.";
                
                stkConfig[threadID] = { isManual: true, imageUrl, description };
                writeStkConfig(stkConfig);
                return api.sendMessage("✅ Đã cài đặt QR tùy chỉnh!", threadID, messageID);
            }
            case 'reset': {
                if (stkConfig[threadID]) {
                    if (!stkConfig[threadID].isManual) {
                        const cacheKey = generateCacheKey(stkConfig[threadID]);
                        const imagePath = path.join(imageCachePath, `${cacheKey}.png`);
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                            console.log(`[STK] 🗑️ Đã xóa cache`);
                        }
                    }
                    
                    delete stkConfig[threadID];
                    writeStkConfig(stkConfig);
                    return api.sendMessage("✅ Đã xóa cài đặt STK của nhóm.", threadID, messageID);
                }
                return api.sendMessage("ℹ️ Nhóm này chưa cài đặt STK.", threadID, messageID);
            }
        }
        return;
    }

    const bankInfoToShow = stkConfig[threadID] || ADMIN_BANK;
    return displayStkInfo(api, event, bankInfoToShow, args);
};

// --- HANDLE EVENT ---
module.exports.handleEvent = async function({ api, event }) {
    if (event.type !== "message" || !event.body) return;

    if (/(stk|qr|mã)/i.test(event.body)) {
        const stkConfig = readStkConfig();
        const groupConfig = stkConfig[event.threadID];
        if (groupConfig) {
            return displayStkInfo(api, event, groupConfig);
        }
    }
};
