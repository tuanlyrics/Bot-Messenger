const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');

const CACHE_DIR = path.join(__dirname, '..', 'cache');

// Hàm download dùng riêng cho canvas
async function downloadCanvasAsset(url, fullPath) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        fs.writeFileSync(fullPath, response.data);
        return true;
    } catch (e) {
        console.error(`[QR Canvas] Lỗi tải tài nguyên từ ${url}:`, e.message);
        return false;
    }
}

// Hàm đảm bảo font sẵn sàng và đăng ký nó
async function ensureAndRegisterFont(fontInfo) {
    const fontPath = path.join(CACHE_DIR, fontInfo.filename);
    if (!fs.existsSync(fontPath)) {
        await downloadCanvasAsset(fontInfo.url, fontPath);
    }
    if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: fontInfo.family });
    }
}

async function createQrImage(data) {
    const { layoutName, backgroundPath, fonts } = data;
    const layoutModulePath = path.join(__dirname, `canvas_${layoutName}.js`);
    
    if (!fs.existsSync(layoutModulePath)) throw new Error(`Layout "${layoutName}" không tồn tại.`);
    if (!fs.existsSync(backgroundPath)) throw new Error(`Ảnh nền tại "${backgroundPath}" không tồn tại.`);

    try {
        // Tự động tải và đăng ký tất cả các font "khi cần"
        if (fonts && Array.isArray(fonts)) {
            await Promise.all(fonts.map(font => ensureAndRegisterFont(font)));
        }

        const background = await loadImage(backgroundPath);
        const canvas = createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        const fullData = { ...data, canvas, ctx };
        
        delete require.cache[require.resolve(layoutModulePath)];
        const { render } = require(layoutModulePath);
        
        const finalBuffer = await render(fullData);
        
        const finalImagePath = path.join(CACHE_DIR, `final_${Date.now()}.png`);
        fs.writeFileSync(finalImagePath, finalBuffer);
        return finalImagePath;

    } catch (e) {
        console.error(`[QR Canvas] Lỗi khi thực thi layout "${layoutName}":`, e);
        throw e;
    }
}

module.exports = { createQrImage };