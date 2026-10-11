// ===========================================================
// 🌀 RESEND - Xem lại tin nhắn bị gỡ (WS3-FCA Compatible)
// ===========================================================

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "resend",
  version: "2.1.0",
  hasPermssion: 1,
  credits: "Thọ, ManhG, PCODER Fix for WS3-FCA",
  description: "Xem lại tin nhắn bị gỡ (auto resend)",
  commandCategory: "Nhóm",
  usages: "",
  cooldowns: 0,
  hide: true
};

const cacheDir = path.join(__dirname, "cache");
fs.ensureDirSync(cacheDir);

module.exports.handleEvent = async function ({ event, api, Users, Threads }) {
  try {
    const { messageID, senderID, threadID, body: content, type, attachments } = event;
    if (!global.logMessage) global.logMessage = new Map();
    if (!global.data.botID) global.data.botID = api.getCurrentUserID?.() || "";

    const thread = global.data.threadData?.get(threadID) || {};
    if (thread.resend === true) return; // nếu nhóm đang tắt auto resend
    if (senderID === global.data.botID) return;

    // === Lưu lại tin nhắn bình thường ===
    if (type !== "message_unsend") {
      global.logMessage.set(messageID, { msgBody: content || "", attachment: attachments || [] });
      return;
    }

    // === Khi bị gỡ ===
    const oldMsg = global.logMessage.get(messageID);
    if (!oldMsg) return;

    const name = await Users.getNameUser(senderID) || "Người dùng";
    const msgBody = oldMsg.msgBody || "(Không có nội dung)";
    const atts = oldMsg.attachment || [];

    // --- Nếu không có tệp đính kèm ---
    if (atts.length === 0) {
      return api.sendMessage(
        `📛 ${name} vừa gỡ một tin nhắn:\n──────────────────\n${msgBody}`,
        threadID
      );
    }

    // --- Nếu có tệp đính kèm ---
    const files = [];
    for (let i = 0; i < atts.length; i++) {
      const url = atts[i].url;
      if (!url) continue;
      try {
        const res = await axios.get(url, { responseType: "arraybuffer" });
        const ext = path.extname(url.split("?")[0]) || ".bin";
        const filePath = path.join(cacheDir, `resend_${Date.now()}_${i}${ext}`);
        await fs.writeFile(filePath, Buffer.from(res.data));
        files.push(fs.createReadStream(filePath));
      } catch (err) {
        console.error(`[resend] lỗi tải tệp: ${url}`, err.message);
      }
    }

    const msg = {
      body: `🔰 ${name} vừa gỡ ${atts.length} tệp đính kèm.\n──────────────────\n${msgBody}`,
      attachment: files
    };

    await api.sendMessage(msg, threadID);
  } catch (err) {
    console.error("❌ [handleEvent] resend error:", err);
  }
};

module.exports.languages = {
  vi: {
    on: "𝗕𝗮̣̂𝘁",
    off: "𝗧𝗮̆́𝘁",
    successText: "𝗿𝗲𝘀𝗲𝗻𝗱 𝘁𝗵𝗮̀𝗻𝗵 𝗰𝗼̂𝗻𝗴 💖",
  },
  en: {
    on: "on",
    off: "off",
    successText: "resend success!",
  },
};

module.exports.run = async function ({ api, event, Threads, getText }) {
  const { threadID, messageID } = event;
  let data = (await Threads.getData(threadID)).data || {};

  data.resend = !data.resend;
  await Threads.setData(threadID, { data });
  global.data.threadData.set(threadID, data);

  return api.sendMessage(
    `${data.resend ? getText("off") : getText("on")} ${getText("successText")}`,
    threadID,
    messageID
  );
};
