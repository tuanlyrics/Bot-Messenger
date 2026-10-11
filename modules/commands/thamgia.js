const axios = require("axios");
const fs = require("fs-extra");
const request = require("request");

module.exports.config = {
  name: "thamgia",
  version: "1.0.0",
  hasPermission: 3, // fix chính tả
  credits: "cherry (fix by ntkhang & pcoder)",
  description: "Tham gia vào nhóm mà bot đang ở",
  commandCategory: "Hệ thống",
  usages: "thamgia",
  cooldowns: 0,
  dependencies: {
    "request": "",
    "fs-extra": "",
    "axios": ""
  }
};

module.exports.handleReply = async ({ event, api, handleReply }) => {
  const { threadID, messageID, body, senderID } = event;
  const { threadList, author } = handleReply;

  if (senderID !== author) return;
  api.unsendMessage(handleReply.messageID);

  const choice = Number(body);
  if (!choice) return api.sendMessage("[⚜️]➜ Lựa chọn của bạn phải là một số.", threadID, messageID);
  if (!threadList[choice - 1]) return api.sendMessage("[⚜️]➜ Lựa chọn của bạn không nằm trong danh sách.", threadID, messageID);

  try {
    const threadInfo = threadList[choice - 1];
    const { participantIDs } = threadInfo;

    if (participantIDs.includes(senderID))
      return api.sendMessage("[⚜️]➜ Bạn đã có mặt trong nhóm này.", threadID, messageID);

    api.addUserToGroup(senderID, threadInfo.threadID, (e) => {
      if (e) return api.sendMessage(`[⚜️]➜ Đã xảy ra lỗi: ${e.errorDescription || e}`, threadID, messageID);
      return api.sendMessage(`[⚜️]➜ Bot đã thêm bạn vào nhóm "${threadInfo.name}". Nếu không thấy box, kiểm tra mục spam hoặc tin nhắn chờ nhé.`, threadID, messageID);
    });
  } catch (error) {
    return api.sendMessage(`[⚜️]➜ Bị lỗi: ${error}`, threadID, messageID);
  }
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID, senderID } = event;
  let allThreads = (await api.getThreadList(500, null, ["INBOX"])).filter(i => i.isGroup);

  if (allThreads.length === 0) return api.sendMessage("[⚜️]➜ Bot không có nhóm nào để bạn tham gia.", threadID, messageID);

  let msg = "[⚜️]➜ Danh sách tất cả các box bạn có thể tham gia:\n\n";
  allThreads.forEach((thread, index) => {
    msg += `${index + 1}. ${thread.name}\n`;
  });
  msg += `\n[⚜️]➜ Reply tin nhắn này kèm số tương ứng với box mà bạn muốn vào.`;

  return api.sendMessage(msg, threadID, (err, info) => {
    if (err) return;
    global.client.handleReply.push({
      name: this.config.name, // bỏ khoảng trắng
      messageID: info.messageID,
      author: senderID,
      threadList: allThreads
    });
  }, messageID);
};
