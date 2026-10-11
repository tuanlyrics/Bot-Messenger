// ##### MODULE CORE #####
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const crypto = require('crypto');
const cron = require('node-cron');
const { createCanvas, loadImage, registerFont } = require("canvas");
const axios = require('axios');

// ##### CẤU HÌNH API THANH TOÁN #####
const BANK_CONFIG = {
    BANK_ID: "970422",
    ACCOUNT_NO: "08043662312904",
    ACCOUNT_NAME: "NGUYEN TRUONG THIEN PHAT"
};
const API_BASE_URL = 'https://spn.io.vn/Ajaxs/'; 
const BOT_API_KEY = 'Pcoder1234567890987654321';
const PAYMENT_CHECK_INTERVAL = 5000; // 5 giây
const PAYMENT_EXPIRATION_MINUTES = 5; // 5 phút

// ##### CẤU HÌNH THUÊ BOT #####
const RENT_PRICE = 50000; // Giá thuê mới: 50,000 VNĐ
const RENEW_PRICE = RENT_PRICE * 0.95; // Giá gia hạn (giảm 5%): 47,500 VNĐ
const RENT_DURATION_DAYS = 30;
const TIMEZONE = 'Asia/Ho_Chi_Minh';

// ##### PATHS & DIRECTORIES #####
const DATA_DIR = path.join(__dirname, 'cache', 'data_rentbot_pro');
const RENT_DATA_PATH = path.join(DATA_DIR, 'thuebot_pro.json');
const RENT_KEY_PATH = path.join(DATA_DIR, 'keys_pro.json');
const CANVAS_DIR = path.join(DATA_DIR, 'rent_canvas_pro');
const PAYMENT_TEMP_DIR = path.join(DATA_DIR, 'payment_temp');

