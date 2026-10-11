const fs = require('fs').promises;
const fs_sync = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');

// --- CONFIG & SETUP ---
const dataPath = path.join(__dirname, '..', 'cache', 'banchim_data.json');
let gameData = {};
const FONT_PATH = path.join(__dirname, '..', '..', 'includes', 'fonts');

module.exports.config = {
    name: "banchim",
    version: "3.0.0 - Full Canvas",
    hasPermssion: 0,
    credits: "D-Jukie & Gemini (Full Canvas Rewrite)",
    description: "Game Bắn Chim với giao diện 100% canvas và cơ sở dữ liệu ổn định.",
    commandCategory: "Game",
    usages: "[register | spin | build | info | top | shop]",
    cooldowns: 5
};

// --- HELPERS ---
const format = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

async function checkAndDownloadFont(fontName, url) {
    const fontPath = path.join(FONT_PATH, fontName);
    try {
        await fs.access(fontPath);
    } catch {
        console.log(`[Banchim] Font ${fontName} không tồn tại, đang tải về...`);
        try {
            await fs.mkdir(FONT_PATH, { recursive: true });
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            await fs.writeFile(fontPath, response.data);
            console.log(`[Banchim] Tải font ${fontName} thành công!`);
        } catch (e) {
            console.error(`[Banchim] Không thể tải font ${fontName}:`, e.message);
            return;
        }
    }
    try {
        registerFont(fontPath, { family: path.basename(fontName, path.extname(fontName)) });
    } catch(e) {
        console.warn(`[Banchim] Không thể đăng ký font ${fontName}.`);
    }
}

async function drawBanner(title, textLines) {
    const canvas = createCanvas(800, textLines.length * 40 + 120);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f2027');
    gradient.addColorStop(0.5, '#203a43');
    gradient.addColorStop(1, '#2c5364');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    ctx.textAlign = 'center';
    ctx.font = 'bold 50px SVN-AGUDA-REGULAR';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(title, 400, 70);
    ctx.shadowBlur = 0;

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#f0f0f0';
    let y = 120;
    for (const line of textLines) {
        ctx.fillText(line, 400, y);
        y += 35;
    }
    
    const buffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, '..', 'cache', `banner_${Date.now()}.png`);
    await fs.writeFile(imagePath, buffer);
    setTimeout(() => fs.unlink(imagePath).catch(e => {}), 60000);
    return fs_sync.createReadStream(imagePath);
}


async function drawIsland(player) {
    const canvas = createCanvas(1000, 600);
    const ctx = canvas.getContext('2d');
    try {
        const bg = await loadImage('https://i.imgur.com/3nJfQC3.png');
        ctx.drawImage(bg, 0, 0, 1000, 600);
    } catch (e) {
        ctx.fillStyle = '#79c1c9'; ctx.fillRect(0, 0, 1000, 600);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 50px SVN-AGUDA-REGULAR';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.fillText(`ĐẢO CỦA ${player.name.toUpperCase()}`, 500, 60);
    ctx.shadowBlur = 0;
    ctx.font = '24px SVN-AGUDA-REGULAR';
    ctx.fillText(`LV: ${player.island.level} | 💰: ${format(player.coins)} | 🌪️: ${player.spins}`, 500, 100);
    const buildings = [
        { name: 'Tháp Canh', key: 'tower', x: 200, y: 300 }, { name: 'Nhà Chính', key: 'main', x: 500, y: 350 },
        { name: 'Kho Báu', key: 'vault', x: 800, y: 300 }, { name: 'Tượng', key: 'statue', x: 350, y: 500 },
    ];
    for (const b of buildings) {
        const level = player.island.buildings[b.key];
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(b.x - 100, b.y, 200, 60, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px SVN-AGUDA-REGULAR';
        ctx.fillText(b.name, b.x, b.y + 25);
        ctx.fillStyle = level >= 50 ? '#FFD700' : '#fff';
        ctx.font = '20px SVN-AGUDA-REGULAR';
        ctx.fillText(`Cấp ${level} / 50`, b.x, b.y + 50);
    }
    const buffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, '..', 'cache', `island_${player.ID}.png`);
    await fs.writeFile(imagePath, buffer);
    setTimeout(() => fs.unlink(imagePath).catch(e => {}), 60000);
    return fs_sync.createReadStream(imagePath);
}

// --- MAIN FUNCTIONS ---
module.exports.onLoad = async () => {
    await checkAndDownloadFont('SVN-AGUDA-REGULAR.TTF', 'https://github.com/tandung1/font/raw/main/SVN-AGUDA-REGULAR.TTF');
    try {
        await fs.access(dataPath);
        const data = await fs.readFile(dataPath, 'utf-8');
        gameData = JSON.parse(data);
    } catch (e) {
        console.log("[Banchim] Không tìm thấy file dữ liệu, sẽ tạo mới.");
        await fs.writeFile(dataPath, JSON.stringify({}, null, 4)).catch(e => console.error(e));
    }
    setInterval(() => {
        let hasChanged = false;
        for (const id in gameData) {
            if (gameData[id].spins < 50) {
                gameData[id].spins += 2;
                hasChanged = true;
            }
        }
        if (hasChanged) {
            saveData();
            console.log("[Banchim] Đã tặng 2 lượt quay cho người chơi.");
        }
    }, 600000);
};

module.exports.run = async function ({ api, event, args, Users, Currencies }) {
    const { threadID, messageID, senderID } = event;
    const send = (msg, extra) => api.sendMessage(msg, threadID, extra, messageID);
    const command = args[0]?.toLowerCase();

    if (!command || command === 'help') {
        const banner = await drawBanner('Bắn Chim - Đảo Tỷ Phú', [
            '`register`: Đăng ký để bắt đầu.',
            '`spin`: Thử vận may với vòng quay.',
            '`build`: Nâng cấp các công trình.',
            '`info`: Xem thông tin hòn đảo của bạn.',
            '`top`: Bảng xếp hạng các tay chơi.',
            '`shop`: Mua thêm lượt quay.'
        ]);
        return send({ attachment: banner });
    }

    const player = gameData[senderID];

    switch (command) {
        case 'register': {
            if (player) return send("✅ Bạn đã đăng ký game này từ trước rồi.");
            const playerName = await Users.getNameUser(senderID);
            gameData[senderID] = {
                name: playerName, ID: senderID, coins: 20000, spins: 20,
                island: { level: 1, upgradeCost: 200, buildings: { main: 0, tower: 0, vault: 0, statue: 0 } }
            };
            await saveData();
            return send(`🎉 Chúc mừng ${playerName} đã đăng ký thành công! Dùng "banchim info" để xem đảo của bạn.`);
        }
        
        case 'spin': {
            if (!player) return send("⚠️ Bạn chưa đăng ký game! Dùng `banchim register`.");
            if (player.spins <= 0) return send("⚠️ Bạn đã hết lượt quay. Vui lòng đợi hoặc mua thêm ở shop.");
            player.spins--;
            const items = [
                { type: 'coins', value: 1000, weight: 30 }, { type: 'coins', value: 5000, weight: 20 },
                { type: 'coins', value: 10000, weight: 10 }, { type: 'spins', value: 2, weight: 15 },
                { type: 'spins', value: 5, weight: 5 }, { type: 'attack', weight: 10 }, { type: 'steal', weight: 10 }
            ];
            const weightedPool = [];
            items.forEach(item => { for (let i = 0; i < item.weight; i++) weightedPool.push(item); });
            const reward = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            let rewardMsg = "";
            if (reward.type === 'coins') {
                const amount = reward.value * player.island.level;
                player.coins += amount;
                rewardMsg = `bạn nhận được ${format(amount)} coins!`;
            } else if (reward.type === 'spins') {
                player.spins += reward.value;
                rewardMsg = `bạn nhận được ${reward.value} lượt quay!`;
            } else if (reward.type === 'attack') { rewardMsg = `bạn nhận được 1 lượt TẤN CÔNG!`; } 
            else if (reward.type === 'steal') { rewardMsg = `bạn nhận được 1 lượt TRỘM VÀNG!`; }
            await send(`🌪️ Vòng quay may mắn... Chúc mừng, ${rewardMsg}`);
            const otherPlayers = Object.values(gameData).filter(p => p.ID !== senderID);
            if ((reward.type === 'attack' || reward.type === 'steal') && otherPlayers.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                if (reward.type === 'attack') {
                    const buildingKeys = Object.keys(target.island.buildings);
                    const randomBuilding = buildingKeys[Math.floor(Math.random() * buildingKeys.length)];
                    if (target.island.buildings[randomBuilding] > 0) target.island.buildings[randomBuilding]--;
                    const prize = 5000 * target.island.level;
                    player.coins += prize;
                    send(`💣 Bạn đã tấn công đảo của ${target.name}, phá hủy 1 cấp công trình và nhận được ${format(prize)} coins!`);
                } else {
                    const stolenAmount = Math.floor(target.coins * 0.1);
                    if (stolenAmount > 0) {
                        target.coins -= stolenAmount;
                        player.coins += stolenAmount;
                        send(`💰 Bạn đã trộm thành công ${format(stolenAmount)} coins từ nhà của ${target.name}!`);
                    } else send(`🥺 Bạn đột nhập vào nhà ${target.name} nhưng họ quá nghèo, chẳng có gì để trộm.`);
                }
            }
            await saveData();
            break;
        }

        case 'build': {
            if (!player) return send("⚠️ Bạn chưa đăng ký game!");
            const buildingKeys = Object.keys(player.island.buildings);
            let buildMenu = "--- NÂNG CẤP ĐẢO ---\n";
            let canUpgrade = false;
            buildingKeys.forEach((key, index) => {
                const level = player.island.buildings[key];
                const cost = (level + 1) * player.island.upgradeCost;
                buildMenu += `${index + 1}. ${key.charAt(0).toUpperCase() + key.slice(1)} (Lv.${level}) - ${level < 50 ? format(cost) + '$' : 'MAX'}\n`;
                if(level < 50) canUpgrade = true;
            });
            if(!canUpgrade) {
                const levelUpCost = player.island.level * 50000;
                buildMenu += `\n🎉 Đảo của bạn đã max cấp. Dùng "banchim levelup" (${format(levelUpCost)}$) để lên đời!`;
            } else buildMenu += "\n» Reply tin nhắn này với số thứ tự công trình bạn muốn nâng cấp.";
            return send(buildMenu, (err, info) => {
                if(err) return;
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: senderID, type: "build" });
            });
        }
        
        case 'levelup': {
            if (!player) return send("⚠️ Bạn chưa đăng ký game!");
            if (!Object.values(player.island.buildings).every(lvl => lvl >= 50)) return send("⚠️ Bạn cần nâng cấp tất cả công trình lên cấp 50 trước!");
            const cost = player.island.level * 50000;
            if (player.coins < cost) return send(`⚠️ Bạn không đủ ${format(cost)} coins để lên đời đảo.`);
            player.coins -= cost;
            player.island.level++;
            player.island.upgradeCost += 200;
            for (const key in player.island.buildings) player.island.buildings[key] = 0;
            await saveData();
            return send(`🎉 CHÚC MỪNG! Hòn đảo của bạn đã lên cấp ${player.island.level}!`);
        }

        case 'info': {
            if (!player) return send("⚠️ Bạn chưa đăng ký game!");
            return send({ attachment: await drawIsland(player) });
        }
        
        case 'top': {
            const allPlayers = Object.values(gameData);
            if (allPlayers.length < 1) return send("Chưa có tay chơi nào trong game.");
            allPlayers.sort((a, b) => b.island.level - a.island.level || b.coins - a.coins);
            let topMsg = "--- 👑 BẢNG XẾP HẠNG ĐẢO TỶ PHÚ 👑 ---\n";
            allPlayers.slice(0, 5).forEach((p, i) => {
                topMsg += `${i + 1}. ${p.name} - Đảo Lv.${p.island.level} (${format(p.coins)}$)\n`;
            });
            return send(topMsg);
        }
        
        case 'shop': {
            const shopBanner = await drawBanner('Cửa Hàng', ['1. Mua 20 lượt quay - 20,000$', '2. Mua 50 lượt quay - 45,000$', '\n» Reply tin nhắn này với lựa chọn của bạn.']);
            return send({ attachment: shopBanner }, (err, info) => {
                if(err) return;
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: senderID, type: "shop" });
            });
        }
    }
};

