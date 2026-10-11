const fs = require('fs');
const path = require('path'); // <--- Thêm dòng này để gọi module path
const approvedThreadsPath = path.join(__dirname, '..', '..', 'pdata', 'approvedThreads.json');
console.log("Đường dẫn file của tinhdiem:", approvedThreadsPath);


function readApprovedThreads() {
    try {
        if (!fs.existsSync(approvedThreadsPath)) {
            const dir = path.dirname(approvedThreadsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(approvedThreadsPath, JSON.stringify([]));
            return [];
        }
        // [SỬA] Đọc nội dung file trước khi parse
        const fileContent = fs.readFileSync(approvedThreadsPath, 'utf-8');
        // Nếu file rỗng, trả về mảng rỗng. Nếu có nội dung, mới parse.
        return fileContent ? JSON.parse(fileContent) : [];
    } catch (e) {
        console.error("Lỗi khi đọc file approvedThreads.json:", e);
        // Nếu parse lỗi, ghi đè lại file bằng mảng rỗng để tự sửa lỗi
        fs.writeFileSync(approvedThreadsPath, JSON.stringify([]));
        return [];
    }
}

// Hàm lưu danh sách nhóm đã duyệt
function saveApprovedThreads(data) {
    try {
        fs.writeFileSync(approvedThreadsPath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("Lỗi khi lưu file approvedThreads.json:", e);
    }
}

module.exports.config = {
    name: "tinhdiem",
    version: "1.0.0",
    hasPermssion: 3, // Chỉ Admin bot mới dùng được
    credits: "D-Jukie",
    description: "Quản lý các nhóm được phép sử dụng các lệnh game.",
    commandCategory: "Admin",
    usages: "[add/remove/list] [threadID]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const approvedThreads = readApprovedThreads();
    const action = args[0]?.toLowerCase();
    const targetThreadID = args[1] || threadID;

    switch (action) {
        case 'add': {
            if (approvedThreads.includes(targetThreadID)) {
                return api.sendMessage(`ℹ️ Nhóm với ID: ${targetThreadID} đã được duyệt từ trước.`, threadID, messageID);
            }
            approvedThreads.push(targetThreadID);
            saveApprovedThreads(approvedThreads);
            return api.sendMessage(`✅ Đã duyệt thành công nhóm với ID: ${targetThreadID}`, threadID, messageID);
        }
        case 'remove':
        case 'del': {
            const index = approvedThreads.indexOf(targetThreadID);
            if (index === -1) {
                return api.sendMessage(`ℹ️ Nhóm với ID: ${targetThreadID} không có trong danh sách duyệt.`, threadID, messageID);
            }
            approvedThreads.splice(index, 1);
            saveApprovedThreads(approvedThreads);
            return api.sendMessage(`✅ Đã gỡ duyệt thành công nhóm với ID: ${targetThreadID}`, threadID, messageID);
        }
        case 'list': {
            if (approvedThreads.length === 0) {
                return api.sendMessage("ℹ️ Hiện chưa có nhóm nào được duyệt.", threadID, messageID);
            }
            let msg = "📜 Danh sách các nhóm đã được duyệt:\n\n";
            approvedThreads.forEach((id, i) => msg += `${i + 1}. ${id}\n`);
            return api.sendMessage(msg, threadID, messageID);
        }
        default: {
            return api.sendMessage("⚠️ Cú pháp không hợp lệ.\nSử dụng: .tinhdiem [add | remove | list] [threadID]\n(Để trống threadID để thao tác với nhóm hiện tại)", threadID, messageID);
        }
    }
};