[DATA_DIR, CANVAS_DIR, PAYMENT_TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// --- KHỞI TẠO VÀ TẢI DỮ LIỆU FONT/BACKGROUND ---
(async () => {
    const cacheDir = path.join(__dirname, '../../cache');
    await fs.ensureDir(cacheDir);
    const fontUrls = [
        { url: 'https://github.com/Kenne400k/font/raw/refs/heads/main/Lobster-Regular.ttf', filename: 'Lobster-Regular.ttf' },
        { url: 'https://github.com/Kenne400k/font/raw/refs/heads/main/Signika-SemiBold.ttf', filename: 'Signika-SemiBold.ttf' }
    ];
    const backgroundUrls = [ 'https://raw.githubusercontent.com/Kenne400k/commands/main/4k-Windows-11-Wallpaper-scaled.jpg','https://raw.githubusercontent.com/Kenne400k/commands/main/HD-wallpaper-chill-vibes-3440-1440-r-chill-art.jpg','https://raw.githubusercontent.com/Kenne400k/commands/main/hinh-nen-chill-cho-may-tinh-dep_040228906.jpg' ];
    for (const font of fontUrls) {
        const localPath = path.join(cacheDir, font.filename);
        if (!fs.existsSync(localPath)) {
            try {
                const response = await axios({ method: 'GET', url: font.url, responseType: 'stream' });
                response.data.pipe(fs.createWriteStream(localPath));
            } catch (error) { console.error(`[RENT] Lỗi tải font ${font.filename}:`, error.message); }
        }
    }
    try {
        registerFont(path.join(cacheDir, 'Lobster-Regular.ttf'), { family: "Lobster-Regular" });
        registerFont(path.join(cacheDir, 'Signika-SemiBold.ttf'), { family: "Signika-SemiBold" });
    } catch (e) { console.error("[RENT] Lỗi đăng ký font.", e); }
    for (let i = 0; i < backgroundUrls.length; i++) {
        const localPath = path.join(cacheDir, `bg_rent_${i}.jpg`);
        if (!fs.existsSync(localPath)) {
            try {
                const response = await axios({ method: 'GET', url: backgroundUrls[i], responseType: 'arraybuffer' });
                fs.writeFileSync(localPath, response.data);
            } catch (error) { console.error(`[RENT] Lỗi tải background:`, error.message); }
        }
    }
})();

module.exports.config = {
    name: 'rent',
    version: '12.1.0-final-canvas',
    hasPermssion: 0,
    credits: 'Pcoder & Gemini',
    description: "Hệ thống thuê bot thanh toán trực tiếp qua VietQR, tích hợp đầy đủ các tính năng quản lý.",
    commandCategory: "System",
    usages: '[thanhtoan | giahan | info | usekey | list | add | del | newkey | check | delkey]',
    cooldowns: 10,
};

// --- HÀM TIỆN ÍCH ---
function safeReadJSON(file, defaultValue) { try { if (!fs.existsSync(file)) return defaultValue; return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return defaultValue; } }
function safeWriteJSON(file, data) { try { fs.ensureDirSync(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf8'); } catch (e) { console.error(`[RENT] Lỗi ghi file JSON: ${file}`, e); } }
function generateRandomString(length) { const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'; let result = ''; for (let i = 0; i < length; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); } return `pcoder${result}`; }
const isInvalidDate = dateStr => !moment(dateStr, 'DD/MM/YYYY', true).isValid();
function hsdText(endDateStr, fullFormat = false) { const now = moment().tz(TIMEZONE); const endDate = moment(endDateStr, 'DD/MM/YYYY').endOf('day'); const daysDiff = endDate.diff(now, 'days'); const formattedEndDate = endDate.format('DD/MM/YYYY'); if (daysDiff >= 0) return `còn ${daysDiff + 1} ngày${fullFormat ? ` (đến ${formattedEndDate})` : ''}`; return `đã hết hạn ${Math.abs(daysDiff)} ngày${fullFormat ? ` (từ ${formattedEndDate})` : ''}`; }
function drawRoundedRect(ctx, x, y, width, height, radius) { ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); }
async function getAvatarBuffer(url) { try { const res = await axios.get(url, { responseType: 'arraybuffer' }); return Buffer.from(res.data, 'binary'); } catch (e) { const canvas = createCanvas(200, 200); const ctx = canvas.getContext('2d'); ctx.fillStyle = "#2E2E2E"; ctx.fillRect(0, 0, 200, 200); return canvas.toBuffer(); } }

// --- CANVAS & CORE FUNCTIONS ---
async function drawRentInfoCanvas({ userAvatarUrl, groupName, userName, timeStart, timeEnd, key, index }) {
    const width = 1200, height = 500; const canvas = createCanvas(width, height); const ctx = canvas.getContext('2d');
    const cacheDir = path.join(__dirname, '../../cache'); try { const bgFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith('bg_rent_')); const bgImage = await loadImage(path.join(cacheDir, bgFiles[Math.floor(Math.random() * bgFiles.length)])); ctx.drawImage(bgImage, 0, 0, width, height); } catch { ctx.fillStyle = '#2c2c2c'; ctx.fillRect(0, 0, width, height); }
    const padding = 50, boxX = padding, boxY = padding, boxWidth = width - padding * 2, boxHeight = height - padding * 2;
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 35); ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fill(); ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"; ctx.stroke();
    const hsdInfo = hsdText(timeEnd); let glowColor = "#32ff7e";
    if (hsdInfo.includes("còn") && parseInt(hsdInfo.split(' ')[1]) <= 3) glowColor = "#FFD700"; else if (hsdInfo.includes("hết hạn")) glowColor = "#ff3838";
    const avatarSize = 180, avatarX = boxX + 50, avatarY = height / 2 - avatarSize / 2; ctx.save(); ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = glowColor; ctx.shadowBlur = 40; ctx.fill(); ctx.restore(); ctx.save(); ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); ctx.clip(); const avatar = await loadImage(await getAvatarBuffer(userAvatarUrl)); ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize); ctx.restore();
    ctx.textAlign = 'left'; const textAreaX = avatarX + avatarSize + 60; let currentY = boxY + 70; ctx.font = 'bold 42px "Signika-SemiBold"'; ctx.fillStyle = "#FFFFFF"; ctx.fillText("THÔNG TIN THUÊ BOT", textAreaX, currentY); currentY += 60;
    const drawInfoRow = (label, value, valueColor = '#FFFFFF') => { ctx.font = '26px "Signika-SemiBold"'; ctx.fillStyle = '#B0BEC5'; ctx.fillText(label, textAreaX, currentY); ctx.fillStyle = valueColor; ctx.fillText(value, textAreaX + 170, currentY); currentY += 40; };
    drawInfoRow("Người thuê:", userName); drawInfoRow("Nhóm:", groupName.length > 30 ? groupName.substring(0, 27) + "..." : groupName); drawInfoRow("Ngày thuê:", timeStart); drawInfoRow("Ngày hết hạn:", timeEnd); drawInfoRow("Tình trạng:", hsdText(timeEnd, true), glowColor); drawInfoRow("Key:", key || "Thanh toán trực tiếp");
    ctx.font = "italic 20px 'Signika-SemiBold'"; ctx.fillStyle = "#90A4AE"; ctx.textAlign = "right"; ctx.fillText(`STT: ${index} | Developed by Pcoder`, width - padding - 30, height - padding - 20);
    const imgPath = path.join(CANVAS_DIR, `rentinfo_${Date.now()}.png`); fs.writeFileSync(imgPath, canvas.toBuffer('image/png')); return imgPath;
}
async function drawMenuCanvas(prefix) {
    const width = 1200, height = 700; const canvas = createCanvas(width, height); const ctx = canvas.getContext('2d');
    const cacheDir = path.join(__dirname, '../../cache'); try { const bgFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith('bg_rent_')); ctx.drawImage(await loadImage(path.join(cacheDir, bgFiles[Math.floor(Math.random() * bgFiles.length)])), 0, 0, width, height); } catch { ctx.fillStyle = '#2c2c2c'; ctx.fillRect(0, 0, width, height); }
    const padding = 80, boxX = padding, boxY = padding, boxWidth = width - padding * 2, boxHeight = height - padding * 2;
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 35); ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.fill(); ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.stroke();
    ctx.textAlign = "center"; ctx.font = 'bold 45px "Signika-SemiBold"'; const titleText = "MENU QUẢN LÝ THUÊ BOT"; const textWidth = ctx.measureText(titleText).width; const textX = width / 2; const textY = boxY + 100;
    const gradient = ctx.createLinearGradient(textX - textWidth / 2, 0, textX + textWidth / 2, 0); const colors = ["#ff3838", "#ff9f1a", "#fff200", "#32ff7e", "#18dcff", "#7d5fff", "#f368e0"];
    colors.forEach((color, index) => { gradient.addColorStop(index / (colors.length - 1), color); });
    ctx.fillStyle = gradient; ctx.shadowColor = "rgba(255, 255, 255, 0.9)"; ctx.shadowBlur = 20; ctx.fillText(titleText, textX, textY); ctx.shadowColor = "transparent";
    const commands = [ { cmd: "thanhtoan", desc: "Thanh toán để thuê bot cho nhóm." }, { cmd: "giahan", desc: "Gia hạn thuê bot cho nhóm." }, { cmd: "info", desc: "Xem thông tin thuê của nhóm hiện tại." }, { cmd: "usekey <Mã_Key>", desc: "Kích hoạt thuê bot bằng key." }, { cmd: "add <DD/MM/YYYY> [@tag/UID]", desc: "Thêm nhóm (chỉ admin)." }, { cmd: "list", desc: "Xem danh sách thuê (chỉ admin)." }, { cmd: "del <STT|GroupID>", desc: "Xóa nhóm (chỉ admin)." }, { cmd: "newkey <số_ngày>", desc: "Tạo key mới (chỉ admin)." }, { cmd: "check", desc: "Kiểm tra các key (chỉ admin)." }, { cmd: "delkey <Tên_Key>", desc: "Xóa một key (chỉ admin)." } ];
    const half = Math.ceil(commands.length / 2); const leftCommands = commands.slice(0, half); const rightCommands = commands.slice(half);
    const itemHeight = 50, spacing = 15; let currentYLeft = boxY + 180, currentYRight = boxY + 180;
    const startXLeft = boxX + 60, startXRight = boxX + 600; ctx.textAlign = 'left';
    const drawColumn = (column, startX, startY) => { let currentY = startY; column.forEach(item => { ctx.font = `bold 24px "Signika-SemiBold"`; const prefixWidth = ctx.measureText(`${prefix}rent `).width; ctx.fillStyle = "#18dcff"; ctx.fillText(`${prefix}rent `, startX, currentY); ctx.fillStyle = "#FFFFFF"; ctx.fillText(item.cmd, startX + prefixWidth, currentY); ctx.font = `italic 20px "Signika-SemiBold"`; ctx.fillStyle = "#B0BEC5"; ctx.fillText(`↳ ${item.desc}`, startX + 15, currentY + 25); currentY += itemHeight + spacing; }); };
    drawColumn(leftCommands, startXLeft, currentYLeft); drawColumn(rightCommands, startXRight, currentYRight);
    const imgPath = path.join(CANVAS_DIR, `rentmenu_${Date.now()}.png`); fs.writeFileSync(imgPath, canvas.toBuffer('image/png')); return imgPath;
}
async function changeBotNicknameInGroup(api, threadID, time_end) { try { const botID = api.getCurrentUserID(); const now = moment().tz(TIMEZONE); const endDate = moment(time_end, 'DD/MM/YYYY').endOf('day'); const daysDiff = endDate.diff(now, 'days'); let nickname = (daysDiff >= 0) ? `Pcoder | Còn ${daysDiff + 1} ngày` : `Pcoder | Đã hết hạn`; await api.changeNickname(nickname, threadID, botID); } catch (e) { /* Bỏ qua lỗi */ } }

