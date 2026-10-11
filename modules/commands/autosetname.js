const fs = require("fs-extra");
const { join } = require("path");

module.exports.config = {
    name: "autosetname",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "pcoder",
    description: "Tự động setname cho thành viên mới",
    commandCategory: "Nhóm",
    usages: "[add <name> /remove] ",
    cooldowns: 5
};

module.exports.onLoad = () => {
    const dirPath = join(__dirname, "hethong");
    const pathData = join(dirPath, "autosetname.json");
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    if (!fs.existsSync(pathData)) fs.writeFileSync(pathData, "[]", "utf-8");
};

module.exports.run = async function ({ event, api, args, Users }) {
    const { threadID, messageID } = event;
    const dirPath = join(__dirname, "hethong");
    const pathData = join(dirPath, "autosetname.json");

    let dataJson;
    try {
        dataJson = JSON.parse(fs.readFileSync(pathData, "utf-8"));
    } catch (e) {
        dataJson = [];
    }
    let idx = dataJson.findIndex(item => item.threadID == threadID);
    let thisThread = idx >= 0 ? dataJson[idx] : { threadID, nameUser: [] };
    const content = (args.slice(1)).join(" ");

    switch ((args[0] || '').toLowerCase()) {
        case "add": {
            if (!content) return api.sendMessage("Phần cấu hình tên thành viên mới không được bỏ trống!", threadID, messageID);
            if (thisThread.nameUser.length > 0) return api.sendMessage("Vui lòng xóa cấu hình tên cũ trước khi đặt tên mới!!!", threadID, messageID);
            thisThread.nameUser.push(content);
            if (idx === -1) dataJson.push(thisThread);
            else dataJson[idx] = thisThread;
            const name = (await Users.getData(event.senderID)).name || "Thành viên mới";
            fs.writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
            return api.sendMessage(`Đặt cấu hình tên thành viên mới thành công\nPreview: ${content} ${name}`, threadID, messageID);
        }
        case "rm":
        case "remove":
        case "delete": {
            if (thisThread.nameUser.length === 0) return api.sendMessage("Nhóm bạn chưa đặt cấu hình tên thành viên mới!!", threadID, messageID);
            if (idx > -1) dataJson.splice(idx, 1);
            fs.writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
            return api.sendMessage(`Xóa thành công phần cấu hình tên thành viên mới`, threadID, messageID);
        }
        default: {
            return api.sendMessage(`Dùng: autosetname add <name> để cấu hình biệt danh cho thành viên mới\nDùng: autosetname remove để xóa cấu hình đặt biệt danh cho thành viên mới`, threadID, messageID);
        }
    }
};