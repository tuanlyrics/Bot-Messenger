const os = require('os');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const si = require('systeminformation');

const thuMucCache = path.join(__dirname, 'cache');
let taiNguyenDaSanSang = false;
let globalApiInstance;

// --- DANH SÁCH BACKGROUND RANDOM ---
const danhSachAnhNen = [
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

// --- CÁC HÀM TIỆN ÍCH ---
function dinhDangThoiGianHoatDong(uptimeSeconds) {
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// --- HÀM VẼ HIỆU ỨNG "LUMINOUS GLASS" ---
function veLuminousCard(ctx, x, y, width, height, radius = 30) {
    ctx.save();
    // Đổ bóng nền mềm mại
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;

    // Hình dạng card
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

    // Màu nền kính mờ
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Viền sáng tinh tế
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Điểm sáng (highlight) cong ở góc trên bên trái
    const highlightGradient = ctx.createRadialGradient(x, y, 0, x, y, width);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    ctx.restore();
}

function veThanhTienTrinhLuminous(ctx, x, y, width, height, progress, color) {
    ctx.save();
    const radius = height / 2;

    // Vẽ nền thanh
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    // Vẽ thanh tiến trình nếu có giá trị
    if (progress > 0) {
        const barWidth = width * progress;

        // Gradient chiều sâu
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, hexToRgba(color, 0.5));
        ctx.fillStyle = gradient;

        // Glow nhẹ
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, radius);
        ctx.fill();

        // Highlight sáng phía trên
        ctx.shadowBlur = 0;
        ctx.fillStyle = hexToRgba("#ffffff", 0.15);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height / 2, [radius, radius, 0, 0]);
        ctx.fill();
    }

    ctx.restore();
}


// Hàm hỗ trợ chuyển HEX sang RGBA
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- HÀM VẼ CHÍNH (PHIÊN BẢN LUMINOUS GLASS) ---
async function taoAnhThongKe({ botInfo, thongTinBot, thongTinHeThong, thongTinHieuSuat, thongTinGPU }) {
    const width = 1200, height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const primaryColor = '#81c784'; // Màu xanh lá cây dịu mắt

    // 1. Nền và Lớp phủ
    try {
        const anhNen = await loadImage(botInfo.bgPath);
        const imgRatio = anhNen.width / anhNen.height, canvasRatio = width / height;
        let sx = 0, sy = 0, sWidth = anhNen.width, sHeight = anhNen.height;
        if (imgRatio > canvasRatio) { sWidth = sHeight * canvasRatio; sx = (anhNen.width - sWidth) / 2; }
        else { sHeight = sWidth / canvasRatio; sy = (anhNen.height - sHeight) / 2; }
        ctx.drawImage(anhNen, sx, sy, sWidth, sHeight, 0, 0, width, height);
    } catch {
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, width, height);

//2 tiêuu đề
ctx.textAlign = "center";
ctx.font = '600 48px "Signika"';

// Gradient rainbow
const gradient = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
gradient.addColorStop(0, "#ff4b1f");
gradient.addColorStop(0.2, "#ff9068");
gradient.addColorStop(0.4, "#ffcc70");
gradient.addColorStop(0.6, "#42e695");
gradient.addColorStop(0.8, "#3bb2b8");
gradient.addColorStop(1, "#6a82fb");

ctx.fillStyle = gradient;

// Tạo hiệu ứng phát sáng phía sau chữ
ctx.shadowColor = "#ffffff"; // dùng màu trắng hoặc xanh sáng
ctx.shadowBlur = 40;         // càng lớn càng "phát sáng"
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;

ctx.fillText("SYSTEM DASHBOARD", width / 2, 80);

// Reset shadow nếu cần
ctx.shadowBlur = 0;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;


    // --- BỐ CỤC ---
    const p = 50; // Padding
    const cardWidth = width - p * 2;
    const cardHeight = height - 130 - p;

    // 3. Card chính
    veLuminousCard(ctx, p, 130, cardWidth, cardHeight);

    // 4. Khu vực thông tin Bot (bên trái card)
const leftPaneX = p + 40;
const leftPaneY = 130 + 50;
const avatarSize = 100;
const avatarCenterX = leftPaneX + avatarSize / 2;
const avatarCenterY = leftPaneY + avatarSize / 2;

ctx.save();

// Vẽ glow viền ngoài avatar
ctx.beginPath();
ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2 + 5, 0, Math.PI * 2); // Glow lớn hơn 5px
ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
ctx.shadowBlur = 20;
ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
ctx.fill();

