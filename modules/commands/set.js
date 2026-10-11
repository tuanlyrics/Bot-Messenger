const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports.config = {
    name: "set",
    version: "2.3.0",
    hasPermssion: 1,
    credits: "D-Jukie, Loi, Harin, ErikaOwO, Pcoder, bao, CatalizCS, mod by Kenne400k2",
    description: "Lệnh quản trị tổng hợp: set dữ liệu user/box, set exp, tiền, tên nhóm, emoji, ảnh nhóm, admin box, join config ...",
    commandCategory: "Admin",
    usages: "[databox|datauser|exp|money|name|emoji|imgbox|qtv|join]",
    cooldowns: 3,
};

// ========== Helper for delay unsend ========== //
const delayUnsend = 60; // seconds

// ========== MAIN RUN ==========
module.exports.run = async function ({ event, args, api, Threads, Users, Currencies }) {
    const { threadID, senderID, messageID, mentions, messageReply, type, body, participantIDs } = event;

    // HELP
    if (!args[0] || ["help", "-h", "--help"].includes(args[0].toLowerCase())) {
  return api.sendMessage(
`📦 [ SET - ALL IN ONE ]

🔧 Hành động cập nhật:
• set databox → Cập nhật dữ liệu nhóm
• set datauser → Cập nhật dữ liệu người dùng

📈 Thiết lập EXP và Tiền:
• set exp → setexp [tag|me|del|UID] <exp>
• set money → setmoney [add|set|clean|all|uid] <số tiền>

👤 Thiết lập cá nhân/nhóm:
• set name → setname [trống|tag|all|check|del|call|help]
• set emoji → setemoji [emoji]
• set imgbox → setimgbox (reply ảnh)
• set qtv → setqtv [add|remove] [@tag|reply]
• set join → setjoin [text|mp4] <giá trị>

📌 Ví dụ:
• set databox
• set datauser
• set exp me 9999
• set money add 1000 @tag
• set name all Ken
• set emoji 😎
• set imgbox (reply ảnh)
• set qtv add @tag
• set join text Xin chào {name} đã vào nhóm!
`, threadID, messageID);
}


    // ======= SET DATABOX =======
    if (args[0] == "databox") {
        var inbox = await api.getThreadList(100, null, ['INBOX']);
        let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
        const lengthGroup = list.length;
        for (var groupInfo of list) {
            var threadInfo = await api.getThreadInfo(groupInfo.threadID);
            await Threads.setData(groupInfo.threadID, { threadInfo });
        }
        return api.sendMessage(`Đã cập nhật dữ liệu của ${lengthGroup} box`, threadID);
    }

    // ======= SET DATAUSER =======
    if (args[0] == "datauser") {
    var inbox = await api.getThreadList(1000, null, ['INBOX']);
    let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
    let total = 0;
    for (var groupInfo of list) {
        let getInfo = await Threads.getInfo(groupInfo.threadID) || await api.getThreadInfo(groupInfo.threadID);
        let { participantIDs } = getInfo;
        for (let id of participantIDs) {
            let data = await api.getUserInfo(id);
            let userName = data[id].name;
            await Users.setData(id, { name: userName, data: {} });
            total++;
        }
    }
    return api.sendMessage(`Đã cập nhật dữ liệu của ${total} user`, threadID);
}

    // ======= SETEXP =======
    if (args[0] == "exp") {
        var mention = Object.keys(mentions)[0];
        var kong = 0;
        var expSet = args[2] || "";
        if (args[1]=='me'){
            return api.sendMessage(`Đã thay đổi số exp của bạn thành ${expSet}`, threadID, async() => {await Currencies.setData(senderID, {exp: parseInt(expSet)})}, messageID);
        }
        else if(args[1]=="del"){
            if (args[2] == 'me'){
                const expme =(await Currencies.getData(senderID)).exp;
                return api.sendMessage(`✅Đã xoá toàn bộ số exp của bạn\nSố exp xoá là ${expme}.`, threadID, async() => {await Currencies.setData(senderID, {exp: 0})});
            }
            else if (Object.keys(mentions).length == 1) {
                const mention = Object.keys(mentions)[0];
                const expdel = (await Currencies.getData(mention)).exp;
                return api.sendMessage(`✅Đã xoá toàn bộ số exp của ${event.mentions[mention].replace("@", "")}\nSố exp xoá là ${expdel}.`, threadID, async() => {await Currencies.setData(mention, {exp: 0})});
            }
            else return api.sendMessage("Sai cú pháp", threadID, messageID);
        }
        else if (Object.keys(mentions).length == 1) {
            return api.sendMessage({
                body: (`Đã thay đổi số exp của ${event.mentions[mention].replace("@", "")} thành ${expSet}`),
                mentions: [{
                    tag: event.mentions[mention].replace("@", ""),
                    id: parseInt(mention)
                }]
            }, threadID, async () => {await Currencies.setData(mention, {exp: parseInt(expSet)})});
        }
        else if(args[1]=="UID"){
            var id = args[2];
            var cut = args[3];
            let nameeee = (await Users.getData(id)).name;
            return api.sendMessage(`Đã thay đổi số exp của ${nameeee} thành ${cut}`, threadID, async() => {await Currencies.setData(id, {exp: parseInt(cut)})}, messageID);
        }
        else {
            return api.sendMessage("Sai cú pháp", threadID, messageID)
        }
    }

    // ======= SETMONEY =======
    if (args[0] == "money") {
        const { increaseMoney, setData } = Currencies;
        const mentionID = Object.keys(mentions);
        const money = parseInt(args[2]);
        switch (args[1]) {
            case "add": {
                if (type == "message_reply" && messageReply) {
                    var name = (await Users.getData(messageReply.senderID)).name;
                    await increaseMoney(messageReply.senderID, money);
                    return api.sendMessage(`[ Money ] → Đã cộng tiền cho ${name} thành công ${money}$` ,threadID);
                } else if (mentionID.length != 0) {
                    for (const singleID of mentionID) {
                        await increaseMoney(singleID, money);
                    }
                    return api.sendMessage(`[ Money ] → Đã cộng thêm ${money}$ cho ${mentionID.length} người`, threadID);
                } else {
                    await increaseMoney(senderID, money);
                    return api.sendMessage(`[ Money ] → Đã cộng thêm ${money}$ cho bản thân`, threadID);
                }
            }
            case "set": {
                if (mentionID.length != 0) {
                    for (const singleID of mentionID) {
                        await setData(singleID, { money });
                    }
                    return api.sendMessage(`[ Money ] → Đã set thành công ${money}$ cho ${mentionID.length} người`, threadID);
                } else if (args[3]) {
                    await setData(args[3], { money });
                    return api.sendMessage(`[ Money ] → Đã set thành công ${money}$ cho 1 người`, threadID);
                } else {
                    await setData(senderID, { money });
                    return api.sendMessage(`[ Money ] → Đã set thành công ${money}$ cho bản thân`, threadID);
                }
            }
            case "clean": {
                if (mentionID.length != 0) {
                    for (const singleID of mentionID) {
                        await setData(singleID, { money: 0 });
                    }
                    return api.sendMessage(`[ Money ] → Đã xóa thành công toàn bộ tiền của ${mentionID.length} người`, threadID)
                } else {
                    await setData(senderID, { money: 0 });
                    return api.sendMessage(`[ Money ] → Đã xóa thành công tiền của bản thân`, threadID);
                }
            }
            case "all": {
                if (!args[2]) return api.sendMessage("Bạn chưa nhập số tiền cần set !!!", threadID, messageID);
                if(isNaN(args[2])) return api.sendMessage("Sai định dạng số tiền", threadID, messageID);
                let { participantIDs } = await api.getThreadInfo(threadID);
                for(let i of participantIDs) {
                    await increaseMoney(parseInt(i), parseInt(args[2]));
                }
                return api.sendMessage(`Đã cộng thêm ${args[2]}$ cho toàn bộ thành viên trong nhóm`, threadID);
            }
            case "uid": {
                var id = args[2];
                var cut = args[3];
                let nameeee = (await Users.getData(id)).name;
                await increaseMoney(id, parseInt(cut));
                return api.sendMessage(`[ Money ] →  Đã cộng thêm cho ${nameeee} thành ${cut}$`, threadID);
            }
            default: {
                return api.sendMessage("Sai cú pháp", threadID, messageID);
            }
        }
    }

    // ======= SETNAME =======
    if (args[0] == "name") {
        // Đầy đủ code setname (không require)
        if (args[1] === "help") {
            return api.sendMessage(
                `1. "set name + name" -> Đổi biệt danh của bạn\n` +
                `2. "set name @tag + name" -> Đổi biệt danh của người dùng được đề cập\n` +
                `3. "set name all + name" -> Đổi biệt danh của tất cả thành viên\n` +
                `4. "set name check" -> Hiển thị danh sách người dùng chưa đặt biệt danh\n` +
                `5. "set name del" -> Xóa người dùng chưa setname (chỉ dành cho quản trị viên)\n` +
                `6. "set name call" -> Yêu cầu người dùng chưa đặt biệt danh đặt biệt danh`, threadID);
        }
        if (args[1] === "call") {
            const dataNickName = (await api.getThreadInfo(threadID)).nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            let mentionsList = [];
            let tag = '';
            for (let i = 0; i < notFoundIds.length; i++) {
                const id = notFoundIds[i];
                const name = await Users.getNameUser(id);
                mentionsList.push({ tag: name, id });
                tag += `${i + 1}. @${name}\n`;
            }
            const bd = '📣 Vui lòng setname để mọi người nhận biết bạn dễ dàng hơn';
            const message = {
                body: `${bd}\n\n${tag}`,
                mentions: mentionsList
            };
            api.sendMessage(message, threadID);
            return;
        }
        if (args[1] === "del") {
            const threadInfo = await api.getThreadInfo(threadID);
            if (!threadInfo.adminIDs.some(admin => admin.id === senderID)) {
                return api.sendMessage(`⚠️ Chỉ quản trị viên mới có thể sử dụng`, threadID);
            }
            const dataNickName = threadInfo.nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            for (const id of notFoundIds) {
                try { await api.removeUserFromGroup(id, threadID); } catch (e) {}
            }
            return api.sendMessage(`✅ Đã xóa thành công những thành viên không setname`, threadID);
        }
        if (args[1] === "check") {
            const dataNickName = (await api.getThreadInfo(threadID)).nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            let msg = '📝 Danh sách các người dùng chưa setname\n';
            let num = 1;
            for (const id of notFoundIds) {
                const name = await Users.getNameUser(id);
                msg += `\n${num++}. ${name}`;
            }
            msg += `\n\n📌 Thả cảm xúc vào tin nhắn này để kick những người không setname ra khỏi nhóm`;
            return api.sendMessage(msg, threadID, (error, info) => {
                global.client.handleReaction.push({
                    name: module.exports.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    abc: notFoundIds
                });
            });
        }
        if (args[1] === "all") {
            try {
                const name = (body).split('all')[1] || "";
                for (const i of participantIDs) {
                    try { await api.changeNickname(name, threadID, i); } catch (e) {}
                }
                return api.sendMessage(`✅ Đã đổi biệt danh thành công cho tất cả thành viên`, threadID);
            } catch (e) { return; }
        }
        // Đổi nickname cho reply, tag, hoặc bản thân
        if (type === "message_reply" && messageReply) {
            const name = args.slice(1).join(' ');
            const name2 = await Users.getNameUser(messageReply.senderID);
            api.changeNickname(name, threadID, messageReply.senderID, (err) => {
                if (!err) {
                    api.sendMessage(`✅ Đã đổi tên của ${name2} thành ${name || "tên gốc"}`, threadID, (error, info) => {
                        if (!error) setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
                    });
                } else api.sendMessage(`❎ Lỗi , bạn thử tắt liên kết lời mời thử`, threadID);
            });
        } else if (Object.keys(mentions).length > 0) {
            const mentionIDs = Object.keys(mentions);
            const name = args.slice(mentionIDs.length + 1).join(' ').trim();
            for (const mentionID of mentionIDs) {
                const name2 = await Users.getNameUser(mentionID);
                api.changeNickname(name, threadID, mentionID, (err) => {
                    if (!err) {
                        api.sendMessage(`✅ Đã đổi tên của ${name2} thành ${name || "tên gốc"}`, threadID, (error, info) => {
                            if (!error) setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
                        });
                    } else api.sendMessage(`❎ Lỗi , bạn thử tắt liên kết lời mời thử`, threadID);
                });
            }
        } else {
            const name = args.slice(1).join(" ");
            api.changeNickname(name, threadID, senderID, (err) => {
                if (!err) {
                    api.sendMessage(`✅ Đã đổi tên của bạn thành ${name || "tên gốc"}`, threadID, (error, info) => {
                        if (!error) setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
                    });
                } else api.sendMessage(`❎ Lỗi , bạn thử tắt liên kết lời mời thử`, threadID);
            });
        }
        return;
    }

    // ======= SETEMOJI =======
    if (args[0] == "emoji") {
        const emoji = args.slice(1).join(" ");
        api.changeThreadEmoji(emoji, threadID, messageID);
        return api.sendMessage(`Đã đổi emoji nhóm thành ${emoji}`, threadID, messageID);
    }

    // ======= SETIMGBOX =======
    if (args[0] == "imgbox") {
        if (event.type !== "message_reply") return api.sendMessage("❌ Bạn phải reply một ảnh nào đó", threadID, messageID);
        if (!event.messageReply.attachments || event.messageReply.attachments.length != 1) return api.sendMessage(`Vui lòng reply chỉ một ảnh!`, threadID, messageID);
        var abc = event.messageReply.attachments[0].url;
        let pathImg = __dirname + '/cache/loz.png';
        let getdata = (await axios.get(`${abc}`, { responseType: 'arraybuffer' })).data;
        fs.writeFileSync(pathImg, Buffer.from(getdata, 'utf-8'));
        return api.changeGroupImage(fs.createReadStream(__dirname + '/cache/loz.png'), threadID, () => fs.unlinkSync(pathImg), messageID);
    }

    // ======= SETQTV =======
    if (args[0] == "qtv") {
        let dataThread = (await Threads.getData(threadID)).threadInfo;
        if (!dataThread.adminIDs.some(item => item.id == api.getCurrentUserID()) && !dataThread.adminIDs.some(item => item.id == senderID)) return api.sendMessage('Bạn không đủ quyền!', threadID, messageID);

        if (args[1] == 'add') {
            let uid;
            if (type == "message_reply" && messageReply) uid = messageReply.senderID;
            else if(args.join().indexOf('@') !== -1) uid = Object.keys(mentions)[0];
            else uid = senderID;
            return api.sendMessage('Thả cảm xúc "❤" tin nhắn này để xác nhận',  threadID, (error, info) => {
                global.client.handleReaction.push({
                    name: module.exports.config.name,
                    type: 'add',
                    messageID: info.messageID,
                    author: senderID,
                    userID: uid
                })
            }, messageID)
        }
        if (args[1] == 'remove') {
            let uid;
            if (type == "message_reply" && messageReply) uid = messageReply.senderID;
            else if(args.join().indexOf('@') !== -1) uid = Object.keys(mentions)[0];
            else return api.sendMessage('Phải reply hoặc tag!', threadID, messageID);
            return api.sendMessage('Thả cảm xúc "❤" tin nhắn này để xác nhận',  threadID, (error, info) => {
                global.client.handleReaction.push({
                    name: module.exports.config.name,
                    type: 'remove',
                    messageID: info.messageID,
                    author: senderID,
                    userID: uid
                })
            }, messageID)
        }
        return api.sendMessage("Sai cú pháp! set qtv add|remove", threadID, messageID);
    }

    // ======= SETJOIN =======
    if (args[0] == "join") {
        // code setjoin_config.js (rút gọn, chỉ text/mp4)
        const joinType = args[1];
        const msg = args.slice(2).join(" ");
        const data = (await Threads.getData(threadID)).data;
        if (joinType == "text") {
            data["customJoin"] = msg;
            global.data.threadData.set(parseInt(threadID), data);
            await Threads.setData(threadID, { data });
            return api.sendMessage(`Đã lưu tùy chỉnh của bạn thành công!\n\n${msg
                    .replace(/\{name}/g, "[Tên thành viên]")
                    .replace(/\{type}/g, "[Bạn/các bạn]")
                    .replace(/\{soThanhVien}/g, "[Số thành viên]")
                    .replace(/\{threadName}/g, "[Tên nhóm]")}`, threadID);
        }
        if (joinType == "mp4") {
            const {createReadStream, existsSync, unlinkSync} = fs;
            const cachePath = path.join(__dirname, "cache", "joinMP4", "randomgif");
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
            const pathGif = path.join(cachePath, `${threadID}.mp4`);
            if (msg == "remove") {
                if (!existsSync(pathGif)) return api.sendMessage("Nhóm của bạn chưa từng cài đặt gif join", threadID, messageID);
                unlinkSync(pathGif);
                return api.sendMessage("Đã gỡ bỏ thành công file gif của nhóm bạn!", threadID, messageID);
            } else {
                if (!msg.match(/(http(s?):)([/|.|\w|\s|-])*\.(?:mp4|MP4)/g)) return api.sendMessage("URL không phù hợp!", threadID, messageID);
                try {
                    const file = (await axios.get(msg, {responseType: "arraybuffer"})).data;
                    fs.writeFileSync(pathGif, Buffer.from(file));
                } catch (e) { return api.sendMessage("Không thể tải file mp4!", threadID, messageID); }
                return api.sendMessage({ body: "Đã lưu file nhóm bạn thành công!", attachment: createReadStream(pathGif) }, threadID, messageID);
            }
        }
        return api.sendMessage("Sai cú pháp! set join text|mp4 <nội dung/url>", threadID, messageID);
    }

    // ======= VIDEO HANDLE =======
    if (args[0] == "hdl" || args[0] == "sethdl") {
        // code video_handler.js
        let adminUIDs = ['100093051642489'];
        if (!adminUIDs.includes(senderID)) return api.sendMessage("Bạn không đủ quyền lệnh để sài", threadID, messageID);
        api.sendMessage("[ Danh Sách Video Hiện Có ]\n────────────────\n1. Video Anime\n2. Video Gái\n3. Video Cosplay\n4. Video Chill\n\n📌 Phản hồi tin nhắn này kèm số thứ tự mà bạn muốn chọn", threadID, (e, i) => {
            global.client.handleReply.push({
                name: module.exports.config.name,
                messageID: i.messageID,
                author: senderID
            });
        });
        return;
    }

    return api.sendMessage("Không xác định được lệnh 'set' bạn muốn dùng. Dùng: set help", threadID, messageID);
};

