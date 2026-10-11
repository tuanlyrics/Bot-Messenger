const fs = require("fs");
const path = require('path');
const moment = require('moment-timezone');

module.exports.config = {
    name: "check",
    version: "7.1.0",
    hasPermssion: 0,
    credits: "Pcoder (mod by ChatGPT)",
    description: "Kiểm tra tương tác nhóm với nhiều chế độ",
    commandCategory: "Nhóm",
    usages: "[all|week|day|month|mentions|inactive|active|lọc|help]",
    cooldowns: 5
};

const dataPath = path.join(__dirname, 'cache', 'check_data');

// ===== Hàm khởi tạo dữ liệu =====
function createDefaultData() {
    return {
        total: [],
        week: [],
        day: [],
        month: [],
        mentions: [],
        interactions: {},
        message_timestamps: {}
    };
}

// ===== Lưu dữ liệu khi có tin nhắn =====
module.exports.handleEvent = async function({ api, event }) {
    if (!event.isGroup || !event.senderID || event.senderID == api.getCurrentUserID()) return;
    
    const { threadID, senderID, mentions, messageReply } = event;
    const filePath = path.join(dataPath, `${threadID}.json`);

    let threadData;
    try {
        threadData = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : createDefaultData();
    } catch {
        threadData = createDefaultData();
    }

    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    // Đảm bảo các thuộc tính tồn tại
    if (!threadData.total) threadData.total = [];
    if (!threadData.week) threadData.week = [];
    if (!threadData.day) threadData.day = [];
    if (!threadData.month) threadData.month = [];
    if (!threadData.mentions) threadData.mentions = [];
    if (!threadData.interactions) threadData.interactions = {};
    if (!threadData.message_timestamps) threadData.message_timestamps = {};

    const updateUser = (array, id) => {
        const userIndex = array.findIndex(e => e.id === id);
        if (userIndex === -1) array.push({ id, count: 1 });
        else array[userIndex].count++;
    };

    updateUser(threadData.total, senderID);
    updateUser(threadData.week, senderID);
    updateUser(threadData.day, senderID);
    updateUser(threadData.month, senderID);

    if (!threadData.interactions[senderID]) {
        threadData.interactions[senderID] = { mentions: {}, repliedTo: {} };
    }

    if (mentions) {
        for (const id in mentions) {
            if (id != senderID) {
                updateUser(threadData.mentions, id);
                if (!threadData.interactions[senderID].mentions[id]) {
                    threadData.interactions[senderID].mentions[id] = 0;
                }
                threadData.interactions[senderID].mentions[id]++;
            }
        }
    }
    if (messageReply) {
        const targetID = messageReply.senderID;
        if (targetID != senderID) {
            if (!threadData.interactions[senderID].repliedTo[targetID]) {
                threadData.interactions[senderID].repliedTo[targetID] = 0;
            }
            threadData.interactions[senderID].repliedTo[targetID]++;
        }
    }
    
    if (!threadData.message_timestamps[senderID]) {
        threadData.message_timestamps[senderID] = [];
    }
    threadData.message_timestamps[senderID].push(Date.now());
    if (threadData.message_timestamps[senderID].length > 20) {
        threadData.message_timestamps[senderID].shift();
    }

    fs.writeFileSync(filePath, JSON.stringify(threadData, null, 4));
};

