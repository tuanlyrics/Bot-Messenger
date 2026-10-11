const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const FONT_PROMPT = 'Prompt';
const FONT_SERIF = 'DejaVu Serif';
const FONT_ANTON = 'Anton';

async function render({ teamSize, teamName, logoPath, names, backgroundPath, totalKills }) {
    if (!fs.existsSync(backgroundPath)) {
        throw new Error(`Không tìm thấy ảnh nền ${path.basename(backgroundPath)}.`);
    }

    const background = await loadImage(backgroundPath);
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

// Tên team căn giữa dưới logo
ctx.font = `bold 100px "${FONT_SERIF}"`;
ctx.textAlign = 'center';
ctx.textBaseline = 'top';

const teamY = canvas.height - 1100; // Y của chữ team
const teamX = canvas.width / 2;    // X căn giữa

ctx.save();
ctx.translate(teamX, teamY);
ctx.shadowColor = 'rgba(128, 0, 128, 0.8)';
ctx.shadowBlur = 20;
ctx.fillText(teamName.toUpperCase(), 0, 0);
ctx.restore();
// vẽ logo
try {
    const logo = await loadImage(logoPath);
    const logoWidth = 350;
    const logoHeight = 350;

    const logoX = (canvas.width - logoWidth) / 2;
    const logoY = teamY - logoHeight - 40;

    const radius = 40; // Độ cong bo góc (bạn có thể chỉnh to/nhỏ)

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
    ctx.clip(); // Cắt theo vùng bo góc

    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore(); // Phục hồi clip cũ

} catch (e) {
    console.error("Không thể vẽ logo:", e);
}


    // Vẽ tổng số kill
    if (totalKills !== undefined) {
        ctx.font = `bold 100px "${FONT_ANTON}"`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'right';
        ctx.fillText(`${totalKills}`, canvas.width - 850, 1930);
    }

ctx.save(); // Lưu trạng thái gốc

ctx.transform(1, 0, -0.3, 1, 0, 0); // Skew chữ

const fontSize = 80;
const yPosition = 2350;
ctx.font = `bold ${fontSize}px "${FONT_ANTON}"`;
ctx.textAlign = "center";
ctx.fillStyle = "#FFFFFF";
ctx.shadowColor = "rgba(128, 0, 128, 0.8)";
ctx.shadowBlur = 20;

const nameText = names.map(n => n.toUpperCase()).join(" | ");
const letterSpacing = 10;

let offsetX = 800; // 👉 Tăng lên nếu chữ lệch trái do transform
let startX = (canvas.width - ctx.measureText(nameText).width - (nameText.length - 1) * letterSpacing) / 2 + offsetX;

for (let i = 0; i < nameText.length; i++) {
    const char = nameText[i];
    ctx.fillText(char, startX, yPosition);
    startX += ctx.measureText(char).width + letterSpacing;
}

ctx.restore(); // Trả trạng thái không nghiêng

// Reset shadow
ctx.shadowColor = "transparent";
ctx.shadowBlur = 0;

    return canvas.toBuffer('image/png');
}

module.exports = { render };
