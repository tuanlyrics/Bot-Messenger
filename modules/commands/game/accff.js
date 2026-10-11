const axios = require("axios");

module.exports.config = {
  name: "accff",
  version: "1.2.0",
  hasPermission: 0,
  credits: "pcoder",
  description: "Xem thông tin tài khoản Free Fire bằng UID",
  commandCategory: "Free Fire",
  usages: "[region] <uid>",
  cooldowns: 5
};

// Hàm format timestamp -> ngày giờ
function formatTime(ts) {
  if (!ts || isNaN(ts)) return "Không rõ";
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

// Map dịch
function translateGender(g) {
  if (!g) return "Không rõ";
  if (g.includes("MALE")) return "Nam";
  if (g.includes("FEMALE")) return "Nữ";
  return "Khác";
}

function translateLang(l) {
  if (!l) return "Không rõ";
  if (l.includes("VIETNAMESE")) return "Tiếng Việt";
  if (l.includes("ENGLISH")) return "Tiếng Anh";
  if (l.includes("SPANISH")) return "Tiếng Tây Ban Nha";
  return l.replace("Language_", "").toLowerCase();
}

function translateMode(m) {
  if (!m) return "Không rõ";
  if (m.includes("BR")) return "Sinh Tồn (Battle Royale)";
  if (m.includes("CS")) return "Đấu Rank Sinh Tồn (Clash Squad)";
  return m.replace("ModePrefer_", "").toLowerCase();
}

function translateRank(r) {
  if (!r) return "Không rõ";
  if (r.includes("BR")) return "Hiển thị Rank Sinh Tồn";
  if (r.includes("CS")) return "Hiển thị Rank CS";
  return r.replace("RankShow_", "");
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  const regions = ["IND","BR","SG","RU","ID","TW","US","VN","TH","ME","PK","CIS","BD"];
  let region = "VN";
  let uid;

  if (args.length === 1) {
    uid = args[0];
  } else if (args.length >= 2) {
    if (regions.includes(args[0].toUpperCase())) {
      region = args[0].toUpperCase();
      uid = args[1];
    } else {
      return api.sendMessage(
        `❌ Region không hợp lệ!\nHãy chọn: ${regions.join(", ")}`,
        threadID,
        messageID
      );
    }
  } else {
    return api.sendMessage(
      "❌ Sai cú pháp!\nDùng: accff [region] <uid>\nVí dụ: accff 9993895245 hoặc accff BR 9993895245",
      threadID,
      messageID
    );
  }

  try {
    const res = await axios.get(`http://163.61.110.126:3000/api/account`, {
      params: { uid, region }
    });

    const data = res.data;
    if (!data.basicInfo) {
      return api.sendMessage("❌ Không tìm thấy tài khoản hoặc UID không hợp lệ.", threadID, messageID);
    }

    let msg = `🌐 Thông Tin Tài Khoản Free Fire\n\n`;

    // Thông tin cơ bản
    const b = data.basicInfo || {};
    msg += `👤 Tên nhân vật: ${b.nickname || "Không rõ"}\n`;
    msg += `🆔 UID: ${b.accountId || "Không rõ"}\n`;
    msg += `🌍 Khu vực: ${b.region || "Không rõ"}\n`;
    msg += `🏆 Cấp: ${b.level || 0} | Kinh nghiệm: ${b.exp || 0}\n`;
    msg += `📊 Rank: ${b.rank || "N/A"} (${b.rankingPoints || 0} điểm)\n`;
    msg += `📊 Rank Sinh Tồn (CS): ${b.csRank || "N/A"} (${b.csRankingPoints || 0} điểm)\n`;
    msg += `🏅 Rank cao nhất: ${b.maxRank || "N/A"} | Rank CS cao nhất: ${b.csMaxRank || "N/A"}\n`;
    msg += `🎖 Huy hiệu: ${b.badgeCnt || 0} (ID ${b.badgeId || "N/A"})\n`;
    msg += `💖 Lượt thích: ${b.liked || 0}\n`;
    msg += `🕒 Lần đăng nhập cuối: ${formatTime(b.lastLoginAt)}\n`;
    msg += `📌 Ngày tạo: ${formatTime(b.createAt)}\n`;
    msg += `📢 Phiên bản: ${b.releaseVersion || "Không rõ"}\n\n`;

    // Hồ sơ
    const p = data.profileInfo || {};
    msg += `🎭 Hồ sơ:\n`;
    msg += `- Avatar ID: ${p.avatarId || "Không rõ"}\n`;
    msg += `- Trang phục: ${Array.isArray(p.clothes) && p.clothes.length > 0 ? p.clothes.join(", ") : "Không có"}\n`;
    msg += `- Kỹ năng đã trang bị: ${Array.isArray(p.equipedSkills) && p.equipedSkills.length > 0 ? p.equipedSkills.join(", ") : "Không có"}\n\n`;

    // Thú cưng
    const pet = data.petInfo || {};
    if (pet.id) {
      msg += `🐾 Thú cưng:\n`;
      msg += `- ID: ${pet.id} | Cấp: ${pet.level || 0} | Kinh nghiệm: ${pet.exp || 0}\n`;
      msg += `- Skin ID: ${pet.skinId || "N/A"} | Kỹ năng: ${pet.selectedSkillId || "N/A"}\n\n`;
    }

    // Xã hội
    const s = data.socialInfo || {};
    msg += `💬 Xã hội:\n`;
    msg += `- Giới tính: ${translateGender(s.gender)}\n`;
    msg += `- Ngôn ngữ: ${translateLang(s.language)}\n`;
    msg += `- Chế độ ưa thích: ${translateMode(s.modePrefer)}\n`;
    msg += `- Hiển thị rank: ${translateRank(s.rankShow)}\n`;
    msg += `- Tiểu sử: ${s.signature || "Không có"}\n\n`;

    // Kim cương + Uy tín
    msg += `💎 Tiêu hao kim cương: ${data.diamondCostRes?.diamondCost || 0}\n`;
    msg += `⭐ Điểm uy tín: ${data.creditScoreInfo?.creditScore || "N/A"}\n`;

    return api.sendMessage(msg, threadID, messageID);

  } catch (err) {
    return api.sendMessage(
      `❌ Lỗi khi lấy dữ liệu: ${err.message}`,
      threadID,
      messageID
    );
  }
};
