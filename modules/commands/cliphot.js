const axios = require("axios");
const cheerio = require("cheerio");

module.exports.config = {
  name: "cliphot",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "",
  description: "Tìm kiếm video từ clipphot.net",
  commandCategory: "Tiện ích",
  usages: "[từ khóa]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const keyword = args.join(" ");
  if (!keyword) return api.sendMessage("📌 Vui lòng nhập từ khóa tìm kiếm.", threadID, messageID);

  api.sendMessage(`🔍 Đang tìm kiếm: "${keyword}"...`, threadID);

  try {
    const res = await axios.get(`https://clipphot.net/?s=${encodeURIComponent(keyword)}`);
    const $ = cheerio.load(res.data);
    const results = [];

    $(".post").each((i, el) => {
      const title = $(el).find("h2.entry-title").text().trim();
      const link = $(el).find("h2.entry-title a").attr("href");
      if (title && link) results.push({ title, link });
    });

    if (results.length === 0)
      return api.sendMessage(`❌ Không tìm thấy kết quả nào cho: "${keyword}"`, threadID, messageID);

    const listText = results.map((r, i) => `${i + 1}. ${r.title}`).join("\n");
    const msg = `📄 Kết quả tìm được:\n${listText}\n\n📩 Reply số để nhận link video.`;

    api.sendMessage(msg, threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID, // để gỡ sau
        author: senderID,
        results
      });
    });
  } catch (err) {
    console.error(err);
    return api.sendMessage("❌ Đã xảy ra lỗi khi tìm kiếm.", threadID, messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  if (senderID !== handleReply.author) return;

  const index = parseInt(body);
  if (isNaN(index) || index < 1 || index > handleReply.results.length)
    return api.sendMessage("❌ Vui lòng chọn số hợp lệ trong danh sách.", threadID, messageID);

  const chosen = handleReply.results[index - 1];
  const msg = `🎬 Tiêu đề: ${chosen.title}\n\n🔗 Link xem/tải của bạn đây:\n${chosen.link}`;

  api.sendMessage(msg, threadID, () => {
    // Gỡ tin nhắn chứa danh sách + tin nhắn người dùng reply số
    api.unsendMessage(handleReply.messageID); // gỡ tin nhắn kết quả
    api.unsendMessage(messageID); // gỡ tin nhắn người dùng chọn số
  });
};
