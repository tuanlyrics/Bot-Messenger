/**
 * @name canvas_naruto
 * @description Layout vẽ Bảng xếp hạng Naruto, tương thích với lệnh ffrank.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, topTeamsByGame, customName, customDate, customTime }) {
    ctx.textBaseline = 'middle';
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    // =======================================================
    //  KHU VỰC 1: THÔNG TIN CHUNG (GIỜ, NGÀY, TÊN GIẢI)
    // =======================================================
    const displayTime = customTime || '00:00';
    const displayDate = customDate || 'N/A';
    ctx.save();
    ctx.font = 'bold 125px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 50;
    ctx.fillText(`${displayTime} - ${displayDate}`, 220, 330);
    ctx.restore();

    const tournamentName = customName || 'PCODER';
    ctx.save();
    ctx.transform(1, 0, -0.3, 1, 0, 0); // Hiệu ứng nghiêng
    ctx.font = 'bold 30px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(tournamentName.toUpperCase(), 1600, 2014);
    ctx.restore();

    // =======================================================
    //  KHU VỰC 2: TOP 1
    // =======================================================
    const top1Team = rankedTeams[0];
    if (top1Team) {
        const top1LogoX = 685, top1LogoY = 672, top1LogoSize = 90;
        const top1NameX = 203, top1NameY = 845;
        const top1StatsY = 845, top1ElimX = 545, top1ByiX = 652, top1PtsX = 760;

        const logoToLoadPath = (top1Team.logoPath && fs.existsSync(top1Team.logoPath)) ? top1Team.logoPath : defaultLogoPath;
        try {
            const logoImage = await loadImage(logoToLoadPath);
            ctx.save();
            ctx.beginPath();
            ctx.arc(top1LogoX + top1LogoSize / 2, top1LogoY + top1LogoSize / 2, top1LogoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoImage, top1LogoX, top1LogoY, top1LogoSize, top1LogoSize);
            ctx.restore();
        } catch (e) { console.error("Lỗi vẽ logo TOP 1:", e); }

        ctx.save();
        ctx.font = 'bold 45px Anton'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 40;
        const teamNameText = top1Team.teamName || (top1Team.names && top1Team.names[0]) || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), top1NameX, top1NameY);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 45px Prompt'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 20;
        ctx.fillText(String(top1Team.totalKills || 0), top1ElimX, top1StatsY);
        ctx.fillText(String(top1Team.totalBooyahs || 0), top1ByiX, top1StatsY);
        ctx.fillText(String(top1Team.totalScore || 0), top1PtsX, top1StatsY);
        ctx.restore();
    }

    // =======================================================
    //  KHU VỰC 3: BẢNG XẾP HẠNG (#2 - #11)
    // =======================================================
    const teamsInTable = rankedTeams.slice(1, 12);
    const startY_Left = 985, rowHeight_Left = 75.7, logoX_Left = 140, logoSize_Left = 55, teamNameX_Left = logoX_Left + logoSize_Left + 10, elimX_Left = 545, byiX_Left = elimX_Left + 110, ptsX_Left = byiX_Left + 105;
    const startY_Right = 910, rowHeight_Right = 75.7, logoX_Right = 950, teamNameX_Right = logoX_Right + logoSize_Left + 10, elimX_Right = 1355, byiX_Right = elimX_Right + 110, ptsX_Right = byiX_Right + 110;

    for (let i = 0; i < teamsInTable.length; i++) {
        const team = teamsInTable[i];
        if (!team) continue;
        let currentY, logoX, logoSize, teamNameX, elimX, byiX, ptsX;

        if (i < 5) { // Cột trái #2 - #6
            currentY = startY_Left + i * rowHeight_Left;
            [logoX, logoSize, teamNameX, elimX, byiX, ptsX] = [logoX_Left, logoSize_Left, teamNameX_Left, elimX_Left, byiX_Left, ptsX_Left];
        } else { // Cột phải #7 - #11
            currentY = startY_Right + (i - 5) * rowHeight_Right;
            [logoX, logoSize, teamNameX, elimX, byiX, ptsX] = [logoX_Right, logoSize_Left, teamNameX_Right, elimX_Right, byiX_Right, ptsX_Right];
        }
        
        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        try {
            ctx.drawImage(await loadImage(logoToLoadPath), logoX, currentY - logoSize / 2, logoSize, logoSize);
        } catch (e) { console.error("Lỗi vẽ logo team:", e); }

        ctx.save();
        ctx.font = 'bold 30px Prompt'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
        ctx.shadowColor = '#ffba00'; ctx.shadowBlur = 12;
        const teamNameText = team.teamName || (team.names && team.names[0]) || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 35px Prompt'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12;
        ctx.fillText(String(team.totalKills || 0), elimX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), byiX, currentY);
        ctx.fillStyle = '#ffba00';
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
        ctx.restore();
    }

    // =======================================================
    //  KHU VỰC 4: TOP 1 CÁC TRẬN (BÊN DƯỚI)
    // =======================================================
    const gameLogoStartY = 1510, gameLogoStartX = 189.6, gameLogoSpacing = 290, gameLogoSize = 120;
    for (let i = 0; i < Math.min(topTeamsByGame.length, 5); i++) {
        const team = topTeamsByGame[i];
        if (!team) continue;
        const currentX = gameLogoStartX + (i * gameLogoSpacing);
        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;

        try {
            const logoImg = await loadImage(logoToLoadPath);
            ctx.drawImage(logoImg, currentX, gameLogoStartY, gameLogoSize, gameLogoSize);
        } catch (e) { console.error("Lỗi vẽ logo top game:", e); }

        ctx.save();
        ctx.transform(1, 0, -0.3, 1, 0, 0); // nghiêng qua phải
        ctx.font = 'bold 35px Anton';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 40;
        const teamNameText = team.name || "N/A";
        ctx.fillText(teamNameText.toUpperCase(), currentX + (gameLogoSize / 2) + gameLogoSize / 2 + 445, 1710);
        ctx.restore();
    }
    
    // Cuối cùng, trả về buffer của ảnh
    return canvas.toBuffer('image/png');
}

module.exports = {
    render
};