const os = require('os');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');

let isReady = true;

// --- KHỞI TẠO VÀ TẢI DỮ LIỆU FONT/BACKGROUND ---
(async () => {
    const cacheDir = path.join(__dirname, '../../cache');
    await fs.ensureDir(cacheDir);
    const fontUrls = [
        { url: 'https://github.com/Kenne400k/font/raw/refs/heads/main/Signika-SemiBold.ttf', filename: 'Signika-SemiBold.ttf' }
    ];
    // Cập nhật danh sách background mới
    const backgroundUrls = [
        'https://raw.githubusercontent.com/Kenne400k/commands/main/4k-Windows-11-Wallpaper-scaled.jpg',
        'https://raw.githubusercontent.com/Kenne400k/commands/main/HD-wallpaper-chill-vibes-3440-1440-r-chill-art.jpg',
        'https://raw.githubusercontent.com/Kenne400k/commands/main/hinh-nen-chill-cho-may-tinh-dep_040228906.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/chill-4k-animal-camping-art-hdk4nyjo64bvg4ko-hdk4nyjo64bvg4ko.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/chill-out-snow-anime-girls-maple-leaf-wallpaper-preview.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/d1e1a3ed8d55b9d626ede8b202115f38.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/hinh-nen-chill-78-1024x640.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/hinh-nen-chill-82-1024x640.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/images%20(3).jpeg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/japanese-castle-cherry-blossom-mountain-digital-art-scenery-4k-wallpaper-uhdpaper.com-702@1@k.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/landscape-anime-digital-art-fantasy-art-wallpaper-preview.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/looking-far-away-4k-lb.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/wp9322415.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg1.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg2.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg3.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg4.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg5.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg6.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg7.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg8.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg9.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg10.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg11.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg12.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg13.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg14.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg15.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg16.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg17.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg18.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg19.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg21.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg22.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg23.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg24.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg25.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg26.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg27.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg28.jpg',
        'https://raw.githubusercontent.com/Kenne400k/background/refs/heads/main/bg29.jpg'
    ];
    for (const font of fontUrls) {
        const localPath = path.join(cacheDir, font.filename);
        if (!fs.existsSync(localPath)) {
            try {
                const response = await axios({ method: 'GET', url: font.url, responseType: 'stream' });
                response.data.pipe(fs.createWriteStream(localPath));
            } catch (error) { console.error(`[UPT] Lỗi tải font ${font.filename}:`, error.message); }
        }
    }
    try {
        registerFont(path.join(cacheDir, 'Signika-SemiBold.ttf'), { family: "Signika", weight: "600" });
    } catch (e) { console.error("[UPT] Lỗi đăng ký font.", e); }
    for (let i = 0; i < backgroundUrls.length; i++) {
        const url = backgroundUrls[i];
        const ext = path.extname(url).split('?')[0] || '.jpg';
        const localPath = path.join(cacheDir, `bg_upt_${i}${ext}`);
        if (!fs.existsSync(localPath)) {
            try {
                const response = await axios({ method: 'GET', url, responseType: 'arraybuffer' });
                fs.writeFileSync(localPath, response.data);
            } catch (error) { console.error(`[UPT] Lỗi tải background:`, error.message); }
        }
    }
})();

module.exports.config = {
    name: "upt2",
    version: "6.1.0",
    hasPermission: 2,
    credits: "Pcoder",
    description: "Hiển thị dashboard hệ thống với canvas được nâng cấp, thêm hiệu ứng glow và phân chia bố cục.",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 10
};

// --- HÀM TIỆN ÍCH ---
function getFilteredUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

async function getCPUUsage() {
    const start = process.cpuUsage();
    const startTime = Date.now();
    while (Date.now() - startTime < 100); // Wait 100ms
    const end = process.cpuUsage(start);
    return ((end.user + end.system) / 100000).toFixed(1);
}

// --- HÀM VẼ CANVAS ---
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function drawProgressBar(ctx, x, y, width, height, progress) {
    ctx.save();
    ctx.fillStyle = '#444953';
    roundedRect(ctx, x, y, width, height, height / 2);

    const barWidth = (width - 4) * progress;
    if (barWidth > 0) {
        let gradientColor;
        if (progress < 0.5) gradientColor = ['#32ff7e', '#18dcff'];
        else if (progress < 0.8) gradientColor = ['#fff200', '#ff9f1a'];
        else gradientColor = ['#ff9f1a', '#ff3838'];

        const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
        gradient.addColorStop(0, gradientColor[0]);
        gradient.addColorStop(1, gradientColor[1]);
        ctx.fillStyle = gradient;
        roundedRect(ctx, x + 2, y + 2, barWidth, height - 4, (height - 4) / 2);
    }
    
    ctx.font = '600 20px "Signika"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(progress * 100).toFixed(1)}%`, x + width / 2, y + height / 2 + 1);
    ctx.restore();
}

