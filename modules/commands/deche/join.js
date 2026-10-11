const fs = require('fs-extra');
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'data', 'groups.json');
const banPath = path.join(__dirname, '..', '..', 'data', 'banned.json');

// Lấy danh sách các tọa độ chưa bị chiếm
function getAvailableTerritories(data, banned) {
    const allTerritories = [];
    for (let y = 0; y < 4; y++)
        for (let x = 1; x <= 5; x++)
            allTerritories.push(String.fromCharCode(65 + y) + x);
    const usedTerritories = Object.entries(data)
        .filter(([tid]) => !banned.includes(tid))
        .map(([, val]) => val.territory);
    return allTerritories.filter(label => !usedTerritories.includes(label));
}

// Lệnh chính: Tham gia game
module.exports = async function (api, event) {
    const threadID = event.threadID;

    // Đọc dữ liệu nhóm và danh sách ban
    let data, banned;
    try {
        [data, banned] = await Promise.all([
            fs.readJson(dataPath).catch(() => ({})),
            fs.readJson(banPath).catch(() => [])
        ]);
    } catch (err) {
        console.log('[JOIN] Lỗi đọc file dữ liệu:', err);
        return api.sendMessage("❌ Lỗi hệ thống khi đọc dữ liệu, liên hệ admin!", threadID);
    }

    console.log('[JOIN] threadID:', threadID);
    console.log('[JOIN] banned:', banned);
    console.log('[JOIN] data[threadID]:', data[threadID]);

    if (banned.includes(threadID)) {
        console.log('[JOIN] Nhóm bị ban!');
        return api.sendMessage("🚫 Nhóm bạn đã bị loại khỏi game, không thể tham gia lại.", threadID);
    }
    if (data[threadID] && data[threadID].territory) {
        console.log('[JOIN] Nhóm đã tham gia, gửi lại bản đồ.');
        const canvasMap = require('./canvasMap.js');
        return canvasMap(api, event);
    }

    // Gửi bản đồ và hướng dẫn chọn tọa độ
    const canvasMap = require('./canvasMap.js');
    canvasMap(api, event, async (err, info, tempPath) => {
        if (err || !tempPath) {
            console.log('[JOIN] Lỗi tạo bản đồ:', err, tempPath);
            return api.sendMessage("Đã có lỗi khi tạo bản đồ!", threadID);
        }

        const msg = "🗺️ Bản đồ hiện tại!\nVui lòng reply tin nhắn này bằng tọa độ bạn muốn chọn (vd: B2).\nHoặc reply 'random' để hệ thống chọn ngẫu nhiên.";
        await api.sendMessage(
            {
                body: msg,
                attachment: fs.createReadStream(tempPath)
            },
            threadID,
            (err2, info2) => {
                console.log('[JOIN] Đã gửi bản đồ, info2:', info2, 'err2:', err2);
                if (!err2 && info2) {
                    if (!global.client.handleReply) global.client.handleReply = [];
                    global.client.handleReply.push({
                        name: "deche-join",
                        messageID: info2.messageID,
                        author: event.senderID
                    });
                    console.log('[JOIN] handleReply push:', {
                        name: "deche-join",
                        messageID: info2.messageID,
                        author: event.senderID
                    });
                }
                // Xóa file tạm sau khi gửi
                fs.unlink(tempPath, () => {});
            }
        );
    }, { force: true });
};

// Xử lý khi người dùng reply chọn tọa độ
module.exports.handleReply = async function ({ api, event, handleReply }) {
    const threadID = event.threadID;
    const input = (event.body || "").toUpperCase().trim();

    let data, banned;
    try {
        [data, banned] = await Promise.all([
            fs.readJson(dataPath).catch(() => ({})),
            fs.readJson(banPath).catch(() => [])
        ]);
    } catch (err) {
        console.log('[handleReply] Lỗi đọc file dữ liệu:', err);
        return api.sendMessage("❌ Lỗi hệ thống khi đọc dữ liệu, liên hệ admin!", threadID, event.messageID);
    }

    console.log('[handleReply] threadID:', threadID);
    console.log('[handleReply] banned:', banned);
    console.log('[handleReply] data[threadID]:', data[threadID]);
    console.log('[handleReply] input:', input);

    // Nếu đã chiếm đất thì gửi lại bản đồ
    if (data[threadID] && data[threadID].territory) {
        console.log('[handleReply] Nhóm đã chiếm đất, gửi lại map.');
        const canvasMap = require('./canvasMap.js');
        return canvasMap(api, event);
    }

    // Lấy danh sách tọa độ còn trống
    const available = getAvailableTerritories(data, banned);
    console.log('[handleReply] available:', available);

    let territory;
    if (input === "RANDOM") {
        if (available.length === 0) {
            console.log('[handleReply] Không còn lãnh thổ trống!');
            return api.sendMessage("❌ Hết lãnh thổ trống.", threadID, event.messageID);
        }
        territory = available[Math.floor(Math.random() * available.length)];
        console.log('[handleReply] RANDOM chọn:', territory);
    } else if (available.includes(input)) {
        territory = input;
        console.log('[handleReply] Người dùng chọn:', territory);
    } else {
        console.log('[handleReply] Tọa độ không hợp lệ hoặc đã chiếm!');
        return api.sendMessage(
            `❌ Tọa độ bạn chọn không hợp lệ hoặc đã có người chiếm. Hãy chọn lại hoặc nhập 'random'.`,
            threadID,
            event.messageID
        );
    }

    // Lưu nhóm mới tham gia
    let info;
    try {
        info = await api.getThreadInfo(threadID);
    } catch (err) {
        console.log('[handleReply] Lỗi lấy info nhóm:', err);
        return api.sendMessage("❌ Lỗi lấy thông tin nhóm!", threadID, event.messageID);
    }
    const memberIDs = info.participantIDs || [];
    const name = info.threadName || "";

    data[threadID] = {
        hp: 10000,
        maxHp: 10000,
        territory,
        items: {},
        memberIDs,
        name
    };
    try {
        await fs.writeJson(dataPath, data, { spaces: 2 });
    } catch (err) {
        console.log('[handleReply] Lỗi ghi file:', err);
        return api.sendMessage("❌ Lỗi ghi dữ liệu!", threadID, event.messageID);
    }

    console.log('[handleReply] Đã lưu group:', data[threadID]);

    await api.sendMessage(`✅ Nhóm đã tham gia Đế Chế, chiếm đóng ô ${territory}!`, threadID);

    // Gửi lại bản đồ mới nhất
    const canvasMap = require('./canvasMap.js');
    return canvasMap(api, event);
};