// Vẽ viền trắng mỏng
ctx.shadowBlur = 0;
ctx.beginPath();
ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2 + 2, 0, Math.PI * 2);
ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
ctx.lineWidth = 2;
ctx.stroke();

// Vẽ nền đen để bo tròn avatar (clip)
ctx.beginPath();
ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
ctx.closePath();
ctx.clip();
ctx.fillStyle = 'black';
ctx.fill();

try {
    const avatar = await loadImage(botInfo.avatar);
    ctx.drawImage(avatar, leftPaneX, leftPaneY, avatarSize, avatarSize);
} catch {
    ctx.fillStyle = '#fff';
    ctx.fill();
}

ctx.restore();

// Vẽ tên bot kế bên avatar với rainbow nhẹ
ctx.font = '600 32px "Signika"';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';

const nameX = leftPaneX + avatarSize + 20;
const nameY = leftPaneY + avatarSize / 2;

const nameGradient = ctx.createLinearGradient(nameX, nameY - 20, nameX + 300, nameY + 20);
nameGradient.addColorStop(0, '#ff9a9e');
nameGradient.addColorStop(0.25, '#fad0c4');
nameGradient.addColorStop(0.5, '#fbc2eb');
nameGradient.addColorStop(0.75, '#a18cd1');
nameGradient.addColorStop(1, '#84fab0');

ctx.fillStyle = nameGradient;
ctx.fillText(botInfo.name, nameX, nameY);


// === 5. KHU VỰC THÔNG TIN HỆ THỐNG ===
let sysInfoY = leftPaneY + avatarSize + 60;
const sysInfoSpacing = 42;
const sysLabelX = leftPaneX;
const sysValueX = leftPaneX + 420;

function veDongSysInfo(label, value) {
    ctx.font = '600 20px "Signika"';
    ctx.fillStyle = '#B0BEC5';
    ctx.textAlign = 'left';
    ctx.fillText(label, sysLabelX, sysInfoY);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(value, sysValueX, sysInfoY);

    sysInfoY += sysInfoSpacing;
}

// === VẼ CÁC DÒNG THÔNG TIN ===
veDongSysInfo("Uptime:", dinhDangThoiGianHoatDong(Math.floor(process.uptime())));
veDongSysInfo("Hệ điều hành", thongTinHeThong.os);
veDongSysInfo("CPU", thongTinHeThong.cpu.brand);
veDongSysInfo("GPU", thongTinGPU.model);
veDongSysInfo("Node.js", thongTinHeThong.nodeVersion);
veDongSysInfo("Ping", `${thongTinBot.ping} ms`);
veDongSysInfo("Nhiệt độ", `${thongTinHieuSuat.cpuTemp}°C`);

function getBarColorByLabel(label) {
    switch (label.toLowerCase()) {
        case "cpu": return "#00e5ff";
        case "ram": return "#f74d86";
        case "ổ đĩa": return "#65f779";
        case "vram": return "#f7ee65";
        case "heap": return "#f73939";
        default: return "#90caf9"; // fallback màu xanh dương nhẹ
    }
}

    // 6. Khu vực hiệu suất (bên phải card)
    const rightPaneX = p + cardWidth / 2;
    let perfY = 130 + 60;
    const perfSpacing = 100;
    const perfBarWidth = cardWidth / 2 - 100;
    const perfBarHeight = 12;

