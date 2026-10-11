const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

const MENU_ITEMS_PER_PAGE = 10;
const ALL_CMD_ITEMS_PER_PAGE = 45; // 15 hàng x 3 cột

// --- TẢI FONT VÀ BACKGROUND ---
(async () => {
    const cacheDir = path.join(__dirname, '../../cache');
    await fs.ensureDir(cacheDir);

    const fontUrls = [
        { url: 'https://github.com/Kenne400k/font/raw/refs/heads/main/Signika-SemiBold.ttf', filename: 'Signika-SemiBold.ttf' }
    ];
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
            } catch (error) { console.error(`[MENU2] Lỗi tải font ${font.filename}:`, error.message); }
        }
    }
    
    try {
        registerFont(path.join(cacheDir, 'Signika-SemiBold.ttf'), { family: "Signika", weight: "600" });
    } catch (e) { console.error("[MENU2] Lỗi đăng ký font.", e); }

    for (let i = 0; i < backgroundUrls.length; i++) {
        const url = backgroundUrls[i];
        const ext = path.extname(url).split('?')[0] || '.jpg';
        const localPath = path.join(cacheDir, `bg_menu_${i}${ext}`);
        if (!fs.existsSync(localPath)) {
            try {
                const response = await axios({ method: 'GET', url, responseType: 'arraybuffer' });
                fs.writeFileSync(localPath, response.data);
            } catch (error) { console.error(`[MENU2] Lỗi tải background:`, error.message); }
        }
    }
})();

module.exports.config = {
    name: "menu2",
    version: "13.0.0",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Menu canvas phiên bản nâng cấp toàn diện.",
    commandCategory: "Người dùng",
    usages: "[all] | [tên nhóm lệnh] | [trang số]",
    cooldowns: 5
};


function TextPr(permission) {
    return permission == 0 ? "Thành viên" : permission == 1 ? "Quản trị viên" : permission == 2 ? "Admin bot" : "Toàn quyền";
}

async function drawBackground(ctx, width, height) {
    const cacheDir = path.join(__dirname, '../../cache');
    try {
        const bgFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith('bg_menu_'));
        const bgImage = await loadImage(path.join(cacheDir, bgFiles[Math.floor(Math.random() * bgFiles.length)]));
        const imgRatio = bgImage.width / bgImage.height, canvasRatio = width / height;
        let sx = 0, sy = 0, sWidth = bgImage.width, sHeight = bgImage.height;
        if (imgRatio > canvasRatio) { sWidth = sHeight * canvasRatio; sx = (bgImage.width - sWidth) / 2; } 
        else { sHeight = sWidth / canvasRatio; sy = (bgImage.height - sHeight) / 2; }
        ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, 0, 0, width, height);
    } catch { ctx.fillStyle = '#242526'; ctx.fillRect(0, 0, width, height); }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, width, height);
}

function drawTitle(ctx, text, y) {
    const width = ctx.canvas.width;
    ctx.textAlign = "center";
    ctx.font = '600 55px "Signika"';
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0.2, "#32ff7e");
    gradient.addColorStop(0.8, "#18dcff");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(0, 255, 150, 0.7)";
    ctx.shadowBlur = 15;
    ctx.fillText(text, width / 2, y);
    ctx.shadowColor = 'transparent';
}

