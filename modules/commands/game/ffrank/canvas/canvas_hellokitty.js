/**
 * @name canvas_hellokitty
 * @description Layout Hello Kitty 
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- HÀM HỖ TRỢ ---
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
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');
    if (team && team.logoPath && fs.existsSync(team.logoPath)) {
        return team.logoPath;
    }
    return defaultLogoPath;
}

// --- HÀM RENDER CHÍNH ---
async function render({ canvas, ctx, rankedTeams, topTeamsByGame, customTime, customDate }) {

    ctx.textBaseline = 'middle';

    // =======================================================
    //  KHU VỰC 1: GIỜ VÀ NGÀY
    // =======================================================
    ctx.font = 'bold 100px Prompt-BoldItalic';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    // Vẽ giờ (dòng trên)
    if (customTime) {
        ctx.fillText(customTime.toUpperCase(), 1269, 725);
    }

    // Vẽ ngày (dòng dưới)
    if (customDate) {
        ctx.fillText(customDate.toUpperCase(), 1269, 822);
    }

    // =======================================================
    //  KHU VỰC 2: BẢNG XẾP HẠNG 2 CỘT (#1 - #12)
    // =======================================================
    const rowHeight = 288;
    const logoSize = 150;
    const fontSizeTeamName = 80;
    const fontSizeStats = 90;
    const maxTeamNameWidth = 700; // Giới hạn chiều rộng tên team

    const startY = 1257;
    // Cột trái
    const logoX_left = 250, teamNameX_left = 430, elimsX_left = 1210, booyahX_left = 1567, ptsX_left = 1843;
    // Cột phải
    const logoX_right = 2205, teamNameX_right = 2396, elimsX_right = 3176, booyahX_right = 3524, ptsX_right = 3803;

    const teamsToDisplay = rankedTeams.slice(0, 12);
    for (let i = 0; i < teamsToDisplay.length; i++) {
        const team = teamsToDisplay[i];
        if (!team) continue;

        let currentY, logoX, teamNameX, elimsX, booyahX, ptsX;

        if (i < 6) { // Cột trái
            currentY = startY + (i * rowHeight);
            logoX = logoX_left; teamNameX = teamNameX_left; elimsX = elimsX_left; booyahX = booyahX_left; ptsX = ptsX_left;
        } else { // Cột phải
            currentY = startY + ((i - 6) * rowHeight);
            logoX = logoX_right; teamNameX = teamNameX_right; elimsX = elimsX_right; booyahX = booyahX_right; ptsX = ptsX_right;
        }

        // Vẽ Logo
        const logoToLoadPath = getLogoForTeam(team);
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logoImage = await loadImage(logoToLoadPath);
                ctx.drawImage(logoImage, logoX, currentY - logoSize / 2, logoSize, logoSize);
            } catch (e) { console.error(`Lỗi vẽ logo team ${team.teamName}:`, e); }
        }

        // Vẽ Tên đội (canh trái)
        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "Đội Khách";
        const truncatedName = truncateText(ctx, teamNameText.toUpperCase(), maxTeamNameWidth);
        ctx.fillText(truncatedName, teamNameX, currentY);

        // Vẽ chỉ số (canh giữa)
        ctx.font = `bold ${fontSizeStats}px Prompt-Bold`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(String(team.totalKills || 0), elimsX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
    }
    
    // =======================================================
    //  KHU VỰC 3: BOOYAH! RECAP (BÊN DƯỚI)
    // =======================================================
    const recapLogoY = 3300;
    const recapLogoSize = 210;
    const recapNameY = recapLogoY + recapLogoSize / 2 + 55; // Điều chỉnh Y cho tên
    const recapNameFontSize = 50; // Tăng size chữ cho dễ đọc
    const recapLogoX = [514, 1528, 2540, 3546];

    if (topTeamsByGame && topTeamsByGame.length > 0) {
        for (let i = 0; i < Math.min(topTeamsByGame.length, 4); i++) {
            const team = topTeamsByGame[i];
            if (!team) continue;

            const currentLogoX = recapLogoX[i];
            const logoToLoadPath = getLogoForTeam(team);

            if (fs.existsSync(logoToLoadPath)) {
                try {
                    const logoImage = await loadImage(logoToLoadPath);
                    ctx.drawImage(logoImage, currentLogoX - recapLogoSize / 2, recapLogoY - recapLogoSize / 2, recapLogoSize, recapLogoSize);
                } catch (e) { console.error(`Lỗi vẽ logo Recap game ${i + 1}:`, e); }
            }
        }
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };