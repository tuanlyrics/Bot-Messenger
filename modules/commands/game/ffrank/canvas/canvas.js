// ./ffrank/canvas/canvas.js
const fs = require('fs');
const path = require('path');

function getLayouts() {
    const currentDir = __dirname;
    try {
        return fs.readdirSync(currentDir)
            .filter(file => file.startsWith('canvas') && file.endsWith('.js') && file !== 'canvas.js')
            .map(file => path.parse(file).name);
    } catch (e) {
        console.error("[FFRANK] Không thể đọc thư mục layout canvas:", e);
        return [];
    }
}

async function renderLayout(layoutName, data) {
    const layoutPath = path.join(__dirname, `${layoutName}.js`);
    if (!fs.existsSync(layoutPath)) {
        throw new Error(`Layout "${layoutName}" không tồn tại.`);
    }
    try {
        const { render } = require(layoutPath);
        // Xóa cache của module để có thể reload thay đổi
        delete require.cache[require.resolve(layoutPath)]; 
        return await render(data);
    } catch (e) {
        console.error(`[FFRANK] Lỗi khi thực thi layout "${layoutName}":`, e);
        throw new Error(`Layout "${layoutName}" bị lỗi.`);
    }
}

module.exports = { getLayouts, renderLayout };