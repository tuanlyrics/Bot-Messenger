const fs = require("fs-extra");
const path = __dirname + "/cache/antilink.json";

module.exports.config = {
  name: "antilink",
  version: "1.1.2",
  hasPermssion: 1,
  description: "Tự động kick bất kỳ ai gửi link trong nhóm (trừ quản trị viên)",
  commandCategory: "Quản trị nhóm",
  usages: "[on/off]",
  cooldowns: 5
};

module.exports.handleEvent = async function ({ event, api }) {
  const { threadID, senderID, body } = event;
  if (!body || senderID == api.getCurrentUserID()) return;

  const linkRegex = /(https?:\/\/[^\s]+)/i;

  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}));
  const data = JSON.parse(fs.readFileSync(path));

  if (data[threadID] !== true) return;

  if (linkRegex.test(body)) {
    const threadInfo = await api.getThreadInfo(threadID);

    const isBotAdmin = threadInfo.adminIDs.some(ad => ad.id == api.getCurrentUserID());
    if (!isBotAdmin) return api.sendMessage("⚠️ BOT KHÔNG PHẢI ADMIN NÊN KHÔNG THỂ KICK.", threadID);

    const isSenderAdmin = threadInfo.adminIDs.some(ad => ad.id == senderID);
    if (isSenderAdmin) return; // QTV gửi link thì bỏ qua

    api.removeUserFromGroup(senderID, threadID, err => {
      if (err) {
        console.log("Không thể kick:", err);
        return api.sendMessage("⚠️ KHÔNG THỂ KICK NGƯỜI GỬI LINK (CÓ THỂ DO BOT KHÔNG ĐỦ QUYỀN).", threadID);
      } else {
        return api.sendMessage(`🚫 PHÁT HIỆN LINK! ĐÃ KICK ID: ${senderID}`, threadID);
      }
    });
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const data = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {};

  const status = args[0]?.toLowerCase();
  if (status === "on") {
    data[threadID] = true;
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return api.sendMessage(
      "✅ ĐÃ BẬT CHẾ ĐỘ ANTI-LINK!\n🔒 CHỈ CÓ QUẢN TRỊ VIÊN NHÓM MỚI ĐƯỢC GỬI LINK.\n🚫 THÀNH VIÊN GỬI LINK SẼ BỊ KICK NGAY LẬP TỨC.",
      threadID,
      messageID
    );
  } else if (status === "off") {
    delete data[threadID];
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return api.sendMessage("❌ ĐÃ TẮT CHẾ ĐỘ ANTI-LINK.", threadID, messageID);
  } else {
    return api.sendMessage("📌 DÙNG LỆNH: antilink on / off", threadID, messageID);
  }
};
