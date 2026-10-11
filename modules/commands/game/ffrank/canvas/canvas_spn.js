/**
 * @name canvas_spn
 * @description Layout SPN Team Scrim - Tùy chỉnh theo yêu cầu.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, dateText, tournamentName }) {
    // Gán giá trị mặc định để tránh lỗi 'undefined'
    const finalTournamentName = tournamentName || 'SPN TEAM';
    const finalDateText = dateText || '';

    ctx.textBaseline = 'middle';

    // =======================================================
    //  KHU VỰC 0: TÊN GIẢI ĐẤU
    // =======================================================
    ctx.font = 'bold 60px Prompt-Bold';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(finalTournamentName.toUpperCase(), 2810, 2370);

    // =======================================================
    //  KHU VỰC 1: THÔNG TIN NGÀY/VÒNG ĐẤU
    // =======================================================
    ctx.font = 'bold 90px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(finalDateText.replace(/_/g, " ").toUpperCase(), 2813, 655);

    // =======================================================
    //  KHU VỰC 2: BẢNG XẾP HẠNG 2 CỘT (#1 - #12)
    // =======================================================
    const rowHeight = 211;
    const fontSizeTeamName = 47;
    const fontSizeStats = 75;
    const startY = 1022;
    const logoSize = 80;

    const logoX_left = 1380, teamNameX_left = 1500, elimsX_left = 1911, booyahX_left = 2100, ptsX_left = 2282;
    const logoX_right = 2635, teamNameX_right = 2755, elimsX_right = 3166, booyahX_right = 3363, ptsX_right = 3545;

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
        
        if (team.logoPath && fs.existsSync(team.logoPath)) {
            try {
                const logo = await loadImage(team.logoPath);
                ctx.drawImage(logo, logoX, currentY - logoSize / 2, logoSize, logoSize);
            } catch (e) { console.error(`Lỗi khi tải logo cho đội ${team.teamName}:`, e); }
        }
        
        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);

        ctx.font = `bold ${fontSizeStats}px Robo`;
        ctx.textAlign = 'center';
        ctx.fillText(String(team.totalKills || 0), elimsX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };