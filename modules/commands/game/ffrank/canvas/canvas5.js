/**
 * @name canvas5
 * @description Layout Hồng 4K.
 * @author D-Jukie & Gemini & Pcoder
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, topTeamsByGame, customDate }) {
    
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    // =======================================================
    //   KHU VỰC 1: TOP 1 (BÊN TRÁI)
    // =======================================================
    const top1Team = rankedTeams[0];
    if (top1Team) {
        const teamNameY = 1685, logoY = 2250, booyahY = 1960, statsY = 2260;
        const logoX = 225, teamNameX = 680, booyahX = 1650, elimsX = 1070, ptsX = 1640;
        const logoSize = 370;

        const logoToLoadPath = (top1Team.logoPath && fs.existsSync(top1Team.logoPath)) ? top1Team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.save();
                ctx.beginPath();
                ctx.arc(logoX + logoSize / 2, logoY - logoSize / 2, logoSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(logo, logoX, logoY - logoSize, logoSize, logoSize);
                ctx.restore();
            } catch (e) { console.error(`Lỗi vẽ logo Top 1:`, e); }
        }

        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.font = `bold 100px PromptExtraBoldItalic`;
        ctx.fillStyle = '#fc4175';
        ctx.textAlign = 'center';
        const teamNameText = top1Team.teamName || top1Team.names[0] || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, teamNameY);

        ctx.font = `bold 150px PromptExtraBoldItalic`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${top1Team.totalBooyahs || 0}`, booyahX, booyahY);

        ctx.font = `bold 110px PromptExtraBoldItalic`;
        ctx.fillText(String(top1Team.totalKills || 0), elimsX, statsY);
        ctx.fillText(String(top1Team.totalScore || 0), ptsX, statsY);

        ctx.shadowColor = 'transparent';
    }

    // =======================================================
    //   KHU VỰC 2: BẢNG XẾP HẠNG CHÍNH (#2 - #11)
    // =======================================================
    const remainingTeams = rankedTeams.slice(1, 12);
    const tableStartY = 720;
    const rowHeight = 135;

    for (let i = 0; i < remainingTeams.length; i++) {
        const team = remainingTeams[i];
        const currentY = tableStartY + (i * rowHeight);

        const teamNameX = 2300;
        const elimsX = 3060;
        const booyahX = 3360;
        const ptsX = 3590;
        
        const logoSize = 80;
        const logoX = teamNameX - logoSize - 30;
        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.drawImage(logo, logoX, currentY - logoSize / 2 - 20, logoSize, logoSize);
            } catch (e) { console.error(`Lỗi vẽ logo bảng chính:`, e); }
        }
        
        ctx.font = `bold 60px PromptExtraBoldItalic`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || team.names[0] || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);

ctx.font = `bold 70px PromptExtraBoldItalic`;
ctx.textAlign = 'center';

// Màu trắng cho kills và booyah
ctx.fillStyle = '#FFFFFF';
ctx.fillText(String(team.totalKills || 0), elimsX, currentY);
ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);

// Màu vàng riêng cho điểm số
ctx.fillStyle = '#fdc915';
ctx.fillText(String(team.totalScore || 0), ptsX, currentY);

    }

    // =======================================================
    //   KHU VỰC 3: TOP 1 CÁC TRẬN (BÊN PHẢI)
    // =======================================================
    if (Array.isArray(topTeamsByGame)) {
        const winner1 = topTeamsByGame[0];
        if (winner1) {
            const teamName = winner1.name || "N/A";
            const logoPath = winner1.logoPath;
            const y = 2430;
            const centerX = 2800;
            ctx.font = `bold 70px Prompt`;
            ctx.fillStyle = '#FFFFFF';
            const logoSize = 175;
            const spacing = 65;
            const textWidth = ctx.measureText(teamName.toUpperCase()).width;
            const totalWidth = textWidth + spacing + logoSize;
            const textX = centerX - (totalWidth / 2);
            const logoX = textX + textWidth + spacing;
            const logoY = y - logoSize / 2 - 85;
            const logoToLoadPath = (logoPath && fs.existsSync(logoPath)) ? logoPath : defaultLogoPath;
            if (fs.existsSync(logoToLoadPath)) {
                try {
                    const logo = await loadImage(logoToLoadPath);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                    ctx.restore();
                } catch (e) { console.error(`Lỗi vẽ logo Game 1:`, e); }
            }
            ctx.textAlign = 'left';
            ctx.fillText(teamName.toUpperCase(), textX, y);
        }

        const recapY = [1130, 1490, 1815, 2170];
        for (let i = 1; i < Math.min(topTeamsByGame.length, 5); i++) {
            const winner = topTeamsByGame[i];
            if (!winner) continue;
            const teamName = winner.name || "N/A";
            const currentY = recapY[i - 1];
            const textX = 4130;
            const logoSize = 130;
            const logoX = textX + 300;
            const logoToLoadPath = (winner.logoPath && fs.existsSync(winner.logoPath)) ? winner.logoPath : defaultLogoPath;
            if (fs.existsSync(logoToLoadPath)) {
                try {
                    const logo = await loadImage(logoToLoadPath);
                    ctx.drawImage(logo, logoX, currentY - logoSize / 2 - 45, logoSize, logoSize);
                } catch (e) { console.error(`Lỗi vẽ logo recap:`, e); }
            }
            ctx.font = `bold 70px Prompt`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.fillText(teamName.toUpperCase(), textX, currentY);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 2;
            ctx.strokeText(teamName.toUpperCase(), textX, currentY);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }

    // =======================================================
    //   KHU VỰC 4: THÔNG TIN TÙY CHỈNH (BÊN DƯỚI)
    // =======================================================
    ctx.font = `bold 90px Prompt`;
    ctx.fillStyle = '#fc4075';
    ctx.textAlign = 'center';
    ctx.fillText(`CUSTOM NGÀY ${customDate}`, 2393, 2610);
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };
