/**
 * @name canvas_dcqb
 * @description Layout DCQB - Đã chỉnh sửa theo cấu trúc canvas1.
 * @author D-Jukie & Gemini
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Hàm render đã được sửa lỗi
async function render({ canvas, ctx, rankedTeams, tournamentName, dateText, customDate, customName }) {
    ctx.textBaseline = 'middle';

    // Sửa lỗi: Ghi trực tiếp tên file thay vì nhận tham số
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    // =======================================================
    //  KHU VỰC 1: TÊN GIẢI ĐẤU / THÔNG TIN
    // =======================================================
    let info1 = "";
    if (dateText) {
        const firstSpaceIndex = dateText.indexOf(' ');
        if (firstSpaceIndex !== -1) {
            info1 = dateText.substring(0, firstSpaceIndex);
        } else {
            info1 = dateText;
        }
    }
    
    // Vẽ Ngày
    ctx.font = 'bold 130px Prompt-Bold';
    ctx.fillStyle = '#f7d25a';
    ctx.textAlign = 'center';
    ctx.fillText(customDate || 'N/A', 2244, 653);

    // Vẽ Tên Giải Đấu
    const finalCustomName = customName || 'Pcoder';
    ctx.font = 'bold 80px Prompt-BoldItalic';
    ctx.fillStyle = '#cf1f2b';
    ctx.textAlign = 'center';
    ctx.fillText(finalCustomName.toUpperCase(), 1850, 2456);


    // =======================================================
    //  KHU VỰC 2: BẢNG XẾP HẠNG 2 CỘT
    // =======================================================
    const tableStartY = 1050;
    const rowHeight = 203;
    const logoSize = 110;
    const fontSizeTeamName = 70;
    const fontSizeStats = 85;
    const maxTeams = 12;

    const colLeft = {
        logoX: 460, teamNameX: 641, booyahX: 1684, elimsX: 1950, ptsX: 2166
    };
    const colRight = {
        logoX: 2780, teamNameX: 2964, booyahX: 4000, elimsX: 4266, ptsX: 4480
    };

    for (let i = 0; i < Math.min(rankedTeams.length, maxTeams); i++) {
        const team = rankedTeams[i];
        if (!team) continue;

        let currentY, currentCol;

        if (i < 6) { // Cột trái
            currentY = tableStartY + (i * rowHeight);
            currentCol = colLeft;
        } else { // Cột phải
            currentY = tableStartY + ((i - 6) * rowHeight + 30); 
            currentCol = colRight;
        }
        
        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logoImage = await loadImage(logoToLoadPath);
                ctx.drawImage(logoImage, currentCol.logoX, currentY - logoSize / 2, logoSize, logoSize);
            } catch (e) {
                console.error(`Lỗi vẽ logo team ${team.teamName}:`, e);
            }
        }

        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        const teamNameText = team.teamName || (team.names && team.names[0]) || "Đội Khách";
        ctx.fillText(teamNameText.toUpperCase(), currentCol.teamNameX, currentY);

        ctx.font = `bold ${fontSizeStats}px Robo`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        
        ctx.fillText(String(team.totalKills || 0), currentCol.elimsX, currentY);
        ctx.fillText(String(team.totalBooyahs || 0), currentCol.booyahX, currentY);
        
        ctx.fillStyle = '#3b899b';
        ctx.fillText(String(team.totalScore || 0), currentCol.ptsX, currentY);
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = { render };