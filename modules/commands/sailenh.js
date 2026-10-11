const fs = require('fs-extra');
const axios = require('axios');
const https = require('https');
const path = require('path');

module.exports.config = {
  name: "",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "pcoder",
  description: "Random video gái từ file JSON, có tải video và gửi kèm thơ",
  commandCategory: "Media",
  usages: "",
  cooldowns: 0
};

const DATA_PATH = path.join(__dirname, '../../pdata/data_dongdev/datajson/vdgai.json');
const tho = [
  "Em có thể đi theo anh được không? Vì em luôn được cha mẹ bảo là phải theo giấc mơ của mình.",
  "Bầu trời xanh, làn mây trắng. Anh yêu nắng hay yêu em?",
  "Nhờ có nắng mới thấy cầu vồng. Nhờ có anh mới thấy màu hạnh phúc.",
  "Anh yêu ơi ới ời. Anh đang ở đâu?",
  "Soái ca là của ngôn tình, còn anh là của mình em thôi.",
  "Giữa cuộc đời hàng ngàn cám dỗ. Em chỉ cần bến đỗ là anh thôi.",
  "Bồ công anh bay khi có gió, em chỉ cười vì ở đó có anh.",
  "Chỉ cần anh nói yêu, em sẽ bám theo anh suốt đời.",
  "Ba mươi chưa phải là Tết, chưa yêu đâu phải là hết.",
  "Ai cho mượn avatar để em đỡ cô đơn với.",
  "Nắng có mũ, mưa có ô, còn em có ai?",
  "Chồng tương lai ơi, em chờ hơi lâu rồi đó.",
  "Trời mưa rồi, sao anh chưa đổ em?",
  "Anh có thấy mỏi chân không? Vì cứ đi trong tim em mãi.",
  "Anh ơi có nóng không? Tim em đang cháy nè.",
  "Anh gì ơi, anh đánh rơi người yêu này rồi kìa.",
  "Sao anh cười mãi thế? Da em đen mất rồi.",
  "Đêm rồi mà tim em vẫn đầy nắng.",
  "Tim anh còn chỗ không? Em chuyển nhà nè.",
  "Uống nhầm 1 ánh mắt, cơn say theo cả đời.",
  "Em thích anh còn nhiều hơn muối ở biển.",
  "Đọc 10 vạn câu hỏi vì sao, vẫn không hiểu sao thích anh nhiều thế.",
  "Đường thì dài, chân em thì ngắn. Đi bao xa mới tới tim anh?",
  "Em xinh nhưng chưa thuộc về ai.",
  "Chán thả thính rồi, ai cưa để em đổ 1 lần coi.",
  "Cuộc sống bon chen quá, nên anh mãi chưa tới bên em à?",
  "Nếu được hãy cho em yêu anh 1 lần.",
  "Tuổi tác không quan trọng, quan trọng là anh có bằng lái chưa?",
  "Trăng lên đỉnh núi trăng tà, anh yêu em thật hay là yêu chơi?",
  "Nếu ngoài kia bão tố, về đây với em.",
  "Em không thích ngủ muộn, chỉ là đợi ai đó chúc ngủ ngon.",
  "Cây đa, giếng nước, sân đình. Khi nào em hết một mình đây anh?",
  "Cả thế giới yêu nhau, chỉ em đơn phương góc nhỏ.",
  "Cần ai đó quan tâm để thấy mình được yêu thương.",
  "Anh gì ơi, cho em mượn đèn pin. Em tìm đường vào tim anh không thấy.",
  "Say rượu làm gì? Say em đi này.",
  "Thách ai nói yêu em đấy.",
  "Em ăn BƠ muốn vỡ bụng rồi đây.",
  "Rảnh quá, có ai mời đi chơi không?",
  "Mình đẹp trai mà sao chẳng ai để ý?",
  "Này anh, trong mắt em có gì không? Là hình bóng anh đó.",
  "Anh có biết về thuốc mê không? Gói gọn là anh đấy.",
  "Anh làm rơi trái tim vào em rồi kìa.",
  "Cài win hộ em hệ điều hành có giao diện là anh được không?",
  "Anh yêu bản thân anh, em cũng yêu anh!",
  "Kênh nào cũng chiếu nhung nhớ về anh.",
  "Chỉ em đường thoát khỏi nỗi nhớ anh với!",
  "Em không tin trên đời có 2 thiên thần đâu!",
  "Hạnh phúc nhất là khoảnh khắc anh cười.",
  "Nếu không có gì là mãi mãi, anh làm 'không có gì' của em nha?",
  "Cho em mượn nụ hôn, em trả lại đầy đủ.",
  "Em có muốn con mình sau này có ADN của anh không?",
  "Cho em ở mãi trong tim anh nha.",
  "Gì mà đầy trong mắt em vậy? Là anh.",
  "Không phải lòng em, chắc chắn anh sẽ ế.",
  "Sao nói chuyện với em làm anh cứ chếnh choáng?",
  "Cách nhanh nhất để anh hạnh phúc là nhìn thấy em.",
  "Cho anh được yêu em một lần thôi.",
  "Hôm nay 14/3 rồi, sao chưa ai tặng quà anh?",
  "Trong tim em còn chỗ cho anh không?",
  "Vận tốc trái tim nhanh không em?",
  "Em là của anh, như mây là của trời.",
  "Đám cưới linh đình, bao giờ đến lượt mình em ơi?",
  "Tay anh ấm lắm, em nắm thử không?",
  "1, 2, 3, 5… Em có đánh rơi nhịp nào không?",
  "Em xinh đẹp ơi, làm con dâu mẹ anh không?",
  "Cần lắm một em gái mưa!",
  "Giá có người yêu để cùng khám phá thế giới.",
  "Đông về tay anh lạnh, nhưng sẵn sàng sưởi ấm tay em.",
  "Ai cũng yêu cái đẹp, nên anh yêu em.",
  "Bão to, cây đổ, sao em chưa đổ anh?",
  "Em như viên kim cương vậy, sáng loáng luôn.",
  "Với thế giới em là một người, với anh em là cả thế giới.",
  "Mắt em có phải chứa vì sao không? Sáng thế!",
  "Anh như vậy đã đủ tiêu chuẩn làm bạn trai chưa?",
  "Muốn làm mặt trời duy nhất trong anh không?",
  "Mẹ anh đang tìm con dâu kìa!",
  "Chỉ cần em yêu anh, còn cả thế giới để anh lo.",
  "Em yêu, cùng anh đến tiệm bánh, vì em như bánh cute vậy.",
  "Anh thấy em quen lắm… giống người yêu tương lai anh.",
  "Tên em là Quỳnh Anh à? Đẹp nhưng chắc không đặt tên con vậy.",
  "Nếu em là Coca thì anh là Pepsi, một cặp hoàn hảo.",
  "Anh cá rằng em là trộm – em đã đánh cắp tim anh rồi.",
  "Ngày đó trời mưa, em không thấy anh, anh không thấy mưa.",
  "Gấu Bắc Cực nặng bao nhiêu? Đủ nặng để phá tan băng giữa chúng ta.",
  "Nếu mỗi lần nhớ em được 500đ, anh đã giàu hơn Bill Gates.",
  "Anh nhớ em nhiều đến mức vo gạo bằng xăng luôn rồi.",
  "Em là nghề gì mà đêm nào cũng vào giấc mơ của anh vậy?",
  "Em nợ anh cuộc hẹn, cuộc tình, nụ hôn… và cả trái tim!",
  "Đôi mắt em chưa nói điều gì cả – tên em là gì vậy?",
  "Một lần được ngửi mùi tóc em, nắm tay em, hôn em… là đủ.",
  "Anh nghiện thức đêm cùng nỗi nhớ em, sửa không được.",
  "Hôm nay yêu em nhiều đến bất thường.",
  "Anh ghét em lắm! Vì em cứ quanh quẩn trong đầu anh mãi."
];
function pad(num) {
  return num < 10 ? '0' + num : num;
}