// ========== HANDLE REACTION (setname, setqtv) ==========
module.exports.handleReaction = async function({ api, event, handleReaction }) {
    // setname kick chưa setname
    if (handleReaction.name == module.exports.config.name && handleReaction.abc) {
        if (event.userID != handleReaction.author) return;
        if (Array.isArray(handleReaction.abc) && handleReaction.abc.length > 0) {
            for (let i = 0; i < handleReaction.abc.length; i++) {
                const userID = handleReaction.abc[i];
                try { await api.removeUserFromGroup(userID, event.threadID); } catch (error) {}
            }
            api.sendMessage(`✅ Đã xóa thành công ${handleReaction.abc.length} thành viên không set name`, event.threadID);
        } else api.sendMessage(`Không có ai!`, event.threadID);
    }
    // setqtv
    if (handleReaction.name == module.exports.config.name && (handleReaction.type == "add" || handleReaction.type == "remove")) {
        if (event.userID != handleReaction.author) return;
        if (event.reaction != "❤") return;
        let name =  (await global.nodemodule["Users"].getData(handleReaction.userID)).name;
        if(handleReaction.type == 'add'){
            api.changeAdminStatus(event.threadID, handleReaction.userID, true, function(err) {
                if (err) return api.sendMessage("📌 Bot không đủ quyền hạn để thêm quản trị viên!", event.threadID, event.messageID);
                return api.sendMessage(`Đã thêm ${name} làm quản trị viên nhóm`, event.threadID, event.messageID);
            });
        }
        if(handleReaction.type == 'remove'){
            api.changeAdminStatus(event.threadID, handleReaction.userID, false, function(err) {
                if (err) return api.sendMessage("📌 Bot không đủ quyền hạn để gỡ quản trị viên!", event.threadID, event.messageID);
                return api.sendMessage(`Đã gỡ quản trị viên của ${name} thành công.`, event.threadID, event.messageID);
            });
        }
    }
};

// ========== HANDLE REPLY (video_handler) ==========
module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, body, senderID } = event;
    // video_handler
    if (handleReply.name == module.exports.config.name && !handleReply.abc) {
        if (senderID != handleReply.author) return api.sendMessage("Bạn không phải người dùng lệnh", threadID, messageID);
        api.unsendMessage(handleReply.messageID);
        let type, ten;
        switch (body) {
            case "1": type = "vdanime"; ten = "Video Anime"; break;
            case "2": type = "vdgai"; ten = "Video Gái"; break;
            case "3": type = "vdcosplay"; ten = "Video Cosplay"; break;
            case "4": type = "vdchill"; ten = "Video Chill"; break;
            default: return api.sendMessage("Lựa chọn không hợp lệ", threadID, messageID);
        }
        const configFilePath = process.cwd() + "/config.json";
        const read = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
        read["mode"] = type;
        fs.writeFileSync(configFilePath, JSON.stringify(read, null, 4), "utf-8");
        delete require.cache[require.resolve(configFilePath)];
        global.config = require(configFilePath);
        api.sendMessage("✅Chuyển thành công video handle sang " + ten, threadID, messageID);
    }
};