module.exports.onLoad = async function ({ api }) {
    cron.schedule('5 0 * * *', async () => {
        let rentData = safeReadJSON(RENT_DATA_PATH, []);
        for (const group of rentData) {
            await changeBotNicknameInGroup(api, group.t_id, group.time_end);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }, { timezone: TIMEZONE });
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    const { threadID, senderID, messageID } = event;
    
    let rentData = safeReadJSON(RENT_DATA_PATH, []);
    let keyData = safeReadJSON(RENT_KEY_PATH, {});
    const saveData = () => safeWriteJSON(RENT_DATA_PATH, rentData);
    const saveKeys = () => safeWriteJSON(RENT_KEY_PATH, keyData);

    const command = args[0] ? args[0].toLowerCase() : '';
    const prefix = global.config.PREFIX || "!";
    const isAdmin = (global.config.NDH || []).includes(senderID);
    const send = (msg, attachmentPath) => { const options = { body: msg }; if (attachmentPath) { try { options.attachment = fs.createReadStream(attachmentPath); } catch (e) { console.error("[RENT] Lỗi attachment:", e); } } api.sendMessage(options, threadID, () => { if (attachmentPath) try { fs.unlinkSync(attachmentPath); } catch {} }, messageID); };

    const handleDirectPayment = async (amount, type) => {
        const rentInfo = rentData.find(e => e.t_id === threadID);
        if (type === 'giahan' && !rentInfo) return send('ℹ️ Nhóm này chưa thuê bot. Dùng "rent thanhtoan" để thuê mới.');
        if (type === 'thanhtoan' && rentInfo) return send('ℹ️ Nhóm này đã thuê bot. Dùng "rent giahan" để gia hạn.');
        
        const transactionId = generateRandomString(8);
        const content = `${type} ${transactionId}`;
        api.sendMessage("⏳ Đang khởi tạo giao dịch, vui lòng chờ...", threadID, messageID);

        try {
            await axios.post(`${API_BASE_URL}create_qr_payment.php?api_key=${BOT_API_KEY}`, { transaction_id: transactionId, sender_id: senderID, amount: amount, thread_id: threadID });
            const qrResponse = await axios.post('https://api.vietqr.io/v2/generate', { acqId: BANK_CONFIG.BANK_ID, accountNo: BANK_CONFIG.ACCOUNT_NO, accountName: BANK_CONFIG.ACCOUNT_NAME, amount: amount, addInfo: content, template: "qymODyJ" });
            const imageBuffer = Buffer.from(qrResponse.data.data.qrDataURL.split(',')[1], 'base64');
            const imagePath = path.join(PAYMENT_TEMP_DIR, `${transactionId}.png`);
            fs.writeFileSync(imagePath, imageBuffer);
            
            const senderName = await Users.getNameUser(senderID);
            send(`✅ Giao dịch của ${senderName} đã được tạo!\n\n- Số tiền: ${amount.toLocaleString('vi-VN')}đ\n- Nội dung: ${content}\n\n⚠️ Vui lòng quét mã QR và **CHUYỂN KHOẢN ĐÚNG NỘI DUNG**. Giao dịch sẽ hết hạn sau ${PAYMENT_EXPIRATION_MINUTES} phút.`, imagePath);

            const checkInterval = setInterval(async () => {
                try {
                    const statusResponse = await axios.get(`${API_BASE_URL}check_payment_status.php?transaction_id=${transactionId}&api_key=${BOT_API_KEY}`);
                    if (statusResponse.data && statusResponse.data.status === 'completed') {
                        clearInterval(checkInterval);
                        let time_start, time_end, successMessage;
                        let rentInfoAfterUpdate;

                        if (type === 'thanhtoan') {
                            time_start = moment.tz(TIMEZONE).format('DD/MM/YYYY');
                            time_end = moment.tz(TIMEZONE).add(RENT_DURATION_DAYS, 'days').format('DD/MM/YYYY');
                            rentInfoAfterUpdate = { t_id: threadID, id: senderID, time_start, time_end, key: "" };
                            rentData.push(rentInfoAfterUpdate);
                            successMessage = `🎉 Thanh toán thành công! Bot đã được kích hoạt đến ngày ${time_end}.`;
                        } else if (type === 'giahan') {
                            time_start = rentInfo.time_start;
                            const oldEndDate = moment(rentInfo.time_end, 'DD/MM/YYYY');
                            time_end = oldEndDate.add(RENT_DURATION_DAYS, 'days').format('DD/MM/YYYY');
                            rentInfo.time_end = time_end; 
                            rentInfo.id = senderID;
                            rentInfoAfterUpdate = rentInfo;
                            successMessage = `🎉 Gia hạn thành công! Hạn sử dụng mới của bot là ${time_end}.`;
                        }
                        
                        saveData();
                        await changeBotNicknameInGroup(api, threadID, time_end);
                        
                        const groupName = (await Threads.getInfo(threadID)).name || "Nhóm này";
                        const userName = await Users.getNameUser(senderID);
                        const userAvatarUrl = `https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                        const imgPath = await drawRentInfoCanvas({
                            userAvatarUrl, groupName, userName,
                            timeStart: time_start, timeEnd: time_end, key: rentInfoAfterUpdate.key,
                            index: rentData.findIndex(e => e.t_id === threadID) + 1
                        });
                        send(successMessage, imgPath);
                        
                        await axios.post(`${API_BASE_URL}update_payment_status.php?api_key=${BOT_API_KEY}`, { transaction_id: transactionId });
                    }
                } catch (e) { console.error(`[RENT_PAYMENT] Lỗi khi kiểm tra #${transactionId}:`, e.message); }
            }, PAYMENT_CHECK_INTERVAL);
            setTimeout(() => { clearInterval(checkInterval); }, PAYMENT_EXPIRATION_MINUTES * 60 * 1000 + 5000);
        } catch (error) {
            console.error("[RENT_PAYMENT] Lỗi tạo QR:", error.response?.data || error.message);
            send("❌ Có lỗi server khi tạo QR. Vui lòng thử lại sau.");
        }
    };

    switch (command) {
        case 'thanhtoan': return handleDirectPayment(RENT_PRICE, 'thanhtoan');
        case 'giahan': return handleDirectPayment(RENEW_PRICE, 'giahan');
        
        case 'info': {
            const rentInfo = rentData.find(e => e.t_id === threadID);
            if (!rentInfo) return send(`Nhóm này chưa thuê bot. Dùng "${prefix}rent thanhtoan" để thuê.`);
            const groupName = (await Threads.getInfo(threadID)).name || "Nhóm này";
            const userName = await Users.getNameUser(rentInfo.id);
            const userAvatarUrl = `https://graph.facebook.com/${rentInfo.id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const imgPath = await drawRentInfoCanvas({ userAvatarUrl, groupName, userName, timeStart: rentInfo.time_start, timeEnd: rentInfo.time_end, key: rentInfo.key, index: rentData.findIndex(e => e.t_id === threadID) + 1 });
            return send(``, imgPath);
        }
        case 'usekey': {
            const keyToUse = args[1]?.toLowerCase();
            if (!keyToUse || !keyData[keyToUse]) return send('Mã key không hợp lệ!');
            if (keyData[keyToUse].used) return send(`Mã key này đã được sử dụng.`);
            if (rentData.some(e => e.t_id === threadID)) return send(`Nhóm này đã thuê bot.`);
            const keyInfo = keyData[keyToUse];
            const time_start = moment.tz(TIMEZONE).format('DD/MM/YYYY');
            const time_end = moment.tz(TIMEZONE).add(keyInfo.days, 'days').format('DD/MM/YYYY');
            rentData.push({ t_id: threadID, id: senderID, time_start, time_end, key: keyToUse });
            keyData[keyToUse].used = true; keyData[keyToUse].groupId = threadID;
            saveData(); saveKeys();
            await changeBotNicknameInGroup(api, threadID, time_end);
            return send(`✅ Bot đã được kích hoạt bằng key! Hạn sử dụng: ${keyInfo.days} ngày.`);
        }
        
        case 'add': {
            if (!isAdmin) return send("❌ Bạn không có quyền.");
            if (args.length < 3) return send(`Sai cú pháp: ${prefix}rent add DD/MM/YYYY @tag`);
            const endDateStr = args[1]; if (isInvalidDate(endDateStr)) return send(`Ngày không hợp lệ.`);
            const userIdToAdd = Object.keys(event.mentions)[0]; if (!userIdToAdd) return send("Cần tag người cần thêm.");
            if (rentData.some(e => e.t_id === threadID)) return send("Nhóm đã được thuê.");
            const time_start = moment.tz(TIMEZONE).format('DD/MM/YYYY');
            rentData.push({ t_id: threadID, id: userIdToAdd, time_start: time_start, time_end: endDateStr, key: "" });
            saveData();
            await changeBotNicknameInGroup(api, threadID, endDateStr);
            const groupName = (await Threads.getInfo(threadID)).name || "Nhóm này";
            const userName = await Users.getNameUser(userIdToAdd);
            const userAvatarUrl = `https://graph.facebook.com/${userIdToAdd}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const imgPath = await drawRentInfoCanvas({ userAvatarUrl, groupName, userName, timeStart: time_start, timeEnd: endDateStr, key: "", index: rentData.length });
            return send(`✅ Đã thêm nhóm vào danh sách thuê đến ngày ${endDateStr}.`, imgPath);
        }
        case 'del': {
            if (!isAdmin) return send("❌ Bạn không có quyền.");
            const identifier = args[1]; if (!identifier) return send(`Sai cú pháp: ${prefix}rent del <STT|GroupID>`);
            let itemIndex = !isNaN(parseInt(identifier)) ? parseInt(identifier) - 1 : rentData.findIndex(e => e.t_id === identifier);
            if (itemIndex < 0 || itemIndex >= rentData.length) return send("Không tìm thấy nhóm.");
            rentData.splice(itemIndex, 1); saveData();
            return send(`🗑️ Đã xóa thành công nhóm.`);
        }
        case 'list': {
            if (!isAdmin) return send("❌ Bạn không có quyền.");
            if (rentData.length === 0) return send('Chưa có nhóm nào đang thuê bot!');
            let msg = `📝 DANH SÁCH ${rentData.length} NHÓM ĐANG THUÊ 📝\nReply tin nhắn này với "del <STT>"\n\n`;
            for (let i = 0; i < rentData.length; i++) {
                const item = rentData[i];
                const groupName = (await Threads.getInfo(item.t_id).catch(() => ({ name: `ID ${item.t_id}` }))).name;
                msg += `${i + 1}. ${groupName}\n   - HSD: ${item.time_end} (${hsdText(item.time_end)})\n`;
            }
            return api.sendMessage(msg, threadID, (err, info) => { if (!err) global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: senderID, rentalData }); });
        }
        case 'newkey': {
            if (!isAdmin) return send("❌ Bạn không có quyền.");
            const days = parseInt(args[1], 10); if (isNaN(days) || days <= 0) return send(`Số ngày không hợp lệ.`);
            const generatedKey = `pcoder_${crypto.randomBytes(4).toString('hex')}`;
            keyData[generatedKey] = { days: days, used: false }; saveKeys();
            return send(`🔑 Đã tạo key mới: ${generatedKey} (Thời hạn: ${days} ngày)`);
        }
        case 'check': {
            if (!isAdmin) return send("❌ Bạn không có quyền.");
            if (Object.keys(keyData).length === 0) return send('Không có key nào!');
            let msg = `🔑 DANH SÁCH KEY 🔑\n\n`;
            for (const [key, info] of Object.entries(keyData)) { msg += `Key: ${key} | Hạn: ${info.days} ngày | Status: ${info.used ? '✅ Used' : '⏳ Unused'}\n`; }
            return send(msg.trim());
        }
        case 'delkey': {
            if (!isAdmin) return send("❌ Bạn không có quyền.");
            const keyToDelete = args[1]; if (!keyToDelete || !keyData[keyToDelete]) return send(`Key không tồn tại!`);
            if (keyData[keyToDelete].used) return send(`Key đang được sử dụng, không thể xóa.`);
            delete keyData[keyToDelete]; saveKeys();
            return send(`🗑️ Đã xóa key "${keyToDelete}".`);
        }
        default: {
            const imgPath = await drawMenuCanvas(prefix);
            return send("🌟 MENU QUẢN LÝ THUÊ BOT 🌟", imgPath);
        }
    }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;
    
    let rentData = safeReadJSON(RENT_DATA_PATH, []);
    const saveData = () => safeWriteJSON(RENT_DATA_PATH, rentData);
    const { rentalData: originalRentalData } = handleReply;

    const [command, stt] = event.body.split(" ");
    const index = parseInt(stt) - 1;

    if (isNaN(index) || index < 0 || index >= originalRentalData.length) return api.sendMessage("STT không hợp lệ.", event.threadID);
    
    const targetGroup = originalRentalData[index];
    const globalIndex = rentData.findIndex(e => e.t_id === targetGroup.t_id);
    
    if (globalIndex === -1) return api.sendMessage("Nhóm này có thể đã bị xóa. Vui lòng dùng lệnh `rent list` để làm mới.", event.threadID);
    
    if (command.toLowerCase() === 'del') {
        rentData.splice(globalIndex, 1); 
        saveData();
        return api.sendMessage(`🗑️ Đã xóa thành công nhóm STT ${stt}.`, event.threadID);
    }
};