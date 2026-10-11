/**
 * @name canvas2
 * @description Layout Xanh - Đã tích hợp đầy đủ thông tin.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width; if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

async function render({ canvas, ctx, rankedTeams, topTeamsByGame, timeRange, customName, customDate, customTime }) {
    
    // --- Dữ liệu an toàn ---
    const safeTopTeams = Array.isArray(topTeamsByGame) ? topTeamsByGame : [];
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    // =======================================================
    //   KHU VỰC 1: BẢNG XẾP HẠNG CHÍNH
    // =======================================================
    const tableStartY = 510;
    const rowHeight = 120;
    const maxTeams = 12;
    const colTeamName = 1050; 
    const colBooyah = 1880; 
    const colScore = 140 + colBooyah;
    const colKills = 130 + colScore;

    for (let i = 0; i < Math.min(rankedTeams.length, maxTeams); i++) {
        const team = rankedTeams[i];
        const currentY = tableStartY + (i * rowHeight);

        // Vẽ Logo
        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.drawImage(logo, colTeamName - 123, currentY - 45, 90, 90);
            } catch (e) { console.error(`Lỗi vẽ logo cho ${team.teamName}:`, e); }
        }

        // Vẽ Tên đội
        ctx.font = `bold 50px Prompt`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        const teamNameText = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "Đội Khách");
        ctx.fillText(truncateText(ctx, teamNameText.toUpperCase(), 500), colTeamName, currentY + 20);

        // Vẽ các chỉ số
        ctx.font = `bold 55px RobotoSlab`;
        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#000000';
        ctx.fillText(String(team.totalBooyahs || 0), colBooyah, currentY + 20);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(String(team.totalScore || 0), colScore, currentY + 20);

        ctx.fillStyle = '#000000';
        ctx.fillText(String(team.totalKills || 0), colKills, currentY + 20);
    }


    // =======================================================
    //   KHU VỰC 2: THÔNG TIN TÙY CHỈNH (GÓC DƯỚI)
    // =======================================================
    ctx.font = `bold 50px Prompt`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(customTime || '20:00', 60, canvas.height - 30);

    ctx.font = `bold 60px Prompt`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    const finalCustomName = customName || 'Pcoder';
    ctx.fillText(finalCustomName, 640, canvas.height - 28);
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };
