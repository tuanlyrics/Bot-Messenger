/**
 * @name canvas_khaixuangiaochien
 * @description Layout Khai Xuân Giao Chiến - Cấu trúc giống canvas1
 * @version 3.0
 */

const { loadImage } = require('canvas');
const fs = require('fs');

// --- HÀM PHỤ TRỢ (GIỐNG CANVAS1.JS) ---
function drawTextWithStroke(ctx, text, x, y, strokeColor, textColor, lineWidth) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
}

function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width;
    if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

async function render({
    canvas, ctx, rankedTeams, defaultLogoPath, unitedLogoPath,
    dateText, gameWinners, scrimText,
    tournamentName, topTeamsByGame, customDate
}) {
    // --- XỬ LÝ DỮ LIỆU ĐẦU VÀO ---
    const finalDateText = dateText || customDate || '';
    const finalScrimText = scrimText || tournamentName || '';
    const finalGameWinners = gameWinners || (topTeamsByGame || []).map(team => team.name);

    // --- KHAI BÁO BIẾN TRỰC TIẾP (GIỐNG CANVAS1.JS) ---
    const header_font = 'bold 65px Prompt-Bold';
    const header_fillStyle = '#C13201';
    const header_x = 2580, header_y = 402;

    const top3_startY = 1430, top3_rowHeight = 240, top3_logoSize = 140;
    const top3_logoX = 780, top3_teamNameX = 980, top3_elimX = 1616;
    const top3_booyahX = 1889, top3_ptsX = 2163;
    const top3_fontTeamName = 'bold 65px Prompt-Bold';
    const top3_fontStats = 'bold 65px Robo';
    const top3_name_maxWidth = 550;
    const top3_stats_strokeColor = '#000000';
    const top3_stats_lineWidth = 5;
    const top3_colors = {
        1: { team: '#000000', stats: '#000000' },
        2: { team: '#FFFFFF', stats: '#FFFFFF' },
        3: { team: '#FFFFFF', stats: '#FFFFFF' }
    };

    const other_startY = 740, other_rowHeight = 168, other_logoSize = 87;
    const other_logoX = 2640, other_teamNameX = 2765, other_elimX = 3508;
    const other_booyahX = 3848, other_ptsX = 4184;
    const other_fontTeamName = 'bold 65px Prompt-Bold';
    const other_fontStats = 'bold 65px Robo';
    const other_fillStyle = '#FFFFFF';
    const other_name_maxWidth = 700;
    const other_stats_strokeColor = '#000000';
    const other_stats_lineWidth = 5;

    const booyah_font = 'bold 65px Prompt-Bold';
    const booyah_fillStyle = '#FFFFFF';
    const booyah_Y = 2500;
    const booyah_positionsX = [1240, 2070, 2860, 3680];
    
    const scrim_font = 'bold 55px Prompt-Bold';
    const scrim_fillStyle = '#FFFFFF';
    const scrim_x = 1050, scrim_y = 2096;
    
    // --- LOGIC VẼ ---
    ctx.textBaseline = 'middle';

    const getLogoForTeam = (team) => {
        if (team && team.logoPath && fs.existsSync(team.logoPath)) return team.logoPath;
        if (team && team.teamName && team.teamName.toUpperCase() === 'UNITED') return unitedLogoPath;
        return defaultLogoPath;
    };

    // Ngày tháng
    ctx.font = header_font;
    ctx.fillStyle = header_fillStyle;
    ctx.textAlign = 'center';
    ctx.fillText(finalDateText, header_x, header_y);

    // VẼ TOP 3 (Trái)
    for (let i = 0; i < 3; i++) {
        const team = rankedTeams?.[i];
        if (!team) continue;

        const currentY = top3_startY + (i * top3_rowHeight);
        const colors = top3_colors[i + 1];

        try {
            const logoImage = await loadImage(getLogoForTeam(team));
            ctx.drawImage(logoImage, top3_logoX, currentY - top3_logoSize / 2, top3_logoSize, top3_logoSize);
        } catch (e) { console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message); }

        ctx.font = top3_fontTeamName;
        ctx.fillStyle = colors.team;
        ctx.textAlign = 'left';
        let teamNameText = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "Đội Khách");
        ctx.fillText(truncateText(ctx, teamNameText.toUpperCase(), top3_name_maxWidth), top3_teamNameX, currentY);

        ctx.font = top3_fontStats;
        ctx.textAlign = 'center';
        drawTextWithStroke(ctx, String(team.totalKills || 0), top3_elimX, currentY, top3_stats_strokeColor, colors.stats, top3_stats_lineWidth);
        drawTextWithStroke(ctx, String(team.totalBooyahs || 0), top3_booyahX, currentY, top3_stats_strokeColor, colors.stats, top3_stats_lineWidth);
        drawTextWithStroke(ctx, String(team.totalScore || 0), top3_ptsX, currentY, top3_stats_strokeColor, colors.stats, top3_stats_lineWidth);
    }

    // VẼ TOP 4-12 (Phải)
    for (let i = 3; i < 12; i++) {
        const team = rankedTeams?.[i];
        if (!team) continue;

        const rowIndex = i - 3;
        const currentY = other_startY + (rowIndex * other_rowHeight);

        try {
            const logoImage = await loadImage(getLogoForTeam(team));
            ctx.drawImage(logoImage, other_logoX, currentY - other_logoSize / 2, other_logoSize, other_logoSize);
        } catch (e) { console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message); }

        ctx.font = other_fontTeamName;
        ctx.fillStyle = other_fillStyle;
        ctx.textAlign = 'left';
        let teamNameText = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "Đội Khách");
        ctx.fillText(truncateText(ctx, teamNameText.toUpperCase(), other_name_maxWidth), other_teamNameX, currentY);

        ctx.font = other_fontStats;
        ctx.textAlign = 'center';
        drawTextWithStroke(ctx, String(team.totalKills || 0), other_elimX, currentY, other_stats_strokeColor, other_fillStyle, other_stats_lineWidth);
        drawTextWithStroke(ctx, String(team.totalBooyahs || 0), other_booyahX, currentY, other_stats_strokeColor, other_fillStyle, other_stats_lineWidth);
        drawTextWithStroke(ctx, String(team.totalScore || 0), other_ptsX, currentY, other_stats_strokeColor, other_fillStyle, other_stats_lineWidth);
    }
    
    // VẼ TÊN ĐỘI BOOYAH
    ctx.font = booyah_font;
    ctx.fillStyle = booyah_fillStyle;
    ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
        const winnerName = (finalGameWinners[i] || "Đội Khách").toUpperCase();
        ctx.fillText(winnerName, booyah_positionsX[i], booyah_Y);
    }
    
    // VẼ TEXT SCRIM
    ctx.font = scrim_font;
    ctx.fillStyle = scrim_fillStyle;
    ctx.textAlign = 'left';
    ctx.fillText(finalScrimText.toUpperCase(), scrim_x, scrim_y);

    return canvas.toBuffer('image/png');
}

module.exports = { render };