function veWidgetPerf(label, value, subValue, progress) {
    ctx.font = '600 24px "Signika"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(label, rightPaneX, perfY);

    ctx.textAlign = 'right';
    ctx.fillText(value, rightPaneX + perfBarWidth, perfY);

    const barColor = getBarColorByLabel(label);
    veThanhTienTrinhLuminous(ctx, rightPaneX, perfY + 30, perfBarWidth, perfBarHeight, progress, barColor);

    ctx.font = '600 18px "Signika"';
    ctx.fillStyle = '#B0BEC5';
    ctx.textAlign = 'right';
    ctx.fillText(subValue, rightPaneX + perfBarWidth, perfY + 30 + perfBarHeight + 20);

    perfY += perfSpacing;
}


    veWidgetPerf("CPU", `${thongTinHieuSuat.cpuUsage.toFixed(1)}%`, `${thongTinHieuSuat.cpuCores} Cores @ ${thongTinHeThong.cpu.speed}GHz`, thongTinHieuSuat.cpuUsage / 100);
    veWidgetPerf("RAM", `${(thongTinHieuSuat.usedRam / thongTinHieuSuat.totalRam * 100).toFixed(1)}%`, `${thongTinHieuSuat.usedRam} / ${thongTinHieuSuat.totalRam} MB`, thongTinHieuSuat.usedRam / thongTinHieuSuat.totalRam);
    veWidgetPerf("Ổ ĐĨA", `${(thongTinHieuSuat.diskUsed / thongTinHieuSuat.diskTotal * 100).toFixed(1)}%`, `${thongTinHieuSuat.diskUsed} / ${thongTinHieuSuat.diskTotal} GB`, thongTinHieuSuat.diskUsed / thongTinHieuSuat.diskTotal);
    veWidgetPerf("VRAM", `${(thongTinGPU.vramUsed / thongTinGPU.vram * 100).toFixed(1)}%`, `${thongTinGPU.vramUsed} / ${thongTinGPU.vram} MB`, thongTinGPU.vramUsed / thongTinGPU.vram);
    veWidgetPerf("HEAP", `${(thongTinHieuSuat.usedHeap / thongTinHieuSuat.totalHeap * 100).toFixed(1)}%`, `${thongTinHieuSuat.usedHeap} / ${thongTinHieuSuat.totalHeap} MB`, thongTinHieuSuat.usedHeap / thongTinHieuSuat.totalHeap);

    // 7. Footer
    ctx.font = '600 16px "Signika"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(`Pcoder • Cập nhật lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}`, width / 2, height - 35);

    const duongDanAnh = path.join(thuMucCache, `upt_${Date.now()}.png`);
    fs.writeFileSync(duongDanAnh, canvas.toBuffer('image/png'));
    return duongDanAnh;
}

async function layDuLieuHeThong(api, eventTimestamp) {
    const [cpuData, memData, fsData, tempData, graphicsData] = await Promise.all([
        si.cpu(), si.mem(), si.fsSize(), si.cpuTemperature(), si.graphics()
    ]);
    const cpuLoad = await si.currentLoad();
    const boNhoHeap = process.memoryUsage();

    const thongTinBot = {
        uptime: dinhDangThoiGianHoatDong(process.uptime()),
        ping: Date.now() - eventTimestamp
    };

    const thongTinHeThong = {
        os: os.type(),
        platform: os.platform(),
        nodeVersion: process.version,
        cpu: { brand: cpuData.brand, speed: cpuData.speed }
    };

    const mainDisk = fsData[0] || { size: 1, used: 0 };
    const thongTinHieuSuat = {
        cpuCores: cpuData.cores,
        cpuUsage: cpuLoad.currentLoad,
        cpuTemp: tempData.main ?? 'N/A',
        totalRam: Math.round(memData.total / 1048576),
        usedRam: Math.round(memData.used / 1048576),
        diskTotal: (mainDisk.size / 1073741824).toFixed(2),
        diskUsed: (mainDisk.used / 1073741824).toFixed(2),
        totalHeap: Math.round(boNhoHeap.heapTotal / 1048576),
        usedHeap: Math.round(boNhoHeap.heapUsed / 1048576)
    };

    const gpuController = graphicsData.controllers[0] || {};
    const thongTinGPU = {
        model: gpuController.model || 'N/A',
        vram: gpuController.vram || 1,
        vramUsed: gpuController.vramUsed || 0
    };

    /*let allThreads = [];
    try {
        allThreads = await api.getThreadList(100, null, ["INBOX"]);
    } catch (e) {
        console.error("❌ Lỗi lấy danh sách thread:", e);
    }

    const allUsersSet = new Set();

    for (const thread of allThreads) {
        try {
            const info = await api.getThreadInfo(thread.threadID);
            info.participantIDs?.forEach(uid => allUsersSet.add(uid));
        } catch {}
    }*/

    return { thongTinBot, thongTinHeThong, thongTinHieuSuat, thongTinGPU };
}


// --- MODULE EXPORTS ---
module.exports.config = {
    name: "upt",
    version: "13.0.0", // Luminous Glass Version
    hasPermission: 2,
    credits: "Pcoder",
    description: "Hiển thị dashboard hệ thống với giao diện Luminous Glass sang trọng",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 15
};

module.exports.run = async ({ api, event }) => {
    globalApiInstance = api;
    // Khởi tạo tài nguyên nếu chưa sẵn sàng
    if (!taiNguyenDaSanSang) {
        await fs.ensureDir(thuMucCache);
        const fontUrl = 'https://github.com/Kenne400k/font/raw/refs/heads/main/Signika-SemiBold.ttf';
        const fontPath = path.join(thuMucCache, 'Signika-SemiBold.ttf');
        if (!fs.existsSync(fontPath)) {
            try {
                const response = await axios.get(fontUrl, { responseType: 'stream' });
                await new Promise((resolve, reject) => {
                    const stream = response.data.pipe(fs.createWriteStream(fontPath));
                    stream.on('finish', resolve);
                    stream.on('error', reject);
                });
            } catch (e) { console.error("Lỗi tải font:", e); }
        }
        try {
            registerFont(fontPath, { family: "Signika", weight: "600" });
        } catch(e) { console.error("Lỗi đăng ký font:", e); }
        taiNguyenDaSanSang = true;
    }
    
    const msgWait = await api.sendMessage("✨ Rendering Dashboard...", event.threadID);
    let imagePath;
    try {
        const botID = api.getCurrentUserID();
        const botInfoData = await api.getUserInfo(botID);
        const botName = botInfoData[botID].name;
        
        // Chọn ngẫu nhiên 1 background từ danh sách
        const bgUrl = danhSachAnhNen[Math.floor(Math.random() * danhSachAnhNen.length)];
        const bgName = path.basename(bgUrl);
        const bgPath = path.join(thuMucCache, `bg_${bgName}`);
        const avatarPath = path.join(thuMucCache, `avatar_${botID}.jpg`);

        // Tải và cache ảnh nền nếu chưa có
        if (!fs.existsSync(bgPath)) {
            const bg_res = await axios.get(bgUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(bgPath, Buffer.from(bg_res.data));
        }
        // Tải và cache avatar nếu chưa có
        if (!fs.existsSync(avatarPath)) {
             const avatar_res = await axios.get(`https://graph.facebook.com/${botID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' });
            fs.writeFileSync(avatarPath, Buffer.from(avatar_res.data));
        }

        const botInfo = { name: botName, avatar: avatarPath, bgPath: bgPath };
        const duLieu = await layDuLieuHeThong(api, event.timestamp);
        imagePath = await taoAnhThongKe({ ...duLieu, botInfo });

        await api.sendMessage({
            body: "💎 Dashboard!",
            attachment: fs.createReadStream(imagePath)
        }, event.threadID, () => {
            if (msgWait && msgWait.messageID) {
                api.unsendMessage(msgWait.messageID);
            }
        });

    } catch (err) {
        console.error("❌ run UPT Luminous error:", err);
        api.sendMessage("❌ Có lỗi xảy ra khi tạo Luminous Glass Dashboard.", event.threadID);
        if (msgWait && msgWait.messageID) {
            api.unsendMessage(msgWait.messageID);
        }
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (e) {
                console.error("Lỗi xóa file ảnh tạm:", e);
            }
        }
    }
};

module.exports.handleEvent = async ({ api, event }) => {
    // Để trống vì lệnh này được gọi bằng tên, không phải qua sự kiện tin nhắn
};