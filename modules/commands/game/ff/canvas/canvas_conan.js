/**
 * @name canvas_conan
 * @description Layout Conan, đã được chuẩn hóa cấu trúc.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, topTeamsByGame, customName, customDate, customTime }) {
    ctx.textBaseline = 'middle';

    const cacheDir = path.join(__dirname, '..', 'cache');
    const unitedLogoPath = path.join(cacheDir, 'logo_united.png');
    const defaultLogoPath = path.join(cacheDir, 'default_logo.png');

    // --- Hàm tiện ích chọn logo ---
    const getLogoForTeam = (team) => {
        if (team.logoPath && fs.existsSync(team.logoPath)) {
            return team.logoPath;
        }
        // Giả sử chỉ có layout Conan mới có team đặc biệt 'UNITED'
        if (team.teamName && team.teamName.toUpperCase() === 'UNITED') {
            return unitedLogoPath;
        }
        return defaultLogoPath;
    };

    // =======================================================
    //  KHU VỰC 1: THÔNG TIN CHUNG (GIỜ, NGÀY, TÊN GIẢI)
    // =======================================================
    const timeRange = `${customTime || '00:00'} - ${customDate || 'DD/MM'}`;
    ctx.save();
    ctx.font = 'bold 40px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(timeRange, 910, 206);
    ctx.restore();
    
    const tournamentName = customName || 'Pcoder';
    ctx.save();
    ctx.transform(1, 0, -0.3, 1, 0, 0); 
    ctx.font = 'bold 30px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(tournamentName.toUpperCase(), 1570, 2014);
    ctx.restore();

    // =======================================================
    //  KHU VỰC 2: TOP 1
    // =======================================================
    const top1Team = rankedTeams[0];
    if (top1Team) {
        const top1LogoX = 675, top1LogoY = 665, top1LogoSize = 90;
        const top1NameX = 203, top1NameY = 848;
        const top1StatsY = 840, top1ElimX = 535, top1ByiX = 644, top1PtsX = 752;

        const logoToLoadPath = getLogoForTeam(top1Team);
        try {
            const logoImage = await loadImage(logoToLoadPath);
            ctx.drawImage(logoImage, top1LogoX, top1LogoY, top1LogoSize, top1LogoSize);
        } catch (e) { console.error(`Lỗi vẽ logo top 1: ${e.message}`); }

        ctx.save();
        ctx.font = 'bold 45px Anton';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = top1Team.teamName || (top1Team.names && top1Team.names[0]) || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), top1NameX, top1NameY);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 45px Prompt';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(String(top1Team.totalKills || 0), top1ElimX, top1StatsY);
        ctx.fillText(String(top1Team.totalBooyahs || 0), top1ByiX, top1StatsY);
        ctx.fillText(String(top1Team.totalScore || 0), top1PtsX, top1StatsY);
        ctx.restore();
    }
    
    // =======================================================
    //  KHU VỰC 3: BẢNG XẾP HẠNG (#2 - #12)
    // =======================================================
    const teamsInTable = rankedTeams.slice(1, 12);
    const startY_Left = 982, rowHeight_Left = 75.7, logoX_Left = 130, logoSize_Left = 55, teamNameX_Left = logoX_Left + logoSize_Left + 10, elimX_Left = 535, byiX_Left = elimX_Left + 110, ptsX_Left = byiX_Left + 105;
    const startY_Right = 842, rowHeight_Right = 73.7, logoX_Right = 940, teamNameX_Right = logoX_Right + logoSize_Left + 10, elimX_Right = 1345, byiX_Right = elimX_Right + 110, ptsX_Right = byiX_Right + 110;

    for (let i = 0; i < teamsInTable.length; i++) {
        const team = teamsInTable[i];
        if (!team) continue;

        let currentY, logoX, logoSize, teamNameX, elimX, byiX, ptsX;
        if (i < 5) {
            currentY = startY_Left + i * rowHeight_Left;
            [logoX, logoSize, teamNameX, elimX, byiX, ptsX] = [logoX_Left, logoSize_Left, teamNameX_Left, elimX_Left, byiX_Left, ptsX_Left];
        } else {
            currentY = startY_Right + (i - 5 + 1) * rowHeight_Right;
            [logoX, logoSize, teamNameX, elimX, byiX, ptsX] = [logoX_Right, logoSize_Left, teamNameX_Right, elimX_Right, byiX_Right, ptsX_Right];
        }

        const logoToLoadPath = getLogoForTeam(team);
        try {
            ctx.drawImage(await loadImage(logoToLoadPath), logoX, currentY - logoSize / 2, logoSize, logoSize);
        } catch (e) { console.error(`Lỗi vẽ logo team BXH: ${e.message}`); }

        ctx.save();
        ctx.font = 'bold 30px Prompt';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 35px Prompt';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(String(team.totalKills || 0), elimX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), byiX, currentY);
        ctx.fillStyle = '#ffba00';
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
        ctx.restore();
    }

    // =======================================================
    //  KHU VỰC 4: TOP 1 CÁC TRẬN (BÊN DƯỚI)
    // =======================================================
    const gameLogoStartY = 1510, gameLogoStartX = 184.6, gameLogoSpacing = 287, gameLogoSize = 120;
    for (let i = 0; i < Math.min(topTeamsByGame.length, 5); i++) {
        const team = topTeamsByGame[i];
        if (!team) continue;

        const currentX = gameLogoStartX + (i * gameLogoSpacing);
        const logoToLoadPath = getLogoForTeam(team);
        try {
            const logoImg = await loadImage(logoToLoadPath);
            ctx.drawImage(logoImg, currentX, gameLogoStartY, gameLogoSize, gameLogoSize);
        } catch (e) { console.error(`Lỗi vẽ logo top game: ${e.message}`); }

        ctx.save();
        ctx.transform(1, 0, -0.3, 1, 0, 0);
        ctx.font = 'bold 35px Anton';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        const teamNameText = team.name || "N/A";
        ctx.fillText(teamNameText.toUpperCase(), currentX + (gameLogoSize / 2) + gameLogoSize / 2 + 445, 1710);
        ctx.restore();
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = {
    render
};