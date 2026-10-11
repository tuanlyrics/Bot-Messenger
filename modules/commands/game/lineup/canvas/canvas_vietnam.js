/**
 * @name canvas_vietnam
 * @description Layout Scrim (Nền Việt Nam) với tọa độ động cho các thành viên.
 * @author D-Jukie & Gemini & Pcoder (Chỉnh sửa bởi Gemini)
 */

const { loadImage, createCanvas } = require('canvas');

async function render({ teamSize, teamName, logoPath, names, playerImages, backgroundImagePath }) {
    // === KHỞI TẠO CANVAS ===
    const width = 5000;
    const height = 2500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // === VẼ ẢNH NỀN ===
    try {
        const backgroundImage = await loadImage(backgroundImagePath);
        ctx.drawImage(backgroundImage, 0, 0, width, height);
    } catch (e) {
        console.error("Lỗi khi tải ảnh nền:", e.message);
        // Vẽ nền đen nếu không có ảnh
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
    }

    // === VẼ LOGO TEAM ===
    const logoSize = 300;
    const logoX = 140;
    const logoY = 2080;
    try {
        const logoImage = await loadImage(logoPath);
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
    } catch (e) {
        console.error("Lỗi khi tải logo:", e.message);
    }

    // === VẼ TÊN TEAM ===
    ctx.font = 'bold 130px "Be Vietnam Pro"'; // Font chữ phù hợp với theme
    ctx.fillStyle = '#FFD700'; // Màu vàng gold
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    const teamNameX = logoX + logoSize + 40;
    const teamNameY = 2240;
    ctx.fillText(teamName.toUpperCase(), teamNameX, teamNameY);
    ctx.shadowColor = 'transparent'; // Reset bóng

    // === VẼ CÁC Ô THÀNH VIÊN VÀ TÊN ===
    let playerPositions = [];
    const cardWidth = 600;
    const cardHeight = 840;
    const initialY = 950;
    const nameOffsetY = cardHeight + 100;

    // Tọa độ đã được canh chỉnh dựa trên các ảnh bạn cung cấp
    switch (teamSize) {
        case 1:
            playerPositions = [
                { x: 2200, y: initialY }
            ];
            break;
        case 2:
            playerPositions = [
                { x: 1540, y: initialY },
                { x: 2860, y: initialY }
            ];
            break;
        case 3:
            playerPositions = [
                { x: 970, y: initialY },
                { x: 2200, y: initialY },
                { x: 3430, y: initialY }
            ];
            break;
        case 4:
            playerPositions = [
                { x: 680, y: initialY },
                { x: 1680, y: initialY },
                { x: 2680, y: initialY },
                { x: 3680, y: initialY }
            ];
            break;
        case 5:
        default:
            playerPositions = [
                { x: 250, y: initialY },
                { x: 1250, y: initialY },
                { x: 2250, y: initialY },
                { x: 3250, y: initialY },
                { x: 4250, y: initialY }
            ];
            break;
    }

    // Vòng lặp để vẽ từng thành viên
    for (let i = 0; i < teamSize; i++) {
        const pos = playerPositions[i];
        if (!pos) continue; // Bỏ qua nếu không có vị trí

        const name = (names[i] || "PLAYER").toUpperCase();
        
        // Vẽ ảnh người chơi
        if (playerImages && playerImages[i]) {
            try {
                const playerImage = await loadImage(playerImages[i]);
                ctx.drawImage(playerImage, pos.x, pos.y, cardWidth, cardHeight);
            } catch (e) {
                console.error(`Lỗi tải ảnh người chơi ${i + 1}:`, e.message);
                // Vẽ ô trống nếu ảnh lỗi
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(pos.x, pos.y, cardWidth, cardHeight);
            }
        }

        // Vẽ tên người chơi
        ctx.font = 'bold 80px "Be Vietnam Pro"';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.fillText(name, pos.x + cardWidth / 2, pos.y + nameOffsetY);
        ctx.shadowColor = 'transparent';
    }

    return canvas.toBuffer('image/png');
}

module.exports = { render };
