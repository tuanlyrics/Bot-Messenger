// File: modules/ffrank/config_ff.js
const path = require('path');

// Đường dẫn đến thư mục chứa các thư mục con như 'cache', 'logos', v.v.
// __dirname ở đây sẽ là 'modules/ffrank'
const FFRANK_MAIN_DIR = __dirname; 

// Đường dẫn đến thư mục DATA chính của bot (thường là pdata hoặc data)
// Chúng ta đi lùi 2 cấp từ 'modules/ffrank' để ra ngoài thư mục gốc của bot rồi vào 'pdata'
const BOT_DATA_DIR = path.join(__dirname, '..', '..', 'pdata');

// --- CÁC ĐƯỜNG DẪN XUẤT RA ---

// 1. Nơi lưu trữ ảnh logo do admin set
const LOGO_STORAGE_PATH = path.join(FFRANK_MAIN_DIR, 'logos');

// 2. File JSON để ghi lại thời gian tạo logo (dùng cho việc tự xóa sau 24h)
const LOGO_TIMESTAMPS_PATH = path.join(BOT_DATA_DIR, 'logo_timestamps.json');

module.exports = {
    LOGO_STORAGE_PATH,
    LOGO_TIMESTAMPS_PATH
};
