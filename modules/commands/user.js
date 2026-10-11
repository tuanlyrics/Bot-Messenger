const moment = require("moment-timezone");

module.exports.config = {
    name: "user",
    version: "3.0.0",
    hasPermssion: 2,
    credits: "Mirai Team & Pcoder",
    description: "Quản lý người dùng trong hệ thống bot (cấm, gỡ cấm, tìm kiếm...).",
    commandCategory: "Admin",
    usages: "[ban/unban/info/search/bancmd/unbancmd] [@tag/userID/reply]",
    cooldowns: 5
};

module.exports.languages = {
    "vi": {
        "reason": "Lý do",
        "at": "vào lúc",
        "allCommand": "toàn bộ lệnh",
        "commandList": "các lệnh",
        "banSuccess": "✅ Đã cấm người dùng: %1",
        "unbanSuccess": "✅ Đã gỡ cấm cho người dùng: %1",
        "banCommandSuccess": "✅ Đã cấm các lệnh '%1' đối với người dùng: %2",
        "unbanCommandSuccess": "✅ Đã gỡ cấm các lệnh '%1' cho người dùng: %2",
        "errorReponse": "❌ Đã có lỗi xảy ra, không thể hoàn tất yêu cầu của bạn.",
        "IDNotFound": "❌ ID người dùng bạn nhập không tồn tại trong cơ sở dữ liệu.",
        "existBan": "⚠️ Người dùng %1 đã bị cấm từ trước.\n» Lý do: %2\n» Vào lúc: %3",
        "notExistBan": "✅ Người dùng bạn nhập chưa từng bị cấm.",
        "missingCommandInput": "⚠️ Vui lòng nhập các lệnh cần cấm/gỡ cấm.",
        "notExistBanCommand": "✅ Người dùng này không bị cấm sử dụng lệnh nào.",
        "confirmBan": "❓ Bạn có chắc muốn cấm người dùng này?\n\n- Tên: %1\n- ID: %2\n- Lý do: %3\n\n» Thả cảm xúc bất kỳ vào tin nhắn này để xác nhận.",
        "confirmUnban": "❓ Bạn có chắc muốn gỡ cấm cho người dùng này?\n\n- Tên: %1\n- ID: %2\n\n» Thả cảm xúc bất kỳ vào tin nhắn này để xác nhận.",
        "confirmBanCommand": "❓ Bạn có chắc muốn cấm các lệnh sau đối với người dùng %1?\n\n- Lệnh cấm: %2\n\n» Thả cảm xúc bất kỳ vào tin nhắn này để xác nhận.",
        "confirmUnbanCommand": "❓ Bạn có chắc muốn gỡ cấm các lệnh sau cho người dùng %1?\n\n- Lệnh gỡ cấm: %2\n\n» Thả cảm xúc bất kỳ vào tin nhắn này để xác nhận.",
        "returnResult": "🔎 Kết quả tìm kiếm cho '%1':\n\n%2",
        "returnNull": "❌ Không tìm thấy kết quả nào phù hợp với tìm kiếm của bạn.",
        "returnList": "Hiện tại đang có %1 người dùng bị cấm:\n\n%2",
        "returnInfo": "--- Thông tin người dùng ---\n👤 Tên: %1\n🆔 ID: %2\n--------------------------\n🚫 Trạng thái cấm: %3\n%4\n--------------------------\n🔒 Lệnh bị cấm: %5"
    }
};

