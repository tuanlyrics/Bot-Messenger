/**
 * @name canvas_standings_2
 * @description Layout Standings 2
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- CÁC HÀM HỖ TRỢ ---

function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width;
    if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

function getLogoForTeam(team) {
    const unitedLogoPath = path.join(__dirname, '..', 'cache', 'logo_united.png');
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');
    
    if (team && team.logoPath && fs.existsSync(team.logoPath)) return team.logoPath;
    if (team && team.teamName && team.teamName.toUpperCase() === 'UNITED') return unitedLogoPath;
    return defaultLogoPath;
}

// --- HÀM RENDER CHÍNH ---

async function render({ canvas, ctx, rankedTeams, customName, customDate }) {
    
    ctx.textBaseline = 'middle';

    // =======================================================
    //  KHU VỰC 1: NGÀY THÁNG
    // =======================================================
    if (customDate) {
        ctx.font = 'bold 46px Prompt-Bold';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(customDate, 1030, 618);
    }

    // =======================================================
    //  KHU VỰC 2: BẢNG XẾP HẠNG CHÍNH
    // =======================================================
    const startY = 774;
    const rowHeight = 84;
    const logoSize = 65;
    const fontSizeTeamName = 38;
    const fontSizeStats = 45;
    const maxTeamNameWidth = 650; 

    const logoX = 147;      
    const teamNameX = 240;   
    const booyahX = 940;     
    const elimsX = 1030;     
    const ptsX = 1115;       

    for (let i = 0; i < Math.min(rankedTeams.length, 12); i++) {
        const team = rankedTeams?.[i];
        if (!team) continue;

        const currentY = startY + (i * rowHeight);

        try {
            const logoImage = await loadImage(getLogoForTeam(team));
            ctx.drawImage(logoImage, logoX, currentY - logoSize / 2, logoSize, logoSize);
        } catch (e) {
            console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message);
        }

        // Tên đội
        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "N/A";
        const truncatedName = truncateText(ctx, teamNameText.toUpperCase(), maxTeamNameWidth);
        ctx.fillText(truncatedName, teamNameX, currentY);

        // Các chỉ số
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
    if (customName) {
        ctx.font = 'bold 42px Anton';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(customName.toUpperCase(), 720, 1790);
    }
    
    if (customName) {
        ctx.font = 'bold 42px Anton';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(customName.toUpperCase(), 720, 1856);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { render };