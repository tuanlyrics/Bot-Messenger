/**
 * @name canvas_standings_left
 * @description Layout Standings 2024 - Căn lề trái.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- HÀM HỖ TRỢ ---

/**
 * Cắt ngắn văn bản nếu vượt quá chiều rộng cho phép.
 * @param {CanvasRenderingContext2D} ctx - Context của canvas.
 * @param {string} text - Văn bản cần vẽ.
 * @param {number} maxWidth - Chiều rộng tối đa.
 * @returns {string} Văn bản đã được cắt ngắn.
 */
function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width;
    if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

/**
 * Lấy đường dẫn logo cho một đội, ưu tiên logo tùy chỉnh.
 * @param {object} team - Đối tượng thông tin đội.
 * @returns {string} Đường dẫn đến file logo.
 */
function getLogoForTeam(team) {
    const unitedLogoPath = path.join(__dirname, '..', 'cache', 'logo_united.png');
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');
    
    if (team && team.logoPath && fs.existsSync(team.logoPath)) return team.logoPath;
    if (team && team.teamName && team.teamName.toUpperCase() === 'UNITED') return unitedLogoPath;
    return defaultLogoPath;
}


// --- HÀM RENDER CHÍNH ---

// [CHỈNH SỬA] Chuẩn hóa tham số đầu vào cho nhất quán
async function render({ canvas, ctx, rankedTeams, tournamentName, customDate, customName, topTeamsByGame, timeRange, customTime }) {
    
    ctx.textBaseline = 'middle';

    // =======================================================
    //  KHU VỰC 1: NGÀY THÁNG
    // =======================================================
    if (customDate) {
        ctx.font = 'bold 45px Prompt';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(customDate, 1043, 484);
    }

    // =======================================================
    //  KHU VỰC 2: BẢNG XẾP HẠNG CHÍNH
    // =======================================================
    const startY = 663;
    const rowHeight = 107;
    const logoSize = 75;
    const fontSizeTeamName = 38;
    const fontSizeStats = 50;
    const maxTeamNameWidth = 600; 

    const logoX = 168;      
    const teamNameX = 267;  
    const booyahX = 920;    
    const elimsX = 1080;     
    const ptsX = 1235;      

    for (let i = 0; i < Math.min(rankedTeams.length, 12); i++) {
        const team = rankedTeams?.[i];
        if (!team) continue;

        const currentY = startY + (i * rowHeight);
        const logoToLoadPath = getLogoForTeam(team);
        
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logoImage = await loadImage(logoToLoadPath);
                ctx.drawImage(logoImage, logoX, currentY - logoSize / 2, logoSize, logoSize);
            } catch (e) {
                console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message);
            }
        }

        // Vẽ tên đội (canh trái)
        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "N/A";
        const truncatedName = truncateText(ctx, teamNameText.toUpperCase(), maxTeamNameWidth);
        ctx.fillText(truncatedName, teamNameX, currentY);

        // Vẽ các chỉ số (canh giữa)
        ctx.font = `bold ${fontSizeStats}px Robo`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);
        ctx.fillText(String(team.totalKills || 0), elimsX, currentY);
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
    }

    // =======================================================
    //  KHU VỰC 3: TÊN GIẢI ĐẤU
    // =======================================================
    const finalTournamentName = customName || tournamentName;
    if (finalTournamentName) {
        ctx.font = 'bold 39px Prompt-BoldItalic';
        ctx.fillStyle = '#febe02';
        ctx.textAlign = 'left';
        ctx.fillText(finalTournamentName.toUpperCase(), 675, 1990);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { render };