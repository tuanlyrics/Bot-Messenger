const { loadImage, createCanvas, registerFont } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (concac1, concac2, concac3, concac4, concac5) {
    if (concac3 < 2 * concac5) concac5 = concac3 / 2;
    if (concac4 < 2 * concac5) concac5 = concac4 / 2;
    this.beginPath();
    this.moveTo(concac1 + concac5, concac2);
    this.arcTo(concac1 + concac3, concac2, concac1 + concac3, concac2 + concac4, concac5);
    this.arcTo(concac1 + concac3, concac2 + concac4, concac1, concac2 + concac4, concac5);
    this.arcTo(concac1, concac2 + concac4, concac1, concac2, concac5);
    this.arcTo(concac1, concac2, concac1 + concac3, concac2, concac5);
    this.closePath();
    return this;
  };
}

const concac6 = path.join(__dirname, "fonts", "SVN-ProductSans-Bold.otf");
if (fs.existsSync(concac6)) {
  registerFont(concac6, { family: "ProductSans" });
}

const concac7 = path.join(__dirname, "workbg.jpg");

const concac8 = [
  { name: "Bắn Free Fire", emoji: "⚔️", color: "#ff995e" },
  { name: "Làm thuê", emoji: "🏢", color: "#86b8fa" },
  { name: "Chặt gỗ", emoji: "🪵", color: "#a9d08e" },
  { name: "Rèn kiếm", emoji: "🛠️", color: "#f5c242" },
  { name: "Thử thách", emoji: "📑", color: "#ff90c2" },
  { name: "Rèn giáp", emoji: "⚒️", color: "#a5816f" },
  { name: "Giết người", emoji: "🗡️", color: "#d94862" },
  { name: "Khai thác", emoji: "⛏️", color: "#9be7ff" }
];

module.exports.config = {
  name: "workcanvas",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Pcoder",
  description: "Làm việc kiếm tiền, trả kết quả bằng ảnh canvas đẹp chuẩn game",
  commandCategory: "Kiếm Tiền",
  cooldowns: 5
};

function concac9(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function concac10(ctx, text, x, y, maxWidth, fontSize, fontFamily = "ProductSans", color = "#fff", shadow = true) {
  ctx.font = `bold ${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = "#222";
    ctx.shadowBlur = 6;
  }
  ctx.fillText(text, x, y, maxWidth);
  ctx.shadowBlur = 0;
}

async function concac11({ name, avatarUrl, job, money, jobDesc, streak, level, lastMoney, color }) {
  let concac12;
  if (fs.existsSync(concac7)) {
    concac12 = await loadImage(concac7);
  } else {
    concac12 = null;
  }
  const concac13 = createCanvas(800, 450);
  const concac14 = concac13.getContext("2d");

  if (concac12) {
    concac14.drawImage(concac12, 0, 0, 800, 450);
  } else {
    concac14.fillStyle = color || "#1b2028";
    concac14.fillRect(0, 0, 800, 450);
  }
  concac14.fillStyle = "rgba(0,0,0,0.37)";
  concac14.fillRect(0, 0, 800, 450);

  let concac15 = null;
  try {
    const concac16 = await loadImage(avatarUrl);
    concac15 = concac16;
  } catch {}
  if (concac15) {
    concac14.save();
    concac14.beginPath();
    concac14.arc(108, 120, 60, 0, Math.PI * 2, true);
    concac14.closePath();
    concac14.clip();
    concac14.drawImage(concac15, 48, 60, 120, 120);
    concac14.restore();
    concac14.beginPath();
    concac14.arc(108, 120, 62, 0, Math.PI * 2, true);
    concac14.lineWidth = 5;
    concac14.strokeStyle = color || "#fff";
    concac14.stroke();
  }

  concac10(concac14, name, 200, 120, 530, 38, "ProductSans", "#fff", true);
  concac10(concac14, `Level: ${level}   |   Chuỗi ngày: ${streak}🔥`, 200, 162, 530, 26, "ProductSans", "#ffe57f", true);
  concac10(concac14, `Tiền trước: ${lastMoney}$  ➜  Tiền hiện tại: ${money}$`, 200, 200, 570, 26, "ProductSans", "#a1e7ff", true);

  concac14.save();
  concac14.globalAlpha = 0.8;
  concac14.fillStyle = color || "#ff995e";
  concac14.roundRect(50, 240, 700, 140, 40);
  concac14.fill();
  concac14.globalAlpha = 1;
  concac14.restore();

  concac10(concac14, `${job.emoji}  ${job.name.toUpperCase()}  ${job.emoji}`, 80, 290, 700, 38, "ProductSans", "#fff", true);
  concac10(concac14, jobDesc, 80, 335, 690, 30, "ProductSans", "#fff", false);
  concac10(concac14, `+${money}$`, 80, 380, 700, 34, "ProductSans", "#aaff6f", true);

  concac10(concac14, "Tường AI Canvas | Pcoder", 500, 435, 290, 18, "ProductSans", "#ffffff99", false);

  return concac13.toBuffer();
}

module.exports.run = async function({ api, event, Users, Currencies }) {
  const { threadID, senderID, messageID } = event;
  let concac17 = (await Users.getNameUser(senderID)) || "Người chơi";
  let concac18 = `https://graph.facebook.com/${senderID}/picture?width=256&height=256`;
  const concac19 = concac9(concac8);
  const concac20 = [
    "Top 1", "Cày thuê", "AFK", "Bốc vác", "Fix module", "X2 Gỗ", "X19 Gỗ", "Kiếm sắt", "Giáp kim cương", "Đánh bại boss", "Chơi cả ngày", "Cày xuyên đêm", "Up story", "Dính drama"
  ];
  const concac21 = concac9(concac20);
  const concac22 = Math.floor(Math.random() * 25000) + 1000;
  let concac23 = (await Currencies.getData(senderID)).data || {};
  let concac24 = concac23.streak || 1;
  let concac25 = concac23.level || 1;
  let concac26 = (await Currencies.getData(senderID)).money || 0;

  await Currencies.increaseMoney(senderID, concac22);

  concac23.streak = concac24 + 1;
  concac23.level = (concac25 + (Math.random() > 0.75 ? 1 : 0));
  await Currencies.setData(senderID, { data: concac23 });

  const concac27 = await concac11({
    name: concac17,
    avatarUrl: concac18,
    job: concac19,
    money: concac26 + concac22,
    lastMoney: concac26,
    jobDesc: `Bạn vừa ${concac19.name} với kết quả: ${concac21}`,
    streak: concac23.streak,
    level: concac23.level,
    color: concac19.color
  });

  return api.sendMessage({
    body: `💸 Bạn vừa làm việc "${concac19.name}"!\n+${concac22}$\nTiền hiện tại: ${concac26 + concac22}$\nStreak: ${concac23.streak} ngày | Level: ${concac23.level}`,
    attachment: concac27
  }, threadID, messageID);
};