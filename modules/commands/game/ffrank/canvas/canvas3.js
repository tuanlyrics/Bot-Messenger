/**
 * @name canvas3
 * @description Layout Xám với hiệu ứng shadow, logo và thông tin tùy chỉnh.
 * @author D-Jukie & Gemini & Pcoder
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

function truncateText(ctx, text, maxWidth) {
    let w = ctx.measureText(text).width;
    if (w <= maxWidth) return text;
    while (w > maxWidth && text.length > 0) {
        text = text.substring(0, text.length - 1);
        w = ctx.measureText(text + '...').width;
    }
    return text + '...';
}

// --- [CẬP NHẬT] --- Thêm tham số customName ---
async function render({ canvas, ctx, rankedTeams, topTeamsByGame, timeRange, customName }) {
    const dateInfo = (timeRange || ' | ').split(' | ')[1];

    // Vẽ tiêu đề thời gian
    ctx.font = `bold 50px Prompt`;
    ctx.textAlign = 'center';
    ctx.fillStyle = "#565656";
    ctx.fillText(`CUSTOM ${dateInfo.toUpperCase()}`, 920, 395);

    // Chuẩn bị canvas riêng để vẽ text tên đội
    const textCanvas = createCanvas(canvas.width, canvas.height);
    const textCtx = textCanvas.getContext('2d');

    const tableStartY = 575, rowHeight = 92, maxTeams = 12;
    const offsetX = 900, offsetXX = 500;
    const colTeamName = 130 + offsetX;
    const colElims = 990 + offsetXX;
    const colBooyah = colElims + 185;
    const colPts = colBooyah + 170;

    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    for (let i = 0; i < Math.min(rankedTeams.length, maxTeams); i++) {
        const team = rankedTeams[i];
        const currentY = tableStartY + (i * rowHeight);
        const textY = currentY + (rowHeight / 2);

        // Vẽ logo
        const logoToLoadPath = (team.logoPath && fs.existsSync(team.logoPath)) ? team.logoPath : defaultLogoPath;
        if (fs.existsSync(logoToLoadPath)) {
            try {
                const logo = await loadImage(logoToLoadPath);
                ctx.drawImage(logo, colTeamName - 110, textY - 42, 70, 70);
            } catch (e) {
                console.error(`Lỗi vẽ logo:`, e);
            }
        }

        // Vẽ tên đội trên layer riêng có shadow
        textCtx.font = `bold 40px Prompt`;
        textCtx.textAlign = 'left';
        textCtx.fillStyle = '#FFFFFF';
        textCtx.shadowColor = 'rgba(255, 255, 255, 0.7)';
        textCtx.shadowBlur = 15;

        const teamNameText = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "Đội Khách");
        textCtx.fillText(truncateText(textCtx, teamNameText.toUpperCase(), 450), colTeamName, textY);

        // Vẽ các chỉ số (trên ctx chính, không có shadow)
        ctx.font = `bold 50px RobotoSlab`;
        ctx.textAlign = 'center';

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(String(team.totalKills || 0), colElims, textY);
        ctx.fillText(String(team.totalBooyahs || 0), colBooyah, textY);

        ctx.fillStyle = '#FFD700';
        ctx.fillText(String(team.totalScore || 0), colPts, textY);
    }

    // Gộp chữ tên đội từ textCanvas vào ctx chính
    ctx.drawImage(textCanvas, 0, 0);

    // --- [CẬP NHẬT] --- Vẽ Top 5 Games với logo ---
    ctx.save();
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    ctx.font = "bold 45px 'Prompt'";
    ctx.fillStyle = '#FFFFFF';
    
    const startX = 480;
    const startY = 660;
    const yIncrement = 300;

    if (Array.isArray(topTeamsByGame)) {
        for (let i = 0; i < Math.min(topTeamsByGame.length, 4); i++) {
            const winner = topTeamsByGame[i];
            const teamName = winner ? winner.name || "N/A" : "N/A";
            const logoPath = winner ? winner.logoPath : null;
            const currentY = startY + (i * yIncrement);
            const centerX = startX;

            const logoSize = 100;
            const spacing = 15;
            const textWidth = ctx.measureText(teamName.toUpperCase()).width;
            const totalWidth = logoSize + spacing + textWidth;
            
const textX = centerX - (totalWidth / 2); // Tên nằm bên trái
const logoX = textX + textWidth + spacing; // Logo nằm bên phải tên
            
            const logoToLoadPath = (logoPath && fs.existsSync(logoPath)) ? logoPath : defaultLogoPath;
            if (fs.existsSync(logoToLoadPath)) {
                try {
                    const logo = await loadImage(logoToLoadPath);
                    ctx.drawImage(logo, logoX, currentY - logoSize / 2 - 10, logoSize, logoSize);
                } catch (e) { console.error(`Lỗi vẽ logo top game:`, e); }
            }
            
            ctx.textAlign = 'left';
            ctx.fillText(teamName.toUpperCase(), textX, currentY);
        }
    }
    ctx.restore();

    // --- [THÊM MỚI] --- Vẽ customName ở góc dưới ---
    ctx.save();
    ctx.font = "bold 50px 'Prompt'";
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    
    const finalCustomName = customName || 'Pcoder'; // Tên mặc định nếu không có
    ctx.fillText(finalCustomName.toUpperCase(), 470, canvas.height - 43);
    ctx.restore();

    return canvas.toBuffer('image/png');
}

module.exports = { render };