async function drawMenuCanvas({ categoriesOnPage, byCategory, currentPage, totalPages, prefix, botName, totalCmds }) {
    const width = 1200, height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    await drawBackground(ctx, width, height);

    drawTitle(ctx, "DANH SÁCH LỆNH", 100);
    ctx.font = '600 24px "Signika"';
    ctx.fillStyle = "#B0BEC5";
    ctx.fillText(`Bot ${botName} hiện có ${totalCmds} lệnh khả dụng.`, width / 2, 145);

    const startXLeft = 100, startXRight = 650;
    let currentYLeft = 240, currentYRight = 240;
    const itemHeight = 75;

    ctx.textAlign = 'left';
    categoriesOnPage.forEach((cat, index) => {
        const itemNumber = (currentPage - 1) * MENU_ITEMS_PER_PAGE + index + 1;
        const x = index < MENU_ITEMS_PER_PAGE / 2 ? startXLeft : startXRight;
        let y = index < MENU_ITEMS_PER_PAGE / 2 ? currentYLeft : currentYRight;

        ctx.font = '600 32px "Signika"';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${itemNumber}. ${cat}`, x, y);

        ctx.font = '600 22px "Signika"';
        ctx.fillStyle = '#B0BEC5';
        ctx.fillText(`   > Hiện có ${byCategory[cat].length} lệnh.`, x, y + 30);

        if (index < MENU_ITEMS_PER_PAGE / 2) currentYLeft += itemHeight;
        else currentYRight += itemHeight;
    });

    ctx.textAlign = 'center';
    ctx.font = '600 26px "Signika"';
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Trang ${currentPage}/${totalPages}`, width / 2, height - 120);
    ctx.font = '600 22px "Signika"';
    ctx.fillStyle = "#B0BEC5";
    ctx.fillText(`Reply (trả lời) tin nhắn này với số thứ tự để xem chi tiết nhóm lệnh.`, width / 2, height - 80);
    ctx.fillText(`Dùng "next", "prev" hoặc số trang để chuyển trang.`, width / 2, height - 50);

    const filePath = path.join(__dirname, '../../cache', `menu_page_${currentPage}_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    return filePath;
}

async function drawCommandList({ catName, cmds, prefix }) {
    const itemHeight = 90;
    const width = 1200;
    const height = 180 + (cmds.length * itemHeight);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    await drawBackground(ctx, width, height);

    drawTitle(ctx, `NHÓM LỆNH: ${catName.toUpperCase()}`, 100);

    let currentY = 200;
    ctx.textAlign = 'left';
    cmds.forEach(cmd => {
        ctx.font = '600 30px "Signika"';
        const cmdName = `${prefix}${cmd.config.name}`;
        const prefixWidth = ctx.measureText(prefix).width;
        ctx.fillStyle = '#18dcff';
        ctx.fillText(prefix, 100, currentY);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(cmd.config.name, 100 + prefixWidth, currentY);

        ctx.font = '600 22px "Signika"';
        ctx.fillStyle = '#B0BEC5';
        ctx.fillText(`- Mô tả: ${cmd.config.description || "Không có"}`, 120, currentY + 30);
        ctx.fillText(`- Quyền hạn: ${TextPr(cmd.config.hasPermssion)}`, 120, currentY + 55);
        currentY += itemHeight;
    });

    const filePath = path.join(__dirname, '../../cache', `menu_cat_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    return filePath;
}

async function drawAllCommandsPage({ commandsOnPage, prefix, page, totalPages }) {
    const COLUMN_COUNT = 3;
    const PADDING = 60;
    const LINE_HEIGHT = 45;
    const HEADER_HEIGHT = 150;
    const FOOTER_HEIGHT = 80;
    const WIDTH = 1280;
    const rowCount = Math.ceil(commandsOnPage.length / COLUMN_COUNT);
    const HEIGHT = HEADER_HEIGHT + (rowCount * LINE_HEIGHT) + FOOTER_HEIGHT;
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    await drawBackground(ctx, WIDTH, HEIGHT);

    drawTitle(ctx, "TẤT CẢ LỆNH", 80);

    ctx.font = "600 24px Signika";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    const columnWidth = (WIDTH - PADDING * 2) / COLUMN_COUNT;
    
    commandsOnPage.forEach((cmd, i) => {
        const col = i % COLUMN_COUNT;
        const row = Math.floor(i / COLUMN_COUNT);
        const x = PADDING + (col * columnWidth);
        const y = HEADER_HEIGHT + (row * LINE_HEIGHT);
        ctx.fillText(`• ${prefix}${cmd.config.name}`, x, y);
    });

    ctx.font = "600 26px Signika";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(`Trang ${page}/${totalPages}`, WIDTH / 2, HEIGHT - FOOTER_HEIGHT / 2);
    
    const filePath = path.join(__dirname, '../../cache', `menu_all_page_${page}_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    return filePath;
}

// --- LOGIC CHÍNH ---

module.exports.run = async function({ api, event, args }) {
    const prefix = global.config.PREFIX || require(path.join(__dirname, '../../config.json')).PREFIX || '#';
    const { commands } = global.client;
    const { threadID, messageID } = event;
    const botName = global.config.BOTNAME || "Bot";

    const allValidCommands = Array.from(commands.values())
        .filter(cmd => cmd.config.commandCategory.toLowerCase() !== "hệ thống" && cmd.config.commandCategory.toLowerCase() !== "no prefix");

    if (args[0]?.toLowerCase() === 'all') {
        api.sendMessage("🔍 Đang tổng hợp tất cả các lệnh, việc này có thể mất một lúc...", threadID, messageID);
        
        const sortedCommands = allValidCommands.sort((a, b) => a.config.name.localeCompare(b.config.name));
        const totalPages = Math.ceil(sortedCommands.length / ALL_CMD_ITEMS_PER_PAGE);
        const pages = [];
        for (let i = 0; i < sortedCommands.length; i += ALL_CMD_ITEMS_PER_PAGE) {
            pages.push(sortedCommands.slice(i, i + ALL_CMD_ITEMS_PER_PAGE));
        }

        try {
            const imagePromises = pages.map((pageCmds, index) => 
                drawAllCommandsPage({ commandsOnPage: pageCmds, prefix, page: index + 1, totalPages })
            );
            const imagePaths = await Promise.all(imagePromises);
            const attachments = imagePaths.map(path => fs.createReadStream(path));

            api.sendMessage({
                body: `✨ **TẤT CẢ LỆNH CỦA BOT** ✨\nTổng cộng có ${sortedCommands.length} lệnh khả dụng:`,
                attachment: attachments
            }, threadID, () => imagePaths.forEach(path => fs.unlinkSync(path)), messageID);
        } catch (e) {
            console.error(e);
            api.sendMessage("❌ Đã xảy ra lỗi khi tạo ảnh tổng hợp lệnh.", threadID, messageID);
        }
        return;
    }
    
    let byCategory = {};
    for (const cmd of allValidCommands) {
        const cat = cmd.config.commandCategory || "Khác";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(cmd);
    }
    const categories = Object.keys(byCategory).sort((a, b) => byCategory[b].length - byCategory[a].length);

    // Xử lý khi người dùng nhập tên category
    const inputCat = args.join(" ").toLowerCase();
    const foundCat = categories.find(cat => cat.toLowerCase() === inputCat);
    if (foundCat) {
        const cmds = byCategory[foundCat].sort((a, b) => a.config.name.localeCompare(b.config.name));
        try {
            const cmdImgPath = await drawCommandList({ catName: foundCat, cmds, prefix });
            return api.sendMessage({
                body: `Tổng hợp các lệnh thuộc nhóm **${foundCat}**`,
                attachment: fs.createReadStream(cmdImgPath)
            }, threadID, () => fs.unlinkSync(cmdImgPath), messageID);
        } catch(e) {
            console.error(e);
            return api.sendMessage(`❌ Lỗi khi tạo canvas cho nhóm '${foundCat}'.`, threadID, messageID);
        }
    }

    // Menu chính
    const totalPages = Math.ceil(categories.length / MENU_ITEMS_PER_PAGE);
    const page = (args.length > 0 && !isNaN(parseInt(args[0]))) ? parseInt(args[0]) : 1;
    if (page < 1 || page > totalPages) return api.sendMessage(`⚠️ Trang không hợp lệ. Hiện có từ trang 1 đến ${totalPages}.`, threadID, messageID);
    
    const start = (page - 1) * MENU_ITEMS_PER_PAGE;
    const categoriesOnPage = categories.slice(start, start + MENU_ITEMS_PER_PAGE);
    
    try {
        const imgPath = await drawMenuCanvas({ categoriesOnPage, byCategory, currentPage: page, totalPages, prefix, botName, totalCmds: allValidCommands.length });
        api.sendMessage({
            body: `✨ **MENU BOT - Trang ${page}/${totalPages}** ✨\nReply tin nhắn này với số thứ tự để xem chi tiết.`,
            attachment: fs.createReadStream(imgPath)
        }, threadID, (err, info) => {
            fs.unlink(imgPath, (e) => e && console.error(e));
            if (!err) {
                global.client.handleReply.push({
                    name: module.exports.config.name, author: event.senderID, messageID: info.messageID,
                    allCategories: categories, byCategory, currentPage: page, totalPages, prefix
                });
            }
        }, messageID);
    } catch (e) {
        console.error(e);
        api.sendMessage("❌ Lỗi khi tạo canvas menu.", threadID, messageID);
    }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { author, allCategories, byCategory, currentPage, totalPages, prefix } = handleReply;
    if (event.senderID != author) return;

    const reply = event.body.trim().toLowerCase();
    api.unsendMessage(handleReply.messageID).catch(e => {});

    let newPage = currentPage;
    if (reply === 'next' || reply === 'n') newPage = currentPage + 1 > totalPages ? 1 : currentPage + 1;
    else if (reply === 'prev' || reply === 'p') newPage = currentPage - 1 < 1 ? totalPages : currentPage - 1;
    else if (/^\d+$/.test(reply)) {
        const chosenIndex = parseInt(reply) - 1;
        if (chosenIndex < 0 || chosenIndex >= allCategories.length) return api.sendMessage("⛔ Số thứ tự không hợp lệ.", event.threadID);
        
        const catName = allCategories[chosenIndex];
        const cmds = byCategory[catName].sort((a, b) => a.config.name.localeCompare(b.config.name));
        
        try {
            const cmdImgPath = await drawCommandList({ catName, cmds, prefix });
            return api.sendMessage({
                body: `Tổng hợp các lệnh thuộc nhóm **${catName}**`,
                attachment: fs.createReadStream(cmdImgPath)
            }, event.threadID, () => fs.unlink(cmdImgPath, (e) => e && console.error(e)));
        } catch(e) {
            console.error(e);
            return api.sendMessage(`❌ Lỗi khi tạo canvas cho nhóm '${catName}'.`, event.threadID);
        }
    } else return;

    const start = (newPage - 1) * MENU_ITEMS_PER_PAGE;
    const categoriesOnPage = allCategories.slice(start, start + MENU_ITEMS_PER_PAGE);
    
    try {
        const imgPath = await drawMenuCanvas({ categoriesOnPage, byCategory, currentPage: newPage, totalPages, prefix, botName: global.config.BOTNAME, totalCmds: Object.values(byCategory).flat().length });
        api.sendMessage({
            body: `✨ **MENU BOT - Trang ${newPage}/${totalPages}** ✨\nReply tin nhắn này với số thứ tự để xem chi tiết.`,
            attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
            fs.unlink(imgPath, (e) => e && console.error(e));
            if (!err) global.client.handleReply.push({ ...handleReply, messageID: info.messageID, currentPage: newPage });
        });
    } catch (e) {
        console.error(e);
        api.sendMessage("❌ Lỗi khi tạo trang menu mới.", event.threadID);
    }
};
