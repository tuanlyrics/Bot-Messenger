/**
 * @name canvas_overall
 * @description Layout SPN TEAM - Đã chuyển đổi theo cấu trúc module render.
 * @author D-Jukie & Gemini & Pcoder
 */

const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Hàm render chính, nhận canvas và context đã được tạo sẵn
async function render({ canvas, ctx, rankedTeams, customName, customDate, customTime }) {
    // Giả định rằng background đã được vẽ lên canvas bởi code gọi hàm này.
    // Logic vẽ được chuyển từ hàm createSPNImage của ffe1.

    ctx.textBaseline = 'middle';

    // Xác định các đường dẫn tới file tài nguyên. Môi trường gọi hàm phải đảm bảo các file này tồn tại.
    const unitedLogoPath = path.join(__dirname, '..', 'cache', 'logo_united.png');
    const defaultLogoPath = path.join(__dirname, '..', 'cache', 'default_logo.png');

    // Hàm nội bộ để lấy logo cho đội, tương tự logic của ffe1
    const getLogoForTeam = (team) => {
        if (team && team.logoPath && fs.existsSync(team.logoPath)) return team.logoPath;
        if (team && team.teamName && team.teamName.toUpperCase() === 'UNITED') return unitedLogoPath;
        return defaultLogoPath;
    };

    // Sử dụng các giá trị tùy chỉnh được truyền vào hoặc dùng giá trị mặc định
    const tournamentTitle = customName || 'PCODER';
    const dateValue = customDate || 'DD/MM'; // ffe1: dateText
    const timeValue = customTime || '';      // ffe1: timeText

    // Vẽ tiêu đề "SPN TEAM"
    // Giả định font 'Anton' và 'Prompt-Bold' đã được đăng ký
    ctx.font = 'bold 34px Anton';
    ctx.fillStyle = '#c99b04';
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 5;
    ctx.strokeText("SPN TEAM", 700, 372);
    ctx.fillText("SPN TEAM", 700, 372);

    // Vẽ Ngày và Giờ
    ctx.font = 'bold 40px Prompt-Bold';
    ctx.fillStyle = '#FFFFFF';

    // Vẽ Ngày (bên trái)
    ctx.textAlign = 'left';
    ctx.fillText(dateValue, 443, 749);

    // Vẽ Giờ (bên dưới)
    ctx.textAlign = 'left';
    ctx.fillText(timeValue, 469, 1959);

    // Tọa độ và kích thước cho bảng xếp hạng
    const startY = 910;
    const rowHeight = 80;
    const logoSize = 60;
    const fontSizeTeamName = 38;
    const fontSizeStats = 45;

    const logoX = 250;
    const teamNameX = 340;
    const elimsX = 875;
    const booyahX = 1024;
    const ptsX = 1177;

    const safeRankedTeams = Array.isArray(rankedTeams) ? rankedTeams : [];

    // Vòng lặp vẽ thông tin các đội
    for (let i = 0; i < Math.min(safeRankedTeams.length, 12); i++) {
        const team = safeRankedTeams[i];
        if (!team) continue;

        const currentY = startY + (i * rowHeight);

        // Vẽ logo đội
        try {
            const logoPath = getLogoForTeam(team);
            if (fs.existsSync(logoPath)) {
                const logoImage = await loadImage(logoPath);
                ctx.drawImage(logoImage, logoX, currentY - logoSize / 2, logoSize, logoSize);
            }
        } catch (e) {
            console.error(`Lỗi vẽ logo cho team ${team.teamName}:`, e.message);
        }

        // Vẽ tên đội
        ctx.font = `bold ${fontSizeTeamName}px Prompt-Bold`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        // Kiểm tra team.teamName trước, nếu không có thì lấy phần tử đầu tiên của mảng team.names
let teamNameToDraw = team.teamName || ((team.names || []).length > 0 ? team.names[0] : "N/A");
ctx.fillText(teamNameToDraw.toUpperCase(), teamNameX, currentY);

        // Vẽ các chỉ số
        // Giả định font 'Robo' đã được đăng ký
        ctx.font = `bold ${fontSizeStats}px Robo`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(String(team.totalBooyahs || 0), booyahX, currentY);
        ctx.fillText(String(team.totalKills || 0), elimsX, currentY);
        ctx.fillText(String(team.totalScore || 0), ptsX, currentY);
    }

    // Vẽ tên giải đấu ở dưới cùng
    ctx.font = 'bold 42px Anton';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(tournamentTitle.toUpperCase(), 475, 2013);

    // Trả về buffer ảnh theo cấu trúc của canvas1.js
    return canvas.toBuffer('image/png');
}

module.exports = { render };