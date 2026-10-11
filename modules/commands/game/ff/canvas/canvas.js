const fs = require('fs');
const path = require('path');

/**
 * Tự động quét và lấy tên của tất cả các file layout .js trong thư mục này.
 * @returns {string[]} Mảng chứa tên các layout (không có .js).
 */
function getLayouts() {
    const layoutDir = __dirname;
    try {
        const files = fs.readdirSync(layoutDir);
        return files
            .filter(file => file.endsWith('.js') && file !== 'canvas.js') // Lọc file .js và loại trừ chính nó
            .map(file => path.parse(file).name); // Lấy tên file không có đuôi .js
    } catch (e) {
        console.error("[CanvasManager] Không thể đọc thư mục layouts:", e);
        return [];
    }
}

/**
 * Tải và gọi hàm render của một layout cụ thể.
 * @param {string} layoutName - Tên của layout cần render.
 * @param {object} data - Dữ liệu cần thiết cho việc vẽ (canvas, ctx, rankedTeams, ...).
 * @returns {Promise<Buffer>} Buffer của ảnh đã được vẽ.
 */
async function renderLayout(layoutName, data) {
    const layoutPath = path.join(__dirname, `${layoutName}.js`);

    if (!fs.existsSync(layoutPath)) {
        throw new Error(`Layout '${layoutName}' không tồn tại tại đường dẫn: ${layoutPath}`);
    }

    // Xóa cache của module để luôn tải phiên bản mới nhất khi require
    delete require.cache[require.resolve(layoutPath)];
    const layoutModule = require(layoutPath);

    // Kiểm tra xem module có export đúng hàm 'render' hay không
    if (typeof layoutModule.render !== 'function') {
        throw new TypeError(`Layout '${layoutName}' không export một hàm có tên là 'render'. Vui lòng kiểm tra lại file.`);
    }

    // Gọi hàm render từ module layout
    return layoutModule.render(data);
}

module.exports = { getLayouts, renderLayout };