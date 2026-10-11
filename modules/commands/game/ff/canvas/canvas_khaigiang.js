/**
 * @name canvas_khaigiang
 * @description Layout Khai Giảng, tương thích với lệnh ff.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, topTeamsByGame, customName, customDate, customTime }) {
    ctx.textBaseline = 'middle';
    
    // Đường dẫn tới cache, điều chỉnh cho đúng với cấu trúc module
    const cacheDir = path.join(__dirname, '..', 'cache');
    const unitedLogoPath = path.join(cacheDir, 'logo_united.png');
    const defaultLogoPath = path.join(cacheDir, 'default_logo.png');

    const getLogoForTeam = (team) => {
        if (team.logoPath && fs.existsSync(team.logoPath)) return team.logoPath;
        if (team.teamName && team.teamName.toUpperCase() === 'UNITED') return unitedLogoPath;
        return defaultLogoPath;
    };

    // =======================================================
    //  KHU VỰC 1: TÊN GIẢI ĐẤU (Lấy từ customName)
    // =======================================================
    const tournamentName = customName || 'Pcoder';
    ctx.font = 'bold 60px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(tournamentName.toUpperCase(), 2652, 2561);

    // =======================================================
    //  KHU VỰC 2: TOP 1 (GÓC DƯỚI BÊN TRÁI)
    // =======================================================
    const top1Team = rankedTeams[0];
    if (top1Team) {
        const logoX = 250, logoY = 1860, logoSize = 350;
        const teamNameX = 622, teamNameY = 1609;
        const booyahX = 1652, booyahY = 1930;
        const elimsX = 1078, ptsX = 1652, statsY = 2200;

        try {
            const logoImage = await loadImage(getLogoForTeam(top1Team));
            ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        } catch (e) { console.error("Lỗi vẽ logo Top 1:", e.message); }

        ctx.font = 'bold 115px Prompt-BoldItalic';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        const teamNameText1 = top1Team.teamName || (top1Team.names && top1Team.names[0]) || "N/A";
        ctx.fillText(teamNameText1.toUpperCase(), teamNameX, teamNameY);

        ctx.font = 'bold 120px Prompt-BoldItalic';
        ctx.textAlign = 'center';
        ctx.fillText(String(top1Team.totalBooyahs || 0), booyahX, booyahY);
        
        ctx.font = 'bold 100px Prompt-BoldItalic';
        ctx.textAlign = 'center';
        ctx.fillText(String(top1Team.totalKills || 0), elimsX, statsY);
        ctx.fillText(String(top1Team.totalScore || 0), ptsX, statsY);
    }
    
    // =======================================================
    //  KHU VỰC 3: BẢNG XẾP HẠNG CHÍNH (#2 - #12)
    // =======================================================
    const teamsInTable = rankedTeams.slice(1, 12);
    const startY = 735;
    const rowHeight = 155;
    const logoX = 2198, logoSize = 100;
    const teamNameX = 2360;
    const elimsColX = 3135, booyahColX = 3439, ptsColX = 3716;

    for (let i = 0; i < teamsInTable.length; i++) {
        const team = teamsInTable[i];
        if (!team) continue;
        const currentY = startY + (i * rowHeight);

        try {
            const logoImage = await loadImage(getLogoForTeam(team));
            ctx.drawImage(logoImage, logoX, currentY - logoSize / 2, logoSize, logoSize);
        } catch (e) { console.error("Lỗi vẽ logo BXH:", e.message); }

        ctx.font = '60px Prompt';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "N/A";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);

        ctx.font = 'bold 85px Robo';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF'; // Reset màu về trắng cho Kills và Booyahs
        ctx.fillText(String(team.totalKills || 0), elimsColX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), booyahColX, currentY);
        ctx.fillStyle = '#fdc915'; // Màu vàng cho điểm
        ctx.fillText(String(team.totalScore || 0), ptsColX, currentY);
    }

    // =======================================================
    //  KHU VỰC 4: BOOYAH! RECAP (BÊN PHẢI)
    // =======================================================
    const recapStartY = 1010;
    const recapRowHeight = 306;
    const winnerNameX = 4267;
    const winnerLogoX = 4520, winnerLogoSize = 145;

    for (let i = 0; i < 4; i++) {
        const team = topTeamsByGame[i];
        if (!team) continue;
        const currentY = recapStartY + (i * recapRowHeight);
        
        ctx.font = '50px Prompt';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        const winnerName = team.name || (team.teamName || "N/A");
        ctx.fillText(winnerName.toUpperCase(), winnerNameX, currentY + 40);

        try {
            const logoImage = await loadImage(getLogoForTeam(team));
            ctx.drawImage(logoImage, winnerLogoX, currentY - winnerLogoSize / 2, winnerLogoSize, winnerLogoSize);
        } catch (e) { console.error("Lỗi vẽ logo Recap:", e.message); }
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = {
    render
};