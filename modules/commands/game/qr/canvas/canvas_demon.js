const { loadImage } = require('canvas');

async function render({ ctx, accountName, accountNo, qrImagePath }) {
// 1. Tải và vẽ mã QR nghiêng -13.8 độ
const qrImage = await loadImage(qrImagePath);

// Tọa độ và kích thước của ô trắng trong layout
const qrX = 157;
const qrY = 755;
const qrSize = 620;

ctx.save();
ctx.translate(qrX + qrSize / 2, qrY + qrSize / 2);
ctx.rotate(-13.8 * Math.PI / 180);

// Vẽ ô nền trắng nghiêng cùng QR
ctx.fillStyle = '#ffffff';
ctx.fillRect(-qrSize / 2, -qrSize / 2, qrSize, qrSize);

// Vẽ QR
ctx.drawImage(qrImage, -qrSize / 2, -qrSize / 2, qrSize, qrSize);

ctx.restore();


// 2. Cấu hình font chữ
ctx.font = 'bold 38px Prompt Extra Bold Italic';
ctx.fillStyle = '#FFFFFF'; // Chữ trắng

// Shadow cho chữ
ctx.shadowColor = 'rgba(0,0,0,0.6)';  // bóng đen mờ
ctx.shadowBlur = 12;                  // độ mờ bóng
ctx.shadowOffsetX = 4;                // lệch ngang
ctx.shadowOffsetY = 4;                // lệch dọc

// 3. Vẽ tên chủ tài khoản
const nameX = 1291;
const nameY = 1287;
ctx.textAlign = 'center';
ctx.fillText(accountName, nameX, nameY);

ctx.font = 'bold 55px Prompt Bold Italic';
ctx.fillStyle = '#FFFFFF'; // Chữ trắng

// 4. Vẽ số tài khoản
const stkX = 1533;
const stkY = 1456;
ctx.textAlign = 'center';
ctx.fillText(accountNo, stkX, stkY);

// Reset shadow (để không ảnh hưởng phần khác)
ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;

    // 5. Trả về buffer ảnh đã hoàn thành
    return ctx.canvas.toBuffer('image/png');
}

module.exports = { render };