global.khanhdayr = global.khanhdayr || [];

module.exports.run = async ({ api, event }) => {
  const timeStart = Date.now();
  try {
    const videoList = await fs.readJson(DATA_PATH);
    const validVideos = Array.isArray(videoList) ? videoList.filter(v => v.endsWith('.mp4')) : [];

    if (validVideos.length === 0) {
      return api.sendMessage("❌ Không tìm thấy video hợp lệ.", event.threadID, event.messageID);
    }

    // Nếu đã có video đợi sẵn trong global.khanhdayr thì lấy ra gửi luôn
    if (global.khanhdayr.length > 0) {
      const now = new Date();
      const h = pad(now.getHours());
      const p = pad(now.getMinutes());
      const s = pad(now.getSeconds());
      const gio = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const randomTho = tho[Math.floor(Math.random() * tho.length)];

      const body = `⚠️ Video Random Gái\n` +
        `🌐 Ping: ${Date.now() - timeStart}ms\n` +
        `📥 Tổng: ${videoList.length}\n` +
        `✅ Hợp lệ: ${validVideos.length}\n` +
        `⏰ Time: ${h}:${p}:${s}\n` +
        `───────────────\n` +
        `🕰️ ${gio}\n\n${randomTho}`;

      // Lấy ra một stream đã tải sẵn
      const attach = global.khanhdayr.splice(0, 1);
      return api.sendMessage({
        body,
        attachment: attach
      }, event.threadID, event.messageID);
    }

    // Nếu chưa có video nào preload thì tải mới
    const randomVideo = validVideos[Math.floor(Math.random() * validVideos.length)];
    const filePath = path.join(__dirname, 'cache', 'vdgai.mp4');
    const agent = new https.Agent({ keepAlive: true });

    const response = await axios({
      method: 'GET',
      url: randomVideo,
      responseType: 'stream',
      timeout: 15000,
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      const now = new Date();
      const h = pad(now.getHours());
      const p = pad(now.getMinutes());
      const s = pad(now.getSeconds());
      const gio = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const randomTho = tho[Math.floor(Math.random() * tho.length)];

      const body = `⚠️ Video Random Gái\n` +
        `🌐 Ping: ${Date.now() - timeStart}ms\n` +
        `📥 Tổng: ${videoList.length}\n` +
        `✅ Hợp lệ: ${validVideos.length}\n` +
        `⏰ Time: ${h}:${p}:${s}\n` +
        `───────────────\n` +
        `🕰️ ${gio}\n\n${randomTho}`;

      // Đọc stream, gửi xong xoá file
      api.sendMessage({
        body,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlink(filePath).catch(() => {}), event.messageID);
    });

    writer.on('error', (e) => {
      api.sendMessage("❌ Lỗi khi lưu video.", event.threadID, event.messageID);
    });

  } catch (err) {
    api.sendMessage("❌ Đã xảy ra lỗi khi xử lý video.", event.threadID, event.messageID);
  }
};

// Định kỳ preload video vào global.khanhdayr (ví dụ mỗi 10s tải trước 1 video)
if (!global.khanhdayr_preload) {
  global.khanhdayr_preload = setInterval(async () => {
    try {
      const videoList = await fs.readJson(DATA_PATH);
      const validVideos = Array.isArray(videoList) ? videoList.filter(v => v.endsWith('.mp4')) : [];
      if (validVideos.length > 0 && global.khanhdayr.length < 5) {
        const randomVideo = validVideos[Math.floor(Math.random() * validVideos.length)];
        const agent = new https.Agent({ keepAlive: true });
        const response = await axios({
          method: 'GET',
          url: randomVideo,
          responseType: 'stream',
          timeout: 15000,
          httpsAgent: agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        });
        // Lưu vào RAM (dạng buffer để giữ được file, giải phóng sau khi gửi)
        const buffers = [];
        response.data.on('data', chunk => buffers.push(chunk));
        response.data.on('end', () => {
          const videoBuffer = Buffer.concat(buffers);
          const { Readable } = require('stream');
          const stream = Readable.from(videoBuffer);
          stream.path = "vdgai.mp4";
          global.khanhdayr.push(stream);
        });
      }
    } catch (e) {}
  }, 10000);
}