// ===== Xử lý lệnh =====
module.exports.run = async function({ api, event, args, Users, Threads }) {
    const { threadID, messageID, senderID, mentions } = event;
    const filePath = path.join(dataPath, `${threadID}.json`);
    if (!fs.existsSync(filePath)) return api.sendMessage("⚠️ Nhóm của bạn chưa có dữ liệu tương tác.", threadID, messageID);

    let threadData;
    try {
        threadData = JSON.parse(fs.readFileSync(filePath));
    } catch {
        return api.sendMessage("⚠️ Dữ liệu nhóm bị lỗi.", threadID, messageID);
    }
    
    const command = (args[0] || "").toLowerCase();

    // Cache tên
    const nameCache = new Map();
    async function getName(id) {
        if (nameCache.has(id)) return nameCache.get(id);
        const name = await Users.getNameUser(id);
        nameCache.set(id, name);
        return name;
    }

    // ===== HELP =====
    if (command === "help") {
        return api.sendMessage(
`📖 LỆNH CHECK V${this.config.version} 📖
──────────────────
» .check: Xem tương tác bản thân
» .check [all|week|day|month]: Top tin nhắn
» .check mentions: Top lượt tag
» .check inactive: Ai chưa tương tác
» .check active: Ai hoạt động 1h gần nhất
» .check lọc {số}: Kick thành viên có ≤ {số} tin nhắn
» .check lọc ghost: Kick toàn bộ 'Người dùng Facebook'`, 
        threadID, messageID);
    }

    // ===== LỌC =====
    if (command === "lọc") {
        const threadInfo = await Threads.getInfo(threadID);
        const botID = api.getCurrentUserID();
        const isBotAdmin = threadInfo.adminIDs.some(item => item.id === botID);
        if (!isBotAdmin) return api.sendMessage("❌ Bot không có quyền QTV để kick.", threadID, messageID);

        if (!args[1]) {
            return api.sendMessage("⚠️ Cú pháp:\n» .check lọc {số}\n» .check lọc ghost", threadID, messageID);
        }

        // Lọc ghost
        if (args[1].toLowerCase() === "ghost") {
            let arr = [];
            for (const u of threadInfo.userInfo) {
                if (u.gender === undefined && u.id != botID) arr.push(u.id);
            }
            if (arr.length === 0) return api.sendMessage("✅ Không có 'Người dùng Facebook' nào.", threadID, messageID);

            api.sendMessage(`🔎 Tìm thấy ${arr.length} 'Người dùng Facebook'.\n➡️ Bắt đầu lọc...`, threadID);

            let success = 0, fail = 0;
            for (const uid of arr) {
                try {
                    await new Promise(res => setTimeout(res, 1000));
                    await api.removeUserFromGroup(uid, threadID);
                    success++;
                } catch { fail++; }
            }
            return api.sendMessage(`✅ Kick ${success} người.\n❌ Thất bại: ${fail}`, threadID);
        }

        // Lọc theo số tin nhắn
        const limit = parseInt(args[1]);
        if (isNaN(limit)) return api.sendMessage("⚠️ Tham số không hợp lệ.", threadID, messageID);

        const toKick = threadInfo.participantIDs.filter(uid => {
            if (uid == botID) return false;
            const count = threadData.total.find(e => e.id === uid)?.count || 0;
            return count <= limit;
        });

        if (toKick.length === 0) return api.sendMessage(`✅ Không có ai có ≤ ${limit} tin nhắn.`, threadID, messageID);

        api.sendMessage(`🔎 Tìm thấy ${toKick.length} thành viên có ≤ ${limit} tin nhắn.\n➡️ Bắt đầu lọc...`, threadID);

        let success = 0, fail = 0;
        for (const uid of toKick) {
            try {
                await new Promise(res => setTimeout(res, 1000));
                await api.removeUserFromGroup(uid, threadID);
                success++;
            } catch { fail++; }
        }
        return api.sendMessage(`✅ Kick ${success} người.\n❌ Thất bại: ${fail}`, threadID);
    }

    // ===== INACTIVE =====
    if (command === "inactive") {
        const threadInfo = await Threads.getInfo(threadID);
        const inactiveUsers = threadInfo.participantIDs.filter(id => !threadData.total.some(user => user.id === id));
        if (inactiveUsers.length === 0) return api.sendMessage("✅ Mọi người đều có tương tác.", threadID, messageID);

        let msg = `👻 DANH SÁCH CHƯA TƯƠNG TÁC (${inactiveUsers.length} người):\n\n`;
        const names = await Promise.all(inactiveUsers.map(id => getName(id)));
        names.forEach((name, i) => msg += `${i + 1}. ${name}\n`);
        return api.sendMessage(msg, threadID, messageID);
    }

    // ===== ACTIVE =====
    if (command === "active") {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const activeUsers = {};
        if (threadData.message_timestamps) {
            for (const id in threadData.message_timestamps) {
                const count = threadData.message_timestamps[id].filter(ts => ts > oneHourAgo).length;
                if (count > 0) activeUsers[id] = count;
            }
        }
        if (Object.keys(activeUsers).length === 0) return api.sendMessage("...zzz... Không ai hoạt động trong 1 giờ qua.", threadID, messageID);

        let sortedActive = await Promise.all(Object.entries(activeUsers).map(async ([id, count]) => ({ id, count, name: await getName(id) })));
        sortedActive.sort((a, b) => b.count - a.count);

        let msg = "📢 TOP HOẠT ĐỘNG 1 GIỜ QUA 📢\n\n";
        sortedActive.slice(0, 10).forEach((user, i) => msg += `${i+1}. ${user.name} - ${user.count} tin\n`);
        return api.sendMessage(msg, threadID, messageID);
    }

    // ===== TOP TƯƠNG TÁC =====
    if (["all","week","day","month","mentions"].includes(command)) {
        const unit = command === 'mentions' ? "lượt tag" : "tin nhắn";
        const dataKey = command === 'all' ? 'total' : command;
        let data = threadData[dataKey] || [];

        if (data.length === 0) return api.sendMessage(`ℹ️ Chưa có dữ liệu cho mục '${command}'.`, threadID, messageID);
        
        let storage = await Promise.all(data.map(async item => ({ ...item, name: await getName(item.id) || 'Facebook User' })));
        storage.sort((a, b) => b.count - a.count);

        const page = parseInt(args[1]) || 1;
        const itemsPerPage = 10;
        const totalPages = Math.ceil(storage.length / itemsPerPage);

        const startIndex = (page - 1) * itemsPerPage;
        const pageData = storage.slice(startIndex, startIndex + itemsPerPage);
        
        let body = pageData.map((item, index) => {
            const rank = startIndex + index + 1;
            const icon = ['🥇','🥈','🥉'][rank - 1] || `${rank}.`;
            return `${icon} ${item.name} - ${item.count} ${unit}`;
        }).join("\n");

        return api.sendMessage(`🏆 TOP ${command.toUpperCase()} 🏆\n${body}\nTrang ${page}/${totalPages}`, threadID, messageID);
    }

    // ===== MẶC ĐỊNH: Xem bản thân hoặc người khác =====
    const targetUID = event.messageReply ? event.messageReply.senderID : Object.keys(mentions)[0] || senderID;
    const totalCount = threadData.total.find(e => e.id === targetUID)?.count || 0;
    if (totalCount === 0) return api.sendMessage("ℹ️ Người này chưa có dữ liệu.", threadID, messageID);

    const dayCount = (threadData.day || []).find(e => e.id === targetUID)?.count || 0;
    const weekCount = (threadData.week || []).find(e => e.id === targetUID)?.count || 0;
    const name = await getName(targetUID);

    const msg = `📊 THỐNG KÊ ${name} 📊\n` +
                `──────────────────\n` +
                `» Hôm nay: ${dayCount} tin\n` +
                `» Tuần này: ${weekCount} tin\n` +
                `» Tổng cộng: ${totalCount} tin`;
    return api.sendMessage(msg, threadID, messageID);
};
