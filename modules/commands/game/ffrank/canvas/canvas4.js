/**
 * @name canvas4
 * @description Layout 4K Total Standings.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, topTeamsByGame }) {
    
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    // =======================================================
    //   KHU VỰC 1: TOP 3 (BÊN TRÁI)
    // =======================================================
    const top3Teams = rankedTeams.slice(0, 3);
    const top3Coords = [
        { y: 1400, logoSize: 160, textY: 1440 }, // Top 1
        { y: 1635, logoSize: 150, textY: 1685 }, // Top 2
        { y: 1880, logoSize: 150, textY: 1920 }  // Top 3
    ];

    for (let i = 0; i < top3Teams.length; i++) {
        const team = top3Teams[i];
        const coords = top3Coords[i];
        const currentY = coords.y;
        const textY = coords.textY;

        const logoX = 790; 
        const teamNameX = 980; 
        const killsX = 1615;
        const booyahX = 1890;
        const scoreX = 2165;

        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.drawImage(logo, logoX, currentY - coords.logoSize / 2 - 20, coords.logoSize, coords.logoSize);
            } catch (e) { console.error(`Lỗi vẽ logo top 3:`, e); }
        }

        ctx.font = `bold 70px Prompt`;
        ctx.fillStyle = (i === 0) ? '#000000' : '#FFFFFF'; // Top 1: đen, còn lại trắng
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || team.names[0] || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);

        ctx.font = `bold 100px RobotoSlab`;
        ctx.textAlign = 'center';
        ctx.fillStyle = (i === 0) ? '#000000' : '#FFFFFF'; // Top 1 đen, còn lại trắng
        ctx.fillText(String(team.totalKills || 0), killsX, textY);
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, textY);
        ctx.fillText(String(team.totalScore || 0), scoreX, textY);
    }

    // =======================================================
    //   KHU VỰC 2: BẢNG XẾP HẠNG CHÍNH (BÊN PHẢI)
    // =======================================================
    const remainingTeams = rankedTeams.slice(3, 12);
    const tableStartY = 740;
    const rowHeight = 165.5;

    for (let i = 0; i < remainingTeams.length; i++) {
        const team = remainingTeams[i];
        const currentY = tableStartY + (i * rowHeight);

        const logoX = 2655;
        const teamNameX = 2805;
        const killsX = 3533;
        const booyahX = 3840;
        const scoreX = 4190;

        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.drawImage(logo, logoX, currentY - 78, 120, 120);
            } catch (e) { console.error(`Lỗi vẽ logo bảng chính:`, e); }
        }
        
        ctx.font = `bold 60px Prompt`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || team.names[0] || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), teamNameX, currentY);

        ctx.font = `bold 70px Prompt`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(String(team.totalKills || 0), killsX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);

        ctx.fillStyle = '#d3a269';
        ctx.fillText(String(team.totalScore || 0), scoreX, currentY);
    }

    // =======================================================
    //   KHU VỰC 3: TOP 1 CÁC TRẬN (BÊN DƯỚI)
    // =======================================================
    const gameWinnerY = 2450;
    const gameWinnerCoordsX = [1300, 2080, 2840, 3640];

    if (Array.isArray(topTeamsByGame)) {
        for (let i = 0; i < Math.min(topTeamsByGame.length, 5); i++) {
            const winner = topTeamsByGame[i];
            if (!winner) continue;

            const teamName = winner.name || "N/A";
            const logoPath = winner.logoPath;
            const centerX = gameWinnerCoordsX[i];
            
            ctx.font = `bold 45px Prompt`;
            ctx.fillStyle = '#FFFFFF';
            
            const logoSize = 150;
            const spacing = 20;
            const textWidth = ctx.measureText(teamName.toUpperCase()).width;
            const totalWidth = logoSize + spacing + textWidth;
            
            const textX = centerX - (totalWidth / 2);
            const logoX = textX + textWidth + spacing;

            const logoToLoadPath = (logoPath && fs.existsSync(logoPath)) ? logoPath : defaultLogoPath;
            if (fs.existsSync(logoToLoadPath)) {
                try {
                    const logo = await loadImage(logoToLoadPath);
                    ctx.drawImage(logo, logoX, gameWinnerY - logoSize / 2, logoSize, logoSize);
                } catch (e) { console.error(`Lỗi vẽ logo top 5 game:`, e); }
            }

            ctx.textAlign = 'left';
            ctx.fillText(teamName.toUpperCase(), textX, gameWinnerY);
        }
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };
