/**
 * @name canvas_standings
 * @description Layout Standings 2024 + Ngày.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- HÀM HỖ TRỢ ---

// Hàm hỗ trợ để cắt ngắn text nếu quá dài
function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width;
    if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

// Hàm lấy đường dẫn logo, ưu tiên logo tùy chỉnh
function getLogoForTeam(team) {
    const unitedLogoPath = path.join(__dirname, '..', 'cache', 'logo_united.png');
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');
    
    if (team && team.logoPath && fs.existsSync(team.logoPath)) return team.logoPath;
    if (team && team.teamName && team.teamName.toUpperCase() === 'UNITED') return unitedLogoPath;
    return defaultLogoPath;
}


// --- HÀM RENDER CHÍNH ---

async function render({ canvas, ctx, rankedTeams, tournamentName, customDate, topTeamsByGame, timeRange, customName, customTime }) {
    
    ctx.textBaseline = 'middle';

    // =======================================================
    //  KHU VỰC 1: NGÀY THÁNG (GÓC TRÊN BÊN PHẢI)
    // =======================================================
    if (customDate) {
        ctx.font = 'bold 45px Prompt-Bold';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(customDate, 1478, 427);
    }

    // =======================================================
    //  KHU VỰC 2: BẢNG XẾP HẠNG CHÍNH (#1 - #12)
    // =======================================================
    const startY = 605;
    const rowHeight = 107;
    const logoSize = 80;
    const fontSizeTeamName = 40;
    const fontSizeStats = 52;
    const maxTeamNameWidth = 550; // Giới hạn chiều rộng tên team

    const logoX = 520;
    const teamNameX = 610;
    const booyahX = 1243;
    const elimsX = 1396;
    const ptsX = 1547;

    for (let i = 0; i < Math.min(rankedTeams.length, 12); i++) {
        const team = rankedTeams?.[i];
        if (!team) continue;

        const currentY = startY + (i * rowHeight);
        const logoToLoadPath = getLogoForTeam(team);
        
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logoImage = await loadImage(logoToLoadPath);
                ctx.drawImage(logoImage, logoX - logoSize / 2, currentY - logoSize / 2, logoSize, logoSize);
            } catch (e) {
                console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message);
            }
        }

        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        
        const teamNameText = team.teamName || (team.names && team.names[0]) || "N/A";
        const truncatedName = truncateText(ctx, teamNameText.toUpperCase(), maxTeamNameWidth);
        ctx.fillText(truncatedName, teamNameX - 20, currentY);

        ctx.font = `bold ${fontSizeStats}px Robo`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);
        ctx.fillText(String(team.totalKills || 0), elimsX, currentY);
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
    }

    // =======================================================
    //  KHU VỰC 3: TÊN GIẢI ĐẤU (Ở DƯỚI CÙNG)
    // =======================================================
    // Ưu tiên customName từ lệnh, nếu không có thì dùng tournamentName
    const finalTournamentName = customName || tournamentName;
    if (finalTournamentName) {
        ctx.font = 'bold 39px Prompt-BoldItalic';
        ctx.fillStyle = '#febe02';
        ctx.textAlign = 'left';
        ctx.fillText(finalTournamentName.toUpperCase(), 680, 1990);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { render };