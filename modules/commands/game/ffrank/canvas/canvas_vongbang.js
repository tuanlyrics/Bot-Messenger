/**
 * @name canvas_vongbang
 * @version 2.1
 * @description Module vẽ ảnh BXH Vòng Bảng, đã sửa lỗi hiển thị "???" bằng cách xử lý linh hoạt dữ liệu đầu vào.
 * @author D-Jukie & Gemini (Refactored & Patched by Gemini)
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function render({ canvas, ctx, rankedTeams, gameWinners, liveTimeText, customTypeText, customDateTimeText, top1Color }) {
    ctx.textBaseline = 'middle';

    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    const getLogoForTeam = (team) => {
        if (team && team.logoPath && fs.existsSync(team.logoPath)) {
            return team.logoPath;
        }
        return defaultLogoPath;
    };

    // Tạo một map để tra cứu thông tin team từ tên -> Rất quan trọng để sửa lỗi
    const teamDataMap = new Map();
    if (Array.isArray(rankedTeams)) {
        for (const team of rankedTeams) {
            if (team && team.teamName) {
                teamDataMap.set(team.teamName.toUpperCase(), team);
            }
        }
    }
    
    // --- TỌA ĐỘ VÀ KÍCH THƯỚC ---
    const leaderboard_startY = 762, leaderboard_rowHeight = 98, leaderboard_logoSize = 50;
    const leaderboard_logoX = 800, leaderboard_teamNameX = 847, leaderboard_elimX = 1202;
    const leaderboard_booyahX = 1370, leaderboard_ptsX = 1522;
    const fontTeamName = 'bold 30px Prompt-Bold', fontStats = 'bold 38px Robo', textColor = '#FFFFFF';

    const booyah_rowHeight = 216, fontBooyahWinner = 'bold 30px Prompt-Bold';
    const booyahLogo_X = 90, booyahLogo_startY = 738, booyahLogo_size = 90;
    const booyahName_X = 330, booyahName_startY = 730;
    const booyahWinner_colors = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];

    const liveTimeX = 50, liveTimeY = 2015, fontLiveTime = 'bold 45px Prompt-Bold', colorLiveTime = '#FFFFFF';
    const customTypeX = 670, customTypeY = 2015, fontCustomType = 'bold 28px Prompt-Bold', colorCustomType = '#FFFFFF';
    const customDateTimeX = 1530, customDateTimeY = 2020, fontCustomDateTime = 'bold 42px Prompt-Bold', colorCustomDateTime = '#000000';

    // --- LOGIC VẼ ---

    // VẼ BẢNG XẾP HẠNG (12 ĐỘI)
    if (Array.isArray(rankedTeams)) {
        for (let i = 0; i < 12; i++) {
            const team = rankedTeams[i];
            if (!team) continue;
            const currentY = leaderboard_startY + (i * leaderboard_rowHeight);

            ctx.fillStyle = (i === 0) ? (top1Color || textColor) : textColor;

            try {
                const logoImage = await loadImage(getLogoForTeam(team));
                ctx.drawImage(logoImage, leaderboard_logoX - leaderboard_logoSize / 2, currentY - leaderboard_logoSize / 2, leaderboard_logoSize, leaderboard_logoSize);
            } catch (e) { console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message); }
            
            const teamName = team.teamName || (team.names && team.names[0]) || "N/A";
            
            ctx.font = fontTeamName;
            ctx.textAlign = 'left';
            ctx.fillText(teamName.toUpperCase(), leaderboard_teamNameX, currentY);
            
            ctx.font = fontStats;
            ctx.textAlign = 'center';
            ctx.fillText(String(team.totalKills || 0), leaderboard_elimX, currentY);
            ctx.fillText(String(team.totalBooyahs || 0), leaderboard_booyahX, currentY);
            ctx.fillText(String(team.totalScore || 0), leaderboard_ptsX, currentY);
        }
    }

    // VẼ ĐỘI CÓ BOOYAH (BÊN TRÁI) - LOGIC ĐƯỢC NÂNG CẤP
    if (Array.isArray(gameWinners)) {
        for (let i = 0; i < 6; i++) {
            const item = gameWinners[i];
            let winnerName = "???";
            let winnerTeam = null;

            // Xử lý linh hoạt: item có thể là string (tên) hoặc object (thông tin team)
            if (typeof item === 'string' && item) {
                winnerName = item;
                winnerTeam = teamDataMap.get(item.toUpperCase());
            } else if (typeof item === 'object' && item !== null) {
                winnerTeam = item;
                winnerName = item.name || item.teamName || "???";
            }
            
            const currentLogoY = booyahLogo_startY + (i * booyah_rowHeight);
            const currentNameY = booyahName_startY + (i * booyah_rowHeight);

            if (winnerTeam) {
                try {
                    const logoImage = await loadImage(getLogoForTeam(winnerTeam));
                    ctx.drawImage(logoImage, booyahLogo_X - booyahLogo_size / 2, currentLogoY - booyahLogo_size / 2, booyahLogo_size, booyahLogo_size);
                } catch (e) { console.error(`Lỗi vẽ logo Booyah cho team ${winnerName}:`, e.message); }
            }
            
            ctx.font = fontBooyahWinner;
            ctx.fillStyle = booyahWinner_colors[i] || '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(winnerName.toUpperCase(), booyahName_X, currentNameY);
        }
    }

    // VẼ TEXT Ở CHÂN ẢNH
    ctx.font = fontLiveTime;
    ctx.fillStyle = colorLiveTime;
    ctx.textAlign = 'left';
    ctx.fillText((liveTimeText || '').toUpperCase(), liveTimeX, liveTimeY);

    ctx.font = fontCustomType;
    ctx.fillStyle = colorCustomType;
    ctx.textAlign = 'right';
    ctx.fillText((customTypeText || '').toUpperCase(), customTypeX, customTypeY);

    ctx.font = fontCustomDateTime;
    ctx.fillStyle = colorCustomDateTime;
    ctx.textAlign = 'right';
    ctx.fillText((customDateTimeText || '').toUpperCase(), customDateTimeX, customDateTimeY);

    return canvas.toBuffer('image/png');
}

module.exports = { render };