async function drawSystemCanvas({ botData, sysData, perfData }) {
    const width = 1200, height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const cacheDir = path.join(__dirname, '../../cache');

    // 1. Vẽ Background và Overlay
    try {
        const bgFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith('bg_upt_'));
        const bgImage = await loadImage(path.join(cacheDir, bgFiles[Math.floor(Math.random() * bgFiles.length)]));
        const imgRatio = bgImage.width / bgImage.height, canvasRatio = width / height;
        let sx = 0, sy = 0, sWidth = bgImage.width, sHeight = bgImage.height;
        if (imgRatio > canvasRatio) { sWidth = sHeight * canvasRatio; sx = (bgImage.width - sWidth) / 2; } 
        else { sHeight = sWidth / canvasRatio; sy = (bgImage.height - sHeight) / 2; }
        ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, 0, 0, width, height);
    } catch { ctx.fillStyle = '#242526'; ctx.fillRect(0, 0, width, height); }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, width, height);

    // 2. Vẽ Tiêu Đề
    ctx.textAlign = "center";
    ctx.font = '600 55px "Signika"';
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0.2, "#32ff7e");
    gradient.addColorStop(0.8, "#18dcff");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(0, 255, 150, 0.7)";
    ctx.shadowBlur = 15;
    ctx.fillText("SYSTEM DASHBOARD", width / 2, 80);
    ctx.shadowColor = 'transparent';

    // 3. Vẽ 2 cột thông tin
    const col1X = 70, col2X = 650;
    let currentY1 = 180, currentY2 = 180;
    const rowHeight = 45;

    ctx.textAlign = 'left';
    const drawInfoRow = (x, y, label, value) => {
        ctx.font = '600 24px "Signika"';
        ctx.fillStyle = '#B0BEC5';
        ctx.fillText(label, x, y);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(value, x + 180, y);
    };

    const drawSectionTitle = (x, y, title, color) => {
        ctx.font = '600 32px "Signika"';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillText(title, x, y);
        ctx.shadowColor = 'transparent';

        // Vẽ đường kẻ phân chia
        ctx.beginPath();
        ctx.moveTo(x, y + 15);
        ctx.lineTo(x + 480, y + 15);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        return y + 60; // Trả về vị trí Y tiếp theo
    };

    // -- Cột 1: Thông tin Bot & Hệ Thống --
    currentY1 = drawSectionTitle(col1X, currentY1, "THÔNG TIN BOT", "#18dcff");
    drawInfoRow(col1X, currentY1, "Uptime:", botData.uptime); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Ping:", `${botData.ping} ms`); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Prefix:", botData.prefix); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Lệnh:", `${botData.commands} lệnh`); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Người dùng:", `${botData.users} người`); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Nhóm:", `${botData.groups} nhóm`); currentY1 += 60;

    currentY1 = drawSectionTitle(col1X, currentY1, "HỆ THỐNG", "#18dcff");
    drawInfoRow(col1X, currentY1, "Hệ điều hành:", sysData.os); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Nền tảng:", sysData.platform); currentY1 += rowHeight;
    drawInfoRow(col1X, currentY1, "Địa chỉ IP:", sysData.ip); currentY1 += rowHeight;

    // -- Cột 2: Hiệu suất --
    currentY2 = drawSectionTitle(col2X, currentY2, "HIỆU SUẤT", "#32ff7e");
    
    ctx.font = '600 24px "Signika"';
    ctx.fillStyle = '#B0BEC5';
    ctx.fillText(`CPU (${perfData.cpuCores} Cores):`, col2X, currentY2);
    drawProgressBar(ctx, col2X, currentY2 + 30, 480, 30, perfData.cpuUsage / 100);
    currentY2 += 90;

    ctx.fillText(`RAM (${perfData.totalRam}MB):`, col2X, currentY2);
    drawProgressBar(ctx, col2X, currentY2 + 30, 480, 30, perfData.usedRam / perfData.totalRam);
    currentY2 += 90;

    ctx.fillText(`HEAP (${perfData.totalHeap}MB):`, col2X, currentY2);
    drawProgressBar(ctx, col2X, currentY2 + 30, 480, 30, perfData.usedHeap / perfData.totalHeap);
    currentY2 += 90;

    // 4. Footer
    ctx.textAlign = 'center';
    ctx.font = '600 20px "Signika"';
    ctx.fillStyle = '#B0BEC5';
    ctx.fillText(`Dashboard cập nhật lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}`, width / 2, height - 50);

    const filePath = path.join(cacheDir, `upt_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    return filePath;
}

module.exports.handleEvent = async ({ api, event }) => {
    const content = event.body?.toLowerCase();
    if (!content || !["upt", "cpu", "ram"].includes(content)) return;

    if (!isReady) {
        return api.sendMessage("🕓 Bot đang tải tài nguyên (ảnh, font...), vui lòng thử lại sau vài giây.", event.threadID);
    }

    // Gửi phản hồi chờ
    const reply = await api.sendMessage("🕓 Đang tạo ảnh thống kê, vui lòng chờ vài giây...", event.threadID);

    let imagePath;
    try {
        const cpuUsage = await getCPUUsage();
        const totalMem = os.totalmem(), freeMem = os.freemem(), heap = process.memoryUsage();

        const botData = {
            uptime: getFilteredUptime(),
            ping: Date.now() - event.timestamp,
            prefix: global.config.PREFIX || "#",
            commands: global.client.commands.size,
            users: global.data.allUserID.length,
            groups: global.data.allThreadID.length,
            version: module.exports.config.version
        };

        const sysData = {
            os: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            ip: Object.values(os.networkInterfaces()).flat().find(i => i.family === 'IPv4' && !i.internal)?.address || 'N/A',
            nodeVersion: process.version,
            cpuModel: os.cpus()[0].model,
            cpuCores: os.cpus().length
        };

        const perfData = {
            cpuCores: os.cpus().length,
            cpuUsage: parseFloat(cpuUsage),
            totalRam: Math.round(totalMem / 1048576),
            usedRam: Math.round((totalMem - freeMem) / 1048576),
            totalHeap: Math.round(heap.heapTotal / 1048576),
            usedHeap: Math.round(heap.heapUsed / 1048576),
            memUsage: 1 - freeMem / totalMem
        };

        imagePath = await drawSystemCanvas({ botData, sysData, perfData });

        // Gửi ảnh kèm nội dung
        await api.sendMessage({
            body: `📊 Đây là ảnh thống kê hệ thống thời điểm hiện tại.`,
            attachment: fs.createReadStream(imagePath)
        }, event.threadID, () => api.unsendMessage(reply.messageID));

    } catch (err) {
        console.error("❌ handleEvent UPT error:", err);
        api.sendMessage("⚠️ Đã xảy ra lỗi khi xử lý ảnh thống kê.", event.threadID, event.messageID);
    } finally {
        if (imagePath) try { fs.unlinkSync(imagePath); } catch {}
    }
};


module.exports.run = async ({ api, event, args }) => {
    if (!isReady) {
        return api.sendMessage("Bot đang khởi tạo tài nguyên cho lệnh, vui lòng thử lại sau giây lát...", event.threadID, event.messageID);
    }
    
    let type = args[0]?.toLowerCase() || "all";
    if (!["cpu", "ram", "all"].includes(type)) type = "all";
    let imagePath;
    
    try {
        const startTime = Date.now();
        const cpuUsage = await getCPUUsage();
        const totalMem = os.totalmem(), freeMem = os.freemem(), heap = process.memoryUsage();
        const botData = {
            uptime: getFilteredUptime(),
            ping: Date.now() - startTime,
            prefix: global.config.PREFIX || "#",
            commands: global.client.commands.size,
            users: global.data.allUserID.length,
            groups: global.data.allThreadID.length,
            version: module.exports.config.version
        };
        const sysData = {
            os: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version
        };
        const perfData = {
            cpuCores: os.cpus().length,
            cpuUsage: parseFloat(cpuUsage),
            totalRam: Math.round(totalMem / 1048576),
            usedRam: Math.round((totalMem - freeMem) / 1048576),
            totalHeap: Math.round(heap.heapTotal / 1048576),
            usedHeap: Math.round(heap.heapUsed / 1048576)
        };

        imagePath = await drawSystemCanvas({ botData, sysData, perfData, type });
        
        await api.sendMessage({
    body: `📊 Đây là ảnh thống kê hệ thống.`,
    attachment: fs.createReadStream(imagePath)
}, event.threadID, event.messageID);

    } catch (error) {
        console.error("[UPT] Lỗi khi thực thi:", error);
        api.sendMessage('❌ Đã xảy ra lỗi khi tạo ảnh hệ thống.', event.threadID, event.messageID);
    } finally {
        if (imagePath) try { fs.unlinkSync(imagePath); } catch {}
    }
};