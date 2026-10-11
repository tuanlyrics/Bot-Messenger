/**
 * @name canvas1
 * @description Layout Cổ Điển (Nền Xanh Lá) - Đã khôi phục tọa độ gốc.
 * @author D-Jukie & Gemini & Pcoder
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- ĐỊNH NGHĨA CÁC FONT SẼ SỬ DỤNG TRONG LAYOUT NÀY ---
const FONT_PROMPT = 'Prompt';
const FONT_SERIF = 'DejaVu Serif';

// --- HÀM VẼ ẢNH CHÍNH ---
async function render({ teamSize, teamName, logoPath, names, backgroundPath }) {
    if (!fs.existsSync(backgroundPath)) {
        throw new Error(`Không tìm thấy ảnh nền tại ${backgroundPath}.`);
    }

    const background = await loadImage(backgroundPath);
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // --- PHẦN VẼ TÊN TEAM (XOAY NGHIÊNG) ---
    ctx.font = `bold 90px "${FONT_SERIF}"`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const x = 300;
    const y = canvas.height - 260;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.shadowColor = 'rgba(255, 165, 0, 0.7)';
    ctx.shadowBlur = 40;
    ctx.fillText(teamName.toUpperCase(), 0, 0);
    ctx.restore();

try {
    const logo = await loadImage(logoPath);
    const logoWidth = 250;
    const logoHeight = 250;
    const marginX = 160;
    const marginY = 630;
    const logoX = marginX;
    const logoY = canvas.height - logoHeight - marginY;

    // Tạo vùng bo góc tròn
    const radius = 40; // Bán kính bo góc
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(logoX + radius, logoY);
    ctx.lineTo(logoX + logoWidth - radius, logoY);
    ctx.quadraticCurveTo(logoX + logoWidth, logoY, logoX + logoWidth, logoY + radius);
    ctx.lineTo(logoX + logoWidth, logoY + logoHeight - radius);
    ctx.quadraticCurveTo(logoX + logoWidth, logoY + logoHeight, logoX + logoWidth - radius, logoY + logoHeight);
    ctx.lineTo(logoX + radius, logoY + logoHeight);
    ctx.quadraticCurveTo(logoX, logoY + logoHeight, logoX, logoY + logoHeight - radius);
    ctx.lineTo(logoX, logoY + radius);
    ctx.quadraticCurveTo(logoX, logoY, logoX + radius, logoY);
    ctx.closePath();
    ctx.clip();

    // Vẽ logo bên trong vùng bo góc
    ctx.shadowColor = "rgba(255, 165, 0, 0.6)";
    ctx.shadowBlur = 30;
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

    // Khôi phục lại canvas sau khi clip
    ctx.restore();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
} catch (e) {
    console.error("Không thể vẽ logo:", e);
}

    // --- PHẦN VẼ TÊN THÀNH VIÊN ---
    const fontSize = 90;
    const yPosition = 1490;
    ctx.font = `bold ${fontSize}px "${FONT_PROMPT}"`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(255, 165, 0, 0.8)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#FFFFFF";
    const nameText = names.map(n => n.toUpperCase()).join(" | ");
    ctx.fillText(nameText, canvas.width / 2, yPosition);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    return canvas.toBuffer('image/png');
}

module.exports = { render };