/**
 * @name canvas1
 * @description Layout Tết - Đã tích hợp đầy đủ thông tin.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawTextWithStroke(ctx, text, x, y, strokeColor, textColor, lineWidth) {
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = textColor; ctx.fillText(text, x, y);
}

function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width; if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

async function render({ canvas, ctx, rankedTeams, topTeamsByGame, selectedTimeLabel, timeRange, customName, customDate, customTime }) {
    
    const safeTimeRange = timeRange || 'N/A | N/A';
    const safeTopTeams = Array.isArray(topTeamsByGame) ? topTeamsByGame : [];

    const dateInfo = safeTimeRange.split(' | ')[1];
    ctx.font = `bold 90px Prompt`; ctx.textAlign = 'center'; ctx.fillStyle = "#c13201";
    ctx.fillText(`CUSTOM ${dateInfo.toUpperCase()}`, 1850, 795);

    const tableStartY = 530, rowHeight = 189, maxTeams = 12;
    const offsetX = 1350, offsetXX = 1730;
    const colTeamName = 740 + offsetX;
    const colElims = 1300 + offsetXX;
    const colBooyah = colElims + 400;
    const colPts = colBooyah + 330;
    const numberOffsetY = 765;
    
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    for (let i = 0; i < Math.min(rankedTeams.length, maxTeams); i++) {
        const team = rankedTeams[i];
        const currentY = tableStartY + (i * rowHeight);
        if (team.logoPath && fs.existsSync(team.logoPath)) {
            try {
                const logo = await loadImage(team.logoPath);
                ctx.drawImage(logo, colTeamName - 140, currentY + numberOffsetY - 60, 120, 120);
            } catch (e) { console.error(`Lỗi vẽ logo cho ${team.teamName}:`, e); }
        }
        ctx.font = `bold 75px Prompt`; ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
        let teamNameText = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "Đội Khách");
        ctx.fillText(truncateText(ctx, teamNameText.toUpperCase(), 500), colTeamName, currentY + numberOffsetY + 10);
        
        ctx.font = `bold 95px RobotoSlab`; ctx.textAlign = 'center';
        drawTextWithStroke(ctx, String(team.totalKills || 0), colElims, currentY + numberOffsetY + 10, '#4D1F0C', '#FFFFFF', 8);
        drawTextWithStroke(ctx, String(team.totalBooyahs || 0), colBooyah, currentY + numberOffsetY + 10, '#4D1F0C', '#FFFFFF', 8);
        drawTextWithStroke(ctx, String(team.totalScore || 0), colPts, currentY + numberOffsetY + 10, '#4D1F0C', '#FFFFFF', 8);
    }
    
    ctx.font = "bold 80px 'Prompt'";
    ctx.fillStyle = '#FFFFFF';
    const top1Coords = [ { y: 1300 }, { y: 1800 }, { y: 2300 }, { y: 2800 }, { y: 3280 } ];
    
    for (let i = 0; i < Math.min(safeTopTeams.length, 5); i++) {
        const winner = safeTopTeams[i];
        const teamName = winner ? winner.name || "N/A" : "N/A";
        const logoPath = winner ? winner.logoPath : null;
        const currentY = top1Coords[i].y;
        const centerX = 1000;
        const logoSize = 210;
        const spacing = 25;
        const textWidth = ctx.measureText(teamName.toUpperCase()).width;
        const totalWidth = logoSize + spacing + textWidth;
        const textX = centerX - (totalWidth / 2);
        const logoX = textX + textWidth + spacing;
        const logoToLoadPath = (logoPath && fs.existsSync(logoPath)) ? logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.drawImage(logo, logoX, currentY - logoSize / 2 - 50, logoSize, logoSize);
            } catch (e) { console.error(`Lỗi vẽ logo top 5 game:`, e); }
        }
        ctx.textAlign = 'left';
        ctx.fillText(teamName.toUpperCase(), textX, currentY);
    }

    // --- [CẬP NHẬT] --- Thay thế bằng code mới của bạn ---
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.font = "bold 200px 'Prompt'";
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(customTime || '20:00', 130, canvas.height - 330);

    ctx.font = "bold 150px 'Prompt'";
    ctx.fillText(customDate || 'N/A', 240, canvas.height - 120);

    const finalCustomName = customName || 'Pcoder';
    ctx.font = "bold 100px 'Prompt'";
    ctx.fillText(finalCustomName, 1200, canvas.height - 140);
    
    ctx.restore(); // Khôi phục lại trạng thái không có shadow
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };
