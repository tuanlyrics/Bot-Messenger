// File: modules/commands/connect.js
// Nhiệm vụ: Quản lý kết nối Database. Cấu hình được khai báo trực tiếp tại đây.

const mysql = require('mysql2/promise');

// ----- THÔNG TIN KẾT NỐI DATABASE -----
// Lấy trực tiếp từ file server của bạn
const dbConfig = {
    host: '160.191.244.160',
    user: 'spniovn1_spnnn',
    password: 'spniovn1_spnnn',
    database: 'spniovn1_spnnn',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
// -----------------------------------------

let pool;

function getPool() {
    if (!pool) {
        try {
            pool = mysql.createPool(dbConfig);
            console.log("✅ [DATABASE] Pool kết nối MySQL đã sẵn sàng!");
        } catch (error) {
            console.error("❌ [DATABASE] Lỗi nghiêm trọng khi tạo pool kết nối MySQL:", error);
            // Dừng bot nếu không thể kết nối đến database
            process.exit(1);
        }
    }
    return pool;
}

// ▼▼▼ THÊM HÀM MỚI NÀY ▼▼▼
async function closePool() {
    if (pool) {
        try {
            await pool.end();
            console.log("✅ [DATABASE] Pool kết nối MySQL đã được đóng an toàn.");
            pool = null;
        } catch (error) {
            console.error("❌ [DATABASE] Lỗi khi đóng pool kết nối:", error);
        }
    }
}
// ▲▲▲ THÊM HÀM MỚI NÀY ▲▲▲

// Hàm này sẽ được các command khác (verify, sodu...) gọi để sử dụng
module.exports = getPool();

// Thêm một module config giả để bot không báo lỗi khi load file
module.exports.config = {
    name: "connect",
    version: "2.1-Standalone",
    author: "Gemini & Pcoder",
    description: "Quản lý kết nối Database. (Không phải lệnh người dùng)",
    commandCategory: "Hệ thống"
};

// Thêm hàm run rỗng để tương thích với loader của bot
module.exports.run = async function({ api, event }) {
    // Không làm gì cả
};