module.exports.handleReply = async function({ api, event, handleReply, Currencies }) {
    const { threadID, messageID, senderID, body } = event;
    const send = (msg) => api.sendMessage(msg, threadID, messageID);
    if (senderID !== handleReply.author) return;

    const player = gameData[senderID];
    if (!player) return;
    api.unsendMessage(handleReply.messageID).catch(()=>{});

    switch (handleReply.type) {
        case "build": {
            const choice = parseInt(body) - 1;
            const buildingKeys = Object.keys(player.island.buildings);
            if (isNaN(choice) || choice < 0 || choice >= buildingKeys.length) return send("⚠️ Lựa chọn không hợp lệ.");
            const key = buildingKeys[choice];
            const level = player.island.buildings[key];
            if (level >= 50) return send("⚠️ Công trình này đã đạt cấp tối đa.");
            const cost = (level + 1) * player.island.upgradeCost;
            if (player.coins < cost) return send(`⚠️ Bạn không đủ ${format(cost)} coins.`);
            player.coins -= cost;
            player.island.buildings[key]++;
            await saveData();
            return send(`✅ Nâng cấp ${key} thành công lên cấp ${level + 1}!`);
        }
        case "shop": {
            const choice = parseInt(body);
            let cost = 0, spins = 0;
            if (choice === 1) { cost = 20000; spins = 20; }
            else if (choice === 2) { cost = 45000; spins = 50; }
            else return send("⚠️ Lựa chọn không hợp lệ.");
            const moneyUser = (await Currencies.getData(senderID)).money;
            if (moneyUser < cost) return send(`⚠️ Bạn không có đủ ${format(cost)}$ tiền bot để mua.`);
            await Currencies.decreaseMoney(senderID, cost);
            player.spins += spins;
            await saveData();
            return send(`✅ Mua thành công ${spins} lượt quay!`);
        }
    }
};