module.exports = function ({ Users, Threads, Currencies }) {
  const logger = require("../../utils/log.js");
  return async function ({ event }) {
    const { allUserID, allCurrenciesID, allThreadID, userName, threadInfo } = global.data;
    const { autoCreateDB } = global.config;

    if (!autoCreateDB) return;

    const { senderID, threadID, isGroup } = event;
    const stringSenderID = String(senderID);
    const stringThreadID = String(threadID);

    try {
      if (!allThreadID.includes(stringThreadID) && isGroup) {
        const threadData = await Threads.getInfo(stringThreadID);

        // Kiểm tra null hoặc undefined
        if (!threadData) {
          logger(`Không lấy được thông tin nhóm với threadID: ${stringThreadID}`, "〘 LOADING DATABASE 〙");
          return;
        }

        const setting = {
          threadName: threadData.threadName || "Không xác định",
          adminIDs: threadData.adminIDs || [],
          nicknames: threadData.nicknames || {},
        };

        allThreadID.push(stringThreadID);
        global.data.threadInfo.set(stringThreadID, setting);

        const setting2 = {
          threadInfo: setting,
          data: {},
        };

        await Threads.setData(stringThreadID, setting2);

        if (Array.isArray(threadData.userInfo)) {
          for (const singleData of threadData.userInfo) {
            const stringUserID = String(singleData.id);
            userName.set(stringUserID, singleData.name || "Không xác định");

            try {
              if (allUserID.includes(stringUserID)) {
                await Users.setData(stringUserID, {
                  name: singleData.name || "Không xác định",
                });
              } else {
                await Users.createData(stringUserID, {
                  name: singleData.name || "Không xác định",
                  data: {},
                });
                allUserID.push(stringUserID);

                logger(`Load Data Người Dùng Mới - [ UID: ${stringUserID} | NAME: ${singleData.name || "Không xác định"} ]`, "〘 LOADING DATABASE 〙");
              }
            } catch (e) {
              console.log(e);
            }
          }
        }

        logger(`Load Data Nhóm Mới - [ TID: ${stringThreadID} | Tên Nhóm: ${setting.threadName} ]`, "〘 LOADING DATABASE 〙");
      }

      if (!allUserID.includes(stringSenderID) || !userName.has(stringSenderID)) {
        const infoUsers = await Users.getInfo(stringSenderID);

        if (!infoUsers) {
          logger(`Không lấy được thông tin người dùng với senderID: ${stringSenderID}`, "〘 LOADING DATABASE 〙");
          return;
        }

        const setting3 = {
          name: infoUsers.name || "Không xác định",
        };

        await Users.createData(stringSenderID, setting3);
        allUserID.push(stringSenderID);
        userName.set(stringSenderID, infoUsers.name || "Không xác định");

        logger(`Load Data Người Dùng Mới - [ UID: ${stringSenderID} | NAME: ${infoUsers.name || "Không xác định"} ]`, "〘 LOADING DATABASE 〙");
      }

      if (!allCurrenciesID.includes(stringSenderID)) {
        const setting4 = {
          data: {},
        };

        await Currencies.createData(stringSenderID, setting4);
        allCurrenciesID.push(stringSenderID);
      }
      return;
    } catch (err) {
      console.log(err);
    }
  };
};