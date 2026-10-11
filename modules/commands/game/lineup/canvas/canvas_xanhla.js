/**
 * @name canvas_xanhla
 * @description Layout Scrim (Nền Xanh Lá) với tọa độ động.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');

async function render({ canvas, ctx, teamSize, teamName, logoPath, names }) {
    // === VẼ LOGO HÌNH TRÒN ===
    const logoSize = 265;
    const logoCX = 1980;
    const logoCY = 600;
    const radius = logoSize / 2;
    
    try {
        const logoImage = await loadImage(logoPath);
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCX, logoCY, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImage, logoCX - radius, logoCY - radius, logoSize, logoSize);
        ctx.restore();
    } catch(e) { console.error("Lỗi vẽ logo lineup:", e.message); }

    // === VẼ TÊN TEAM === 
    ctx.font = '110px Prompt';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700'; // Màu vàng
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 50;
    ctx.lineWidth = 20;
    
    const teamNameText = teamName.toUpperCase();
    const teamNameX = 2530;
    const teamNameY = 640;
    ctx.fillText(teamNameText, teamNameX, teamNameY);

    // === VẼ TÊN THÀNH VIÊN ===
    let nameXCoords;
    const nameY = 2018;

    switch (teamSize) {
        case 1:
            nameXCoords = [2433];
            break;
        case 2:
            nameXCoords = [1991, 2879];
            break;
        case 3:
            nameXCoords = [1560, 2435, 3323];
            break;
        case 4:
            nameXCoords = [1110, 2000, 2879, 3765];
            break;
        case 5:
        default:
            nameXCoords = [626, 1515, 2397, 3283, 4165];
            break;
    }

    ctx.font = '70px Anton';
    // SỬA: Đổi từ trắng sang vàng cho đồng bộ
    ctx.fillStyle = '#4a2c2a'; // Màu vàng
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 50;
    ctx.lineWidth = 5;

    for (let i = 0; i < teamSize; i++) {
        const name = (names[i] || "PLAYER").toUpperCase();
        const currentX = nameXCoords[i];
        if (currentX) {
            ctx.fillText(name, currentX, nameY);
        }
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = {
    render
};