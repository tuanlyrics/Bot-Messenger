// unban.js
module.exports.config = {
    name: "unban1",
    version: "1.0.1",
    hasPermssion: 2,
    credits: "cc",
    description: "Gỡ ban nhóm hoặc người dùng",
    commandCategory: "Admin",
    usages: "[threadID | userID] - Bỏ trống để gỡ nhóm hiện tại",
    cooldowns: 3
};

module.exports.run = async ({ api, event, args, Threads }) => {
    const threadID = args[0] || event.threadID;

    let unbanned = false;

    // Gỡ trong DB Threads
    try {
        let data = (await Threads.getData(threadID)).data || {};
        if (data.banned) {
            data.banned = false;
            delete data.reason;
            delete data.dateAdded;
            await Threads.setData(threadID, { data });
            unbanned = true;
        }
    } catch (e) {}

    // Gỡ trong global.data.threadBanned
    if (global.data.threadBanned.has(threadID)) {
        global.data.threadBanned.delete(threadID);
        unbanned = true;
    }

    if (unbanned) {
        return api.sendMessage(`✅ Đã gỡ ban nhóm ${threadID}.`, event.threadID);
    } else {
        return api.sendMessage(`ℹ ID ${threadID} hiện không bị ban.`, event.threadID);
    }
};

