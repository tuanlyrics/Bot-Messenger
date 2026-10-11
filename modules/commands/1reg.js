// được code bởi Pcoder , xin vui lòng 0 thay đổi credits 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

module.exports = {
    config: {
        name: "regbox",
        version: "7.0",
        author: "pcoder",
        description: "Chia nhóm đúng số lượng yêu cầu, không đủ người vẫn tạo đủ nhóm.",
        commandCategory: "Tiện ích",
        usages: ".regbox <tên nhóm> <số nhóm> [@tag hoặc UID ...|random]",
        cooldowns: 10
    },

    run: async function({ api, event, args }) {
        const { threadID, messageID, senderID, mentions } = event;

        if (args.length < 2) {
            return api.sendMessage(
                "❌ Sai cú pháp!\nCách dùng: .regbox <tên nhóm> <số nhóm> [@tag hoặc UID ...|random]",
                threadID, messageID
            );
        }

        let shouldShuffle = false;
        if (args[args.length-1].toLowerCase?.() === "random") {
            shouldShuffle = true;
            args.pop();
        }

        const groupName = args[0];
        const groupCount = parseInt(args[1]);
        if (isNaN(groupCount) || groupCount < 1)
            return api.sendMessage("❌ Số nhóm phải là số nguyên >= 1.", threadID, messageID);

        let mentionedUserIDs = Object.keys(mentions);
        if (mentionedUserIDs.length === 0 && args.length > 2) {
            const uidArgs = args.slice(2).filter(x => /^\d{5,}$/.test(x));
            mentionedUserIDs = uidArgs;
        }

        if (mentionedUserIDs.length > 0) {
            if (shouldShuffle) shuffleArray(mentionedUserIDs);
            return module.exports.splitGroup({ api, event, groupName, groupCount, userIDs: mentionedUserIDs, shouldShuffle });
        }

        if (shouldShuffle && mentionedUserIDs.length === 0) {
            const threadInfo = await api.getThreadInfo(threadID);
            let userIDs = threadInfo.participantIDs.filter(uid => uid != api.getCurrentUserID());
            shuffleArray(userIDs);
            return module.exports.splitGroup({ api, event, groupName, groupCount, userIDs, shouldShuffle });
        }

        if (!global.pendingRegbox) global.pendingRegbox = {};
        global.pendingRegbox[threadID] = {
            senderID,
            groupName,
            groupCount,
            shouldShuffle,
            messageID
        };
        return api.sendMessage(
            "➡️ Vui lòng reply lại tin nhắn này với UID hoặc tag thành viên để chia nhóm!",
            threadID, messageID
        );
    },

    handleReply: async function({ api, event }) {
        const { threadID, messageID, senderID, mentions, body } = event;
        const pending = global.pendingRegbox?.[threadID];
        if (!pending || senderID !== pending.senderID) return;

        let mentionedUserIDs = Object.keys(mentions);
        if (mentionedUserIDs.length === 0) {
            const uidMatches = (body.match(/\d{5,}/g) || []);
            if (uidMatches.length === 0) {
                return api.sendMessage("❌ Không tìm thấy UID hoặc tag nào trong reply!", threadID, messageID);
            }
            mentionedUserIDs = uidMatches;
        }

        delete global.pendingRegbox[threadID];
        return module.exports.splitGroup({
            api,
            event,
            groupName: pending.groupName,
            groupCount: pending.groupCount,
            userIDs: mentionedUserIDs,
            shouldShuffle: pending.shouldShuffle
        });
    },

    splitGroup: async function({ api, event, groupName, groupCount, userIDs, shouldShuffle }) {
        const { threadID, messageID, senderID } = event;

        if (shouldShuffle) shuffleArray(userIDs);

        const groups = Array.from({ length: groupCount }, () => [senderID]);

        let idx = 0;
        for (const uid of userIDs) {
            groups[(idx++ % groupCount)].push(uid);
        }

        let created = 0, failed = 0;
        for (let i = 0; i < groupCount; i++) {
            try {
                const newThreadID = await new Promise((resolve, reject) => {
                    api.createNewGroup(groups[i], `${groupName} #${i + 1}`, (err, id) => {
                        if (err) return reject(err);
                        resolve(id);
                    });
                });
                created++;
                await api.sendMessage(`🎉 Nhóm "${groupName} #${i + 1}" đã được tạo!`, newThreadID);
                await sleep(800);
            } catch {
                failed++;
                await sleep(600);
            }
        }

        let msg = `✅ Đã tạo xong nhóm!\nSố nhóm thành công: ${created}/${groupCount}`;
        if (failed) msg += `\n❌ Thất bại: ${failed}`;
        if (shouldShuffle) msg += `\n⚡ Chia ngẫu nhiên`;
        return api.sendMessage(msg, threadID, messageID);
    }
};