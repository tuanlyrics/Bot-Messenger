const fs = require('fs').promises;
const path = require('path');

const dataPath = path.join(__dirname, 'cache', 'qtvonly.json');

// Hàm trợ giúp để đọc/ghi dữ liệu một cách an toàn
async function readData() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Nếu file không tồn tại hoặc lỗi, tạo file mới
        await fs.writeFile(dataPath, JSON.stringify({}, null, 4));
        return {};
    }
}

async function writeData(data) {
    try {
        await fs.writeFile(dataPath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("Lỗi khi ghi file qtvonly:", error);
    }
}

module.exports.config = {
    name: "qtvonly",
    version: "2.2.0",
    hasPermssion: 1,
    credits: "Pcoder",
    description: "Bật/tắt chế độ chỉ quản trị viên nhóm mới có thể sử dụng bot.",
    commandCategory: "Quản Trị",
    usages: "[on/off]",
    cooldowns: 5,
};

module.exports.onLoad = async function() {
    // Đảm bảo file tồn tại khi bot khởi động
    await readData();
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    let database = await readData();

    if (!database[threadID]) {
        database[threadID] = {
            enabled: false
        };
    }

    let mode = args[0]?.toLowerCase();

    if (mode === 'on') {
        database[threadID].enabled = true;
        await writeData(database);
        return api.sendMessage("» Đã bật chế độ Quản trị viên.\n(Chỉ quản trị viên nhóm và admin bot có thể sử dụng bot)", threadID, messageID);
    } 
    else if (mode === 'off') {
        database[threadID].enabled = false;
        await writeData(database);
        return api.sendMessage("» Đã tắt chế độ Quản trị viên.\n(Tất cả mọi người đều có thể sử dụng bot)", threadID, messageID);
    }
    else { // Tự động đảo ngược trạng thái nếu không có 'on' hoặc 'off'
        database[threadID].enabled = !database[threadID].enabled;
        await writeData(database);
        const status = database[threadID].enabled ? "Bật" : "Tắt";
        const detail = database[threadID].enabled ? "Chỉ quản trị viên nhóm và admin bot có thể sử dụng bot" : "Tất cả mọi người đều có thể sử dụng bot";
        return api.sendMessage(`» Đã ${status} thành công chế độ Quản trị viên.\n(${detail})`, threadID, messageID);
    }
};

// Đã xóa module.exports.handleEvent vì logic đã được chuyển sang handleCommand.js