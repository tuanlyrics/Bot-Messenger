/**
 * @name canvas_summer
 * @description Layout Summer (Nền Biển) với tọa độ động.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');

async function render({ canvas, ctx, teamSize, teamName, logoPath, names }) {
    // === VẼ LOGO HÌNH VUÔNG BO GÓC ===
    const logoSize = 265;
    const logoX = 1410 - (logoSize / 2);
    const logoY = 2250 - (logoSize / 2);
    const cornerRadius = 30; // Độ bo góc của hình vuông

    try {
        const logoImage = await loadImage(logoPath);
        ctx.save();
        
        // Tạo đường dẫn hình vuông bo góc để làm clipping mask
        ctx.beginPath();
        ctx.moveTo(logoX + cornerRadius, logoY);
        ctx.lineTo(logoX + logoSize - cornerRadius, logoY);
        ctx.arcTo(logoX + logoSize, logoY, logoX + logoSize, logoY + cornerRadius, cornerRadius);
        ctx.lineTo(logoX + logoSize, logoY + logoSize - cornerRadius);
        ctx.arcTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - cornerRadius, logoY + logoSize, cornerRadius);
        ctx.lineTo(logoX + cornerRadius, logoY + logoSize);
        ctx.arcTo(logoX, logoY + logoSize, logoX, logoY + logoSize - cornerRadius, cornerRadius);
        ctx.lineTo(logoX, logoY + cornerRadius);
        ctx.arcTo(logoX, logoY, logoX + cornerRadius, logoY, cornerRadius);
        ctx.closePath();
        ctx.clip();
        
        // Thêm hiệu ứng đổ bóng cho logo
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 30;

        // Vẽ logo vào bên trong
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        
        // Khôi phục lại trạng thái canvas
        ctx.restore();

    } catch(e) { 
        console.error("Lỗi vẽ logo lineup:", e.message); 
    }

    // === VẼ TÊN TEAM === 
    ctx.font = '230px Prompt';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00697D';
    ctx.shadowColor = '';
    ctx.shadowBlur = 50;
    ctx.lineWidth = 20;
    
    const teamNameText = teamName.toUpperCase();
    const teamNameX = 2539;
    const teamNameY = 2367;
    ctx.fillText(teamNameText, teamNameX, teamNameY);

    // === VẼ TÊN THÀNH VIÊN ===
    let nameXCoords;
    const nameY = 1880;

    switch (teamSize) {
        case 1:
            nameXCoords = [2465];
            break;
        case 2:
            nameXCoords = [2085, 2837];
            break;
        case 3:
            nameXCoords = [1697, 2465, 3227];
            break;
        case 4:
            nameXCoords = [1307, 2075, 2844, 3612];
            break;
        case 5:
        default:
            nameXCoords = [920, 1660, 2450, 3200, 3980];
            break;
    }

    ctx.font = '100px Prompt';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '';
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
