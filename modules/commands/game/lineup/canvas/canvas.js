const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

/**
 * Tự động quét thư mục này để tìm các file layout hợp lệ.
 * @returns {Array<string>} - Danh sách tên các layout.
 */
function getLayouts() {
    const currentDir = __dirname;
    try {
        return fs.readdirSync(currentDir)
            .filter(file => file.startsWith('canvas') && file.endsWith('.js') && file !== 'canvas.js')
            .map(file => path.parse(file).name);
    } catch (e) {
        console.error("[LINEUP] Không thể đọc thư mục layout canvas:", e);
        return [];
    }
}

/**
 * Tạo canvas, vẽ nền, sau đó gọi layout con để vẽ chi tiết.
 * @param {object} data - Toàn bộ dữ liệu cần thiết.
 * @returns {Promise<Buffer>} - Buffer của ảnh PNG đã được vẽ.
 */
async function createLineupImage(data) {
    const { layoutName, backgroundPath } = data;
    const layoutPath = path.join(__dirname, `${layoutName}.js`);
    
    if (!fs.existsSync(layoutPath)) {
        throw new Error(`Layout "${layoutName}" không tồn tại tại: ${layoutPath}`);
    }
    if (!fs.existsSync(backgroundPath)) {
        throw new Error(`Ảnh nền không tồn tại tại: ${backgroundPath}`);
    }

    try {
        // TẠO CANVAS VÀ CONTEXT TỪ ẢNH NỀN
        const background = await loadImage(backgroundPath);
        const canvas = createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Thêm canvas và ctx vào object data để truyền đi
        const fullData = { ...data, canvas, ctx };

        delete require.cache[require.resolve(layoutPath)]; 
        const { render } = require(layoutPath);
        
        // Gọi hàm render của layout và truyền fullData (đã có canvas và ctx)
        return await render(fullData);

    } catch (e) {
        console.error(`[LINEUP] Lỗi khi thực thi layout "${layoutName}":`, e);
        throw new Error(`Layout "${layoutName}" bị lỗi. Vui lòng kiểm tra lại code.`);
    }
}

module.exports = { createLineupImage, getLayouts };