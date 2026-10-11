const Canvas = require('canvas');
const fs = require('fs-extra');
const path = require('path');

// --- Paths ---
const dataPath = path.join(__dirname, 'data', 'groups.json');
const banPath = path.join(__dirname, 'data', 'banned.json');
const cachePath = path.join(__dirname, '..', 'cache');

// --- Map Layout & Configuration ---
const mapLayout = [
    ['g', 'g', 'm', 'm', 's'],
    ['g', 'w', 'w', 'm', 's'],
    ['g', 'w', 'w', 'g', 'g'],
    ['m', 'w', 'g', 'g', 's'],
];
const cellSize = 160;
const canvasWidth = 5 * cellSize;
const canvasHeight = 4 * cellSize;

const getBiome = (x, y) => (mapLayout[y] && mapLayout[y][x]) ? mapLayout[y][x] : null;

// --- Drawing Functions ---
function drawGrass(ctx, x, y, size) {
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(x, y, size, size);
    for (let i = 0; i < 200; i++) {
        const dx = x + Math.random() * size;
        const dy = y + Math.random() * size;
        ctx.fillStyle = Math.random() > 0.5 ? '#57923d' : '#82d363';
        ctx.fillRect(dx, dy, 2, 2);
    }
    for (let i = 0; i < 5; i++) {
        const dx = x + Math.random() * size;
        const dy = y + Math.random() * size;
        ctx.fillStyle = ['#ff4757', '#ffd32a', '#3742fa'][Math.floor(Math.random() * 3)];
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
function drawWater(ctx, x, y, size) {
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(x, y, size, size);
    for (let i = 0; i < 3; i++) {
        const dx = x + Math.random() * size;
        const dy = y + Math.random() * size;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(dx, dy, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
    }
}
function drawMountain(ctx, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    ctx.fillStyle = '#8e9397';
    ctx.fillRect(x, y, size, size);
    for (let i = 0; i < 3; i++) {
        const peakX = x + size * 0.2 + Math.random() * size * 0.6;
        const peakY = y + size * 0.1 + Math.random() * size * 0.4;
        const baseWidth = size * 0.3 + Math.random() * size * 0.3;
        const baseY = y + size - size * 0.1;
        const grd = ctx.createLinearGradient(peakX, peakY, peakX, baseY);
        grd.addColorStop(0, '#d1d3d4');
        grd.addColorStop(1, '#626c76');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(peakX - baseWidth, baseY);
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(peakX + baseWidth, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(peakX - baseWidth * 0.3, peakY + size * 0.1);
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(peakX + baseWidth * 0.3, peakY + size * 0.1);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
function drawSand(ctx, x, y, size) {
    ctx.fillStyle = '#f0e68c';
    ctx.fillRect(x, y, size, size);
    for (let i = 0; i < 400; i++) {
        const dx = x + Math.random() * size;
        const dy = y + Math.random() * size;
        ctx.fillStyle = 'rgba(195, 176, 110, 0.7)';
        ctx.fillRect(dx, dy, 1, 1);
    }
}
function drawShoreline(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const tx = x * size, ty = y * size;
    if (getBiome(x, y-1) === 'w') { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + size, ty); ctx.stroke(); }
    if (getBiome(x, y+1) === 'w') { ctx.beginPath(); ctx.moveTo(tx, ty+size); ctx.lineTo(tx + size, ty+size); ctx.stroke(); }
    if (getBiome(x-1, y) === 'w') { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty+size); ctx.stroke(); }
    if (getBiome(x+1, y) === 'w') { ctx.beginPath(); ctx.moveTo(tx+size, ty); ctx.lineTo(tx+size, ty+size); ctx.stroke(); }
}
function drawDamageEffect(ctx, x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 1.5);
    grd.addColorStop(0, 'rgba(255, 100, 0, 0.7)');
    grd.addColorStop(0.5, 'rgba(255, 0, 0, 0.5)');
    grd.addColorStop(1, 'rgba(50, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for(let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.arc(x + Math.random()*size, y + Math.random()*size, Math.random() * 15, 0, Math.PI * 2);
        ctx.fill();
    }
}
function drawSwordIcon(ctx, x, y, size) {
    const hiltColor = '#8B4513'; const bladeColor = '#C0C0C0'; const guardWidth = size * 0.6; const bladeWidth = size * 0.15; const bladeHeight = size * 0.65;
    ctx.fillStyle = hiltColor; ctx.fillRect(x - guardWidth / 2, y, guardWidth, size * 0.1); ctx.fillRect(x - bladeWidth, y + size * 0.1, bladeWidth * 2, size * 0.25);
    ctx.fillStyle = bladeColor; ctx.fillRect(x - bladeWidth / 2, y - bladeHeight, bladeWidth, bladeHeight);
    ctx.beginPath(); ctx.moveTo(x - bladeWidth / 2, y - bladeHeight); ctx.lineTo(x + bladeWidth / 2, y - bladeHeight); ctx.lineTo(x, y - bladeHeight - size * 0.1); ctx.closePath(); ctx.fill();
}
function drawHpBar(ctx, x, y, width, height, hp, maxHp = 10000) {
    maxHp = Math.max(1, Math.min(maxHp, 50000));
    hp = Math.max(0, Math.min(hp, maxHp));
    const percentage = hp / maxHp;
    ctx.save();
    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, height, 5);
    else ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
    if (percentage > 0) {
      const hpColor = percentage > 0.5 ? '#2ecc71' : percentage > 0.2 ? '#f1c40f' : '#e74c3c';
      ctx.fillStyle = hpColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 2, y + 2, (width - 4) * percentage, height - 4, 3);
      else ctx.rect(x + 2, y + 2, (width - 4) * percentage, height - 4);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hp}/${maxHp}`, x + width / 2, y + height / 2 + 1);
    ctx.restore();
}
function drawAvatarStand(ctx, x, y, size) {
    const grd = ctx.createLinearGradient(x, y, x, y+size);
    grd.addColorStop(0, '#B0BEC5');
    grd.addColorStop(1, '#607D8B');
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#455A64';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, size/2, size/4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
}
function drawCellLabel(ctx, label, x, y) {
    const signWidth = 40, signHeight = 25, postHeight = 10;
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x, y, 4, postHeight);
    ctx.fillStyle = '#A1887F';
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - signWidth/2 + 2, y - signHeight, signWidth, signHeight, 4);
    else ctx.rect(x - signWidth/2 + 2, y - signHeight, signWidth, signHeight);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFDE7';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x+2, y - signHeight/2);
}

/**
 * Vẽ bản đồ. Nếu callback thì trả về tempPath (dùng cho JOIN), nếu không thì gửi luôn vào box.
 * @param {*} api 
 * @param {*} event 
 * @param {*} callback (optional)
 * @param {*} options (optional) { force: true } => không check territory
 */
module.exports = async function(api, event, callback = null, options = {}) {
    const threadID = event.threadID;

    fs.ensureDirSync(cachePath);
    const [data, banned] = await Promise.all([
        fs.readJson(dataPath).catch(() => ({})),
        fs.readJson(banPath).catch(() => [])
    ]);

    if (banned.includes(threadID)) {
        if (callback) return callback(null, null, null);
        return api.sendMessage('🚫 Nhóm bạn đã bị loại khỏi game và không thể xem bản đồ.', threadID);
    }

    // Nếu không có territory mà không force thì trả về thông báo
    if (!options.force && (!data[threadID] || !data[threadID].territory)) {
        if (callback) return callback(null, null, null);
        return api.sendMessage("❌ Nhóm bạn chưa tham gia game. Dùng lệnh `/deche join` để tham gia và chiếm lấy lãnh thổ!", threadID);
    }

    // Vẽ canvas map
    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Layer 1: Biome
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 5; x++) {
            const biomeChar = getBiome(x, y);
            const tx = x * cellSize, ty = y * cellSize;
            switch(biomeChar) {
                case 'w': drawWater(ctx, tx, ty, cellSize); break;
                case 'm': drawMountain(ctx, tx, ty, cellSize); break;
                case 's': drawSand(ctx, tx, ty, cellSize); break;
                default: drawGrass(ctx, tx, ty, cellSize); break;
            }
        }
    }
    // Layer 2: Shoreline
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 5; x++) {
            const biome = getBiome(x, y);
            if (biome !== 'w') drawShoreline(ctx, x, y, cellSize);
        }
    }
    // Layer 3: Group info
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 5; x++) {
            const tx = x * cellSize;
            const ty = y * cellSize;
            const label = String.fromCharCode(65 + y) + (x + 1);
            const group = Object.entries(data).find(([tid, val]) => val.territory === label && !banned.includes(tid));
            if (group) {
                const groupData = data[group[0]];
                const centerX = tx + cellSize / 2;

                drawAvatarStand(ctx, centerX, ty + 105, 110);

                try {
                    const imgURL = await api.getThreadInfo(group[0]).then(info => info.imageSrc || '');
                    if (imgURL) {
                        const img = await Canvas.loadImage(imgURL);
                        const radius = 45;
                        const centerY = ty + 70;
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                        ctx.clip();
                        ctx.drawImage(img, centerX - radius, centerY - radius, radius * 2, radius * 2);
                        ctx.restore();
                    }
                } catch (e) { /* ignore */ }

                drawHpBar(
                    ctx,
                    tx + 30, ty + 130, 100, 20,
                    groupData.hp || 0,
                    groupData.maxHp ? Math.min(groupData.maxHp, 50000) : 10000
                );

                if (groupData.hp <= 80 && groupData.hp > 0) {
                    drawDamageEffect(ctx, tx, ty, cellSize);
                }

                if (groupData.items && groupData.items.sword) {
                    drawSwordIcon(ctx, tx + cellSize - 30, ty + 35, 40);
                }
            }
            drawCellLabel(ctx, label, tx + 25, ty + 30);
        }
    }

    const tempPath = path.join(cachePath, `map_${Date.now()}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer());

    if (callback) {
        return callback(null, null, tempPath);
    } else {
        return api.sendMessage({
            body: '🗺️ Bản đồ đế chế hiện tại:',
            attachment: fs.createReadStream(tempPath)
        }, threadID, () => fs.unlink(tempPath).catch(() => {}));
    }
};