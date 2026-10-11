/**
 * @name canvas_ffws
 * @description Module vẽ layout cho FFWS. Tách ra từ lệnh ffrank.
 * @author Gemini
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- HÀM HELPER ---

/**
 * Vẽ chữ có viền.
 */
function drawTextWithStroke(ctx, text, x, y, strokeColor, textColor, lineWidth) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
}

/**
 * Cắt ngắn text nếu quá dài và thêm "..."
 */
function truncateText(ctx, text, maxWidth) {
    let width = ctx.measureText(text).width;
    if (width <= maxWidth) return text;
    while (width > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        width = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

// --- HÀM RENDER CHÍNH ---

/**
 * Hàm chính để vẽ toàn bộ layout lên canvas.
 * Nó nhận vào canvas, context, và dữ liệu đã được xử lý từ lệnh ffrank.
 * @param {object} params - Các tham số để vẽ.
 * @returns {Buffer} - Buffer ảnh PNG.
 */
async function render({ canvas, ctx, rankedTeams, customName, customDate, customTime }) {
    // Bọc toàn bộ logic trong try...catch để đảm bảo an toàn
    try {
        ctx.textBaseline = 'middle';
        const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

        const getLogoForTeam = (team) => {
            if (team && team.logoPath && fs.existsSync(team.logoPath)) {
                return team.logoPath;
            }
            return defaultLogoPath;
        };

        // --- TỌA ĐỘ VÀ STYLE CHO LAYOUT FFWS ---
        const leaderboard_startY = 612;
        const leaderboard_rowHeight = 110.7;
        const leaderboard_logoSize = 60;
        const leaderboard_logoX = 681;
        const leaderboard_teamNameX = 727;
        const leaderboard_booyahX = 1184;
        const leaderboard_elimX = 1310;
        const leaderboard_ptsX = 1437;
        const fontTeamName = 'bold 40px Anton';
        const fontStats = 'bold 55px teko';
        const defaultTextColor = '#ffffff';
        const top1TextColor = '#1a1a1a';
        const top2TextColor = '#1a1a1a';

        const fontdatetime = 'bold 50px Prompt';
        const fontcustom = 'bold 40px Prompt';
        const fonttime = 'bold 57px PromptExtraBoldItalic';
        const timeX = 248;
        const timeY = 1992;
        const colorTime = '#ffba00';
        const customNameX = 596;
        const customNameY = 2020;
        const colorCustomName = '#ffffff';
        const dateX = 1058;
        const dateY = 468;
        const colorDate = '#2e2f32';

        // --- LOGIC VẼ ---

        // VẼ BẢNG XẾP HẠNG (12 ĐỘI)
        // VẼ BẢNG XẾP HẠNG (12 ĐỘI)
for (let i = 0; i < Math.min((rankedTeams || []).length, 12); i++) {
    const team = rankedTeams[i];
    if (!team) continue;
    const currentY = leaderboard_startY + (i * leaderboard_rowHeight);

    // Vẽ logo
    try {
        const logoPath = getLogoForTeam(team);
        if (fs.existsSync(logoPath)) {
            const logoImage = await loadImage(logoPath);
            ctx.drawImage(logoImage, leaderboard_logoX - leaderboard_logoSize / 2, currentY - leaderboard_logoSize / 2, leaderboard_logoSize, leaderboard_logoSize);
        }
    } catch (e) {
        console.error(`[FFWS Canvas] Lỗi khi vẽ logo cho team ${team.teamName}:`, e.message);
    }
    
    // Đặt màu cho tên team Top 1 và Top 2
    const currentTextColor = (i === 0) ? top1TextColor : (i === 1) ? top2TextColor : defaultTextColor;
    ctx.fillStyle = currentTextColor;

    // --- [ĐOẠN CODE QUAN TRỌNG ĐÃ THAY ĐỔI] ---
    // Logic lấy tên team giống hệt canvas1.js
    let teamNameText = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "N/A");
    
    // Vẽ Tên Team
    ctx.font = fontTeamName;
    ctx.textAlign = 'left';
    const finalTeamName = truncateText(ctx, teamNameText.toUpperCase(), 400);
    ctx.fillText(finalTeamName, leaderboard_teamNameX, currentY);
    // --- [KẾT THÚC THAY ĐỔI] ---
    
    // Vẽ các chỉ số (luôn màu trắng)
    ctx.font = fontStats;
    ctx.textAlign = 'center';
    ctx.fillStyle = defaultTextColor;
    ctx.fillText(String(team.totalKills || 0), leaderboard_elimX, currentY);
    ctx.fillText(String(team.totalBooyahs || 0), leaderboard_booyahX, currentY);
    ctx.fillText(String(team.totalScore || 0), leaderboard_ptsX, currentY);
}
        // VẼ TEXT Ở CHÂN ẢNH VÀ ĐẦU ẢNH
        // Giờ (phía dưới)
        ctx.font = fonttime;
        ctx.fillStyle = colorTime;
        ctx.textAlign = 'center';
        ctx.fillText((customTime || '').toUpperCase(), timeX, timeY);

        // Tên custom (phía dưới)
        ctx.font = fontcustom;
        ctx.fillStyle = colorCustomName;
        ctx.textAlign = 'left';
        ctx.fillText((customName || '').toUpperCase(), customNameX, customNameY);

// Ngày và Giờ (phía trên)
ctx.font = fontdatetime;
ctx.textAlign = 'center';
ctx.fillStyle = colorDate;

// Kết hợp giờ và ngày thành một chuỗi duy nhất
const dateTimeString = `${customTime || ''} - ${customDate || ''}`;

// Vẽ chuỗi đã kết hợp ra ảnh
ctx.fillText(dateTimeString.toUpperCase().trim(), dateX, dateY);

    } catch (e) {
        console.error("[FFWS Canvas] Lỗi nghiêm trọng trong hàm render:", e);
    }
    
    // Luôn trả về một buffer để file lệnh chính không bị lỗi
    return canvas.toBuffer('image/png');
}

// Export hàm render để các file khác có thể gọi
module.exports = { render };