module.exports.handleReaction = async ({ event, api, Users, handleReaction, getText }) => {
    if (event.userID !== handleReaction.author) return;
    api.unsendMessage(handleReaction.messageID);

    const { type, targetID, reason, commandNeedBan, nameTarget } = handleReaction;
    const time = moment.tz("Asia/Ho_Chi_minh").format("DD/MM/YYYY HH:mm:ss");

    try {
        let data = (await Users.getData(targetID)).data || {};
        switch (type) {
            case "ban": {
                data.banned = true;
                data.reason = reason || "Không có";
                data.dateAdded = time;
                await Users.setData(targetID, { data });
                global.data.userBanned.set(targetID, { reason: data.reason, dateAdded: data.dateAdded });
                return api.sendMessage(getText("banSuccess", `${targetID} - ${nameTarget}`), event.threadID);
            }
            case "unban": {
                data.banned = false;
                data.reason = null;
                data.dateAdded = null;
                await Users.setData(targetID, { data });
                global.data.userBanned.delete(targetID);
                return api.sendMessage(getText("unbanSuccess", `${targetID} - ${nameTarget}`), event.threadID);
            }
            case "banCommand": {
                data.commandBanned = [...(data.commandBanned || []), ...commandNeedBan];
                await Users.setData(targetID, { data });
                global.data.commandBanned.set(targetID, data.commandBanned);
                return api.sendMessage(getText("banCommandSuccess", commandNeedBan.join(', '), `${targetID} - ${nameTarget}`), event.threadID);
            }
            case "unbanCommand": {
                data.commandBanned = (data.commandBanned || []).filter(item => !commandNeedBan.includes(item));
                await Users.setData(targetID, { data });
                global.data.commandBanned.set(targetID, data.commandBanned);
                if (data.commandBanned.length === 0) global.data.commandBanned.delete(targetID);
                return api.sendMessage(getText("unbanCommandSuccess", commandNeedBan.join(', '), `${targetID} - ${nameTarget}`), event.threadID);
            }
        }
    } catch (e) {
        console.error("[USER] Lỗi khi xử lý reaction:", e);
        return api.sendMessage(getText("errorReponse"), event.threadID);
    }
};

module.exports.run = async ({ event, api, args, Users, getText }) => {
    const { threadID, messageID } = event;
    const command = args[0]?.toLowerCase();
    
    const getTargetID = () => {
        if (event.messageReply) return event.messageReply.senderID;
        if (event.mentions && Object.keys(event.mentions).length > 0) return Object.keys(event.mentions)[0];
        if (args[1] && !isNaN(args[1])) return args[1];
        return null;
    };
    
    const getReason = (startIdx = 2) => {
        let reason = args.slice(startIdx).join(" ");
        if (event.mentions && Object.keys(event.mentions).length > 0) {
            const mentionedName = event.mentions[Object.keys(event.mentions)[0]];
            reason = args.join(" ").replace(mentionedName, '').replace(command, '').replace(args[1], '').trim();
        }
        return reason || null;
    };

    switch (command) {
        case "ban": case "-b": {
            const targetID = getTargetID();
            if (!targetID) return api.sendMessage("Vui lòng tag, reply hoặc nhập ID người cần ban.", threadID, messageID);
            if (!global.data.allUserID.includes(targetID)) return api.sendMessage(getText("IDNotFound"), threadID, messageID);
            if (global.data.userBanned.has(targetID)) {
                const { reason, dateAdded } = global.data.userBanned.get(targetID);
                return api.sendMessage(getText("existBan", targetID, reason || 'Không có', dateAdded), threadID, messageID);
            }
            const reason = getReason(2);
            const nameTarget = await Users.getNameUser(targetID);
            return api.sendMessage(getText("confirmBan", nameTarget, targetID, reason || 'Không có'), threadID, (err, info) => {
                if (err) return;
                global.client.handleReaction.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, type: "ban", targetID, reason, nameTarget });
            }, messageID);
        }
        case "unban": case "-ub": {
            const targetID = getTargetID();
            if (!targetID) return api.sendMessage("Vui lòng tag, reply hoặc nhập ID người cần gỡ ban.", threadID, messageID);
            if (!global.data.allUserID.includes(targetID)) return api.sendMessage(getText("IDNotFound"), threadID, messageID);
            if (!global.data.userBanned.has(targetID)) return api.sendMessage(getText("notExistBan"), threadID, messageID);
            const nameTarget = await Users.getNameUser(targetID);
            return api.sendMessage(getText("confirmUnban", nameTarget, targetID), threadID, (err, info) => {
                if(err) return;
                global.client.handleReaction.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, type: "unban", targetID, nameTarget });
            }, messageID);
        }
        case "info": case "-i": {
            const targetID = getTargetID() || event.senderID;
            if (!global.data.allUserID.includes(targetID)) return api.sendMessage(getText("IDNotFound"), threadID, messageID);
            const userData = (await Users.getData(targetID))?.data || {};
            const nameTarget = await Users.getNameUser(targetID);
            const banStatus = userData.banned === true ? `Đang bị cấm` : `Không bị cấm`;
            const banInfo = userData.banned === true ? `\n- Lý do: ${userData.reason || "Không có"}\n- Ngày cấm: ${userData.dateAdded}` : "";
            const cmdBanned = (userData.commandBanned && userData.commandBanned.length > 0) ? userData.commandBanned.join(', ') : 'Không có';
            return api.sendMessage(getText("returnInfo", nameTarget, targetID, banStatus, banInfo, cmdBanned), threadID, messageID);
        }
        case "search": case "-s": {
            const keyword = args.slice(1).join(" ");
            if (!keyword) return api.sendMessage("Vui lòng nhập tên người dùng cần tìm.", threadID, messageID);
            const allUsers = await Users.getAll(['name', 'userID']);
            const matches = allUsers.filter(user => user.name && user.name.toLowerCase().includes(keyword.toLowerCase()));
            if (matches.length === 0) return api.sendMessage(getText("returnNull"), threadID, messageID);
            let resultText = "";
            matches.slice(0, 10).forEach((user, index) => {
                resultText += `${index + 1}. ${user.name}\n  - ID: ${user.userID}\n`;
            });
            return api.sendMessage(getText("returnResult", keyword, resultText), threadID, messageID);
        }
        case "list": case "-l": {
            const bannedUsers = Array.from(global.data.userBanned.keys());
            if (bannedUsers.length === 0) return api.sendMessage("✅ Hiện không có người dùng nào bị cấm.", threadID, messageID);
            let userList = "";
            let count = 0;
            for (const id of bannedUsers) {
                if(count >= 10) break;
                const name = await Users.getNameUser(id);
                const { reason, dateAdded } = global.data.userBanned.get(id);
                userList += `${count + 1}. ${name} (ID: ${id})\n   - Lý do: ${reason || 'Không có'}\n   - Vào lúc: ${dateAdded}\n`;
                count++;
            }
            return api.sendMessage(getText("returnList", bannedUsers.length, count, userList), threadID, messageID);
        }
        case "bancommand": case "-bc": {
            const targetID = getTargetID();
            if (!targetID) return api.sendMessage("Vui lòng tag, reply hoặc nhập ID người cần cấm lệnh.", threadID, messageID);
            if (!global.data.allUserID.includes(targetID)) return api.sendMessage(getText("IDNotFound"), threadID, messageID);
            const commandsToBan = getReason(2)?.split(' ').filter(Boolean) || [];
            if (commandsToBan.length === 0) return api.sendMessage(getText("missingCommandInput"), threadID, messageID);
            const nameTarget = await Users.getNameUser(targetID);
            return api.sendMessage(getText("confirmBanCommand", `${nameTarget} (${targetID})`, commandsToBan.join(', ')), threadID, (err, info) => {
                if(err) return;
                global.client.handleReaction.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, type: "banCommand", targetID, commandNeedBan: commandsToBan, nameTarget });
            }, messageID);
        }
        case "unbancommand": case "-ubc": {
            const targetID = getTargetID();
            if (!targetID) return api.sendMessage("Vui lòng tag, reply hoặc nhập ID người cần gỡ cấm lệnh.", threadID, messageID);
            const userData = (await Users.getData(targetID))?.data || {};
            if (!userData.commandBanned || userData.commandBanned.length === 0) return api.sendMessage(getText("notExistBanCommand"), threadID, messageID);
            
            let commandsToUnban = getReason(2)?.split(' ').filter(Boolean) || [];
            if (commandsToUnban.length === 0) return api.sendMessage(getText("missingCommandInput"), threadID, messageID);
            if (commandsToUnban[0] === 'all') commandsToUnban = userData.commandBanned;

            const nameTarget = await Users.getNameUser(targetID);
            return api.sendMessage(getText("confirmUnbanCommand", `${nameTarget} (${targetID})`, commandsToUnban.join(', ')), threadID, (err, info) => {
                if(err) return;
                global.client.handleReaction.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, type: "unbanCommand", targetID, commandNeedBan: commandsToUnban, nameTarget });
            }, messageID);
        }
        default:
            return api.sendMessage("Lệnh không hợp lệ. Sử dụng 'user [ban/unban/info/search/list/bancommand/unbancommand]'.", threadID, messageID);
    }
};