module.exports.config = {
  name: "a4",
  version: "1.0.3",
  hasPermssion: 0,
  credits: "pcoders",
  description: "Nhắn từ khóa gái sẽ random video gái",
  commandCategory: "Người dùng",
  usages: "",
  cooldowns: 0,
  dependencies: {
    "fs-extra": "",
    "request": ""
  }
};

const path = require("path");

const keyWords = [
/*
  "gái", "gai", "girl", "Gái", "Gai", "Girl",

  // video clip
  "video gái", "video gai", "Video gái", "Video Gái", "clip gái", "clip gai", "video girl", "clip girl",
  "clip gái xinh", "video gái xinh", "video gai xinh", "xem gái", "xem clip gái",

  // các cụm phổ biến
  "gái xinh", "gai xinh", "Gái xinh", "Gai xinh", "trời ơi gái xinh kìa", "gái đẹp", "gái cute", "gái hot",
  "gái sexy", "gái dễ thương", "gái ngon", "gái mlem", "mlem mlem", "gái đỉnh", "gái body đẹp", "ảnh gái",

  // thả thính, gọi bot
  "bot ơi gái xinh đâu", "bot gửi gái", "bot show gái", "bot gái xinh", "bot cho xin gái",
  "cho tao gái", "cho gái đi", "cho xin gái", "xin gái", "gửi gái đi", "cho xem gái", "show gái", "share gái",

  // viết không dấu + biến thể
  "gai xinh dau", "cho xem gai", "clip gai xinh", "video gai xinh", "cho tao gai", "gai sexy", "gai cute", "gai ngon",
  "cho gai", "xem gai xinh", "cho xin gai", "tai gai xinh", "down gai", "video gai ngon", "gai dep", "gai de thuong",

  // tiếng Anh
  "hot girl", "pretty girl", "sexy girl", "cute girl", "asian girl", "vietnamese girl", "school girl", "model girl",
  "tiktok girl", "dance girl", "girl video", "girl clip", "beautiful girl", "cute girl dancing",

  // từ lóng/meme
  "múp", "mup", "mlem", "gái múp", "bím", "bụng múp", "quẩy gái", "gái quẩy", "gái nhảy", "gái búm", "gái nhí nhố",
  "girl uwu", "gái uwu", "bướm đẹp", "mlem gái", "mông to", "ngực to", "tâm hồn to", "ảnh tâm hồn", "trà sữa biết đi",

  // emoji có thể kích hoạt
  "👙", "🍑", "🍒", "😍", "🥵", "🤤", "👀", "💋", "💃", "😘" */
];

const keyWordsLower = keyWords.map(k => k.toLowerCase());

module.exports.handleEvent = async ({ api, event }) => {
  if (!event.body) return;
  const msg = event.body.toLowerCase();
  if (!keyWordsLower.some(keyword => msg.indexOf(keyword) === 0)) return;

  // Nếu có sẵn video trong global.khanhdayr thì lấy luôn, không tải lại
  if (global.khanhdayr && Array.isArray(global.khanhdayr) && global.khanhdayr.length > 0) {
    const body = "Hình như bạn muốn xem gái thì phải\nChờ mình xíu mình gửi liền.";
    const attach = global.khanhdayr.splice(0, 1);
    return api.sendMessage({
      body,
      attachment: attach
    }, event.threadID, event.messageID);
  }

  const request = global.nodemodule["request"];
  const fs = global.nodemodule["fs-extra"];

  // Đọc link video từ file JSON
  const dataJsonPath = path.join(__dirname, "pdata", "data_dongdev", "datajson", "vdgai.json");
  let link = [];
  try {
    link = JSON.parse(fs.readFileSync(dataJsonPath));
    if (!Array.isArray(link) || link.length === 0) throw new Error("Không có video nào trong file vdgai.json");
  } catch (e) {
    return api.sendMessage("Không tìm được danh sách video hoặc file vdgai.json bị lỗi!", event.threadID, event.messageID);
  }

  // Thư mục cache
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const outPath = path.join(cacheDir, "vdgai.mp4");
  const randomLink = link[Math.floor(Math.random() * link.length)];

  api.sendMessage("Hình như bạn muốn xem gái thì phải\nChờ mình xíu mình gửi liền.", event.threadID, event.messageID);

  const callback = () => {
    api.sendMessage({
      body: `Số video hiện có: ${link.length}`,
      attachment: fs.createReadStream(outPath)
    }, event.threadID, () => fs.unlinkSync(outPath), event.messageID);
  };

  request(encodeURI(randomLink))
    .pipe(fs.createWriteStream(outPath))
    .on("close", () => {
      // Kiểm tra file size > 0 để xác định link còn sống
      fs.stat(outPath, (err, stats) => {
        if (err || !stats || stats.size === 0) {
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
          return api.sendMessage("Rất tiếc, video này đã bị xóa hoặc link die. Thử lại nhé!", event.threadID, event.messageID);
        }
        callback();
      });
    })
    .on("error", () => {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      api.sendMessage("Lỗi khi tải video. Vui lòng thử lại!", event.threadID, event.messageID);
    });
};

module.exports.run = async () => { };