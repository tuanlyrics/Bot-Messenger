const moment = require("moment-timezone");

module.exports.config = {
  name: "fixspam",
  version: "1.3.2",
  hasPermssion: 2,
  credit: "ManhG + Mod by PCoder + Chỉnh bởi GPT",
  description: "Tự động ban khi chửi bot (không reply, luôn bật, chỉ ban cá nhân, kèm share contact admin)",
  commandCategory: "Hệ thống",
  usages: "",
  cooldowns: 0
};

module.exports.handleEvent = async ({ event, api, Users, Threads }) => {
  const { threadID, body, senderID } = event;
  if (senderID == global.data.botID || !body) return;

  const badWords = [
    "bot óc chó", "bot lồn", "bot ngu", "bot gà", "bot lol", "bot chó",
    "dm bot", "dmm bot", "clm bot", "bot ghẻ", "đmm bot", "đb bot",
    "bot điên", "bot dở", "đĩ bot", "con bot lồn", "cmm bot", "cc bot",
    "bot sida", "bot xàm", "bot fake", "bot súc vật", "bot đểu"
  ];

  const text = body.toLowerCase();
  if (!badWords.some(word => text.includes(word))) return;

  const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
  const name = await Users.getNameUser(senderID);
  const threadInfo = (await Threads.getData(threadID)).threadInfo || {};

  if (global.data.userBanned.has(senderID)) return;

  let dataUser = (await Users.getData(senderID)).data || {};
  dataUser.banned = 1;
  dataUser.reason = `Chửi bot: "${text}"`;
  dataUser.dateAdded = time;
  await Users.setData(senderID, { data: dataUser });
  global.data.userBanned.set(senderID, { reason: dataUser.reason, dateAdded: time });

  // Gửi tin nhắn thông báo
  await api.sendMessage(
    `${name}, bạn đã bị ban vì chửi bot.\nLý do: ${dataUser.reason}\nThời gian: ${time}\nLiên hệ admin để gỡ ban.`,
    threadID
  );

  // Share contact admin
  const adminUID = "100047128875560"; // UID admin
  await api.shareContact("Liên hệ admin để gỡ ban", adminUID, threadID);

  // Gửi thông báo cho admin bot
  for (let adminID of global.config.ADMINBOT) {
    api.sendMessage(
      `=== BOT NOTIFY ===\n👤 Người: ${name}\n🆔 UID: ${senderID}\n💬 Box: ${threadInfo.threadName || "Unknown"}\n📌 Từ chửi: ${text}\n⏰ Thời gian: ${time}`,
      adminID
    );
  }
};

module.exports.run = async function () {};
