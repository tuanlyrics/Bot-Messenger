const fs = require("fs-extra");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: 'video',
  version: '1.0.0',
  hasPermssion: 0,
  credits: 'pcoder',
  description: 'Tự động tải video đầu tiên dưới 10 phút từ YouTube',
  commandCategory: 'Tiện ích',
  usages: 'video <từ khóa>',
  cooldowns: 15,
  dependencies: {
    'moment-timezone': '',
    'axios': '',
    'fs-extra': '',
    '@distube/ytdl-core': ''
  }
};

const mediaSavePath = path.join(__dirname, 'cache', 'Youtube');
const key = "AIzaSyD16U7WwrIFGOKijx0GR_3hU6p7Ww7JObM";

if (!fs.existsSync(mediaSavePath)) fs.mkdirpSync(mediaSavePath);

// Hàm chuyển đổi thời lượng ISO 8601 thành giây
function parseDuration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || 0, 10);
  const minutes = parseInt(matches[2] || 0, 10);
  const seconds = parseInt(matches[3] || 0, 10);
  
  return (hours * 3600) + (minutes * 60) + seconds;
}

// Hàm format thời lượng
function formatDuration(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(seconds).padStart(2, '0'));
  
  return parts.join(':');
}

module.exports.handleReply = async function ({}) {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  if (!args.length) {
    return api.sendMessage('❎ Vui lòng nhập từ khóa tìm kiếm video', threadID, messageID);
  }

  const input = args.join(' ');
  console.log(`[VIDEO-LOG] Bắt đầu tìm kiếm cho: "${input}"`);

  let waitingMessage;
  try {
    // Gửi tin nhắn chờ
    waitingMessage = await api.sendMessage(`🔎 Đang tìm kiếm video cho: "${input}"...`, threadID, messageID);
    
    // Tìm kiếm video trên YouTube
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(input)}&type=video&key=${key}`;
    console.log(`[VIDEO-LOG] Gọi YouTube Search API...`);
    
    const searchResponse = await axios.get(searchUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const searchResults = searchResponse.data.items;
    if (!searchResults || searchResults.length === 0) {
      api.unsendMessage(waitingMessage.messageID).catch(() => {});
      return api.sendMessage(`❎ Không tìm thấy video nào cho từ khóa: "${input}"`, threadID, messageID);
    }
    
    console.log(`[VIDEO-LOG] Tìm thấy ${searchResults.length} kết quả, đang lọc video dưới 10 phút...`);
    
    // Lọc video dưới 10 phút
    let selectedVideo = null;
    for (let i = 0; i < searchResults.length; i++) {
      const video = searchResults[i];
      const videoId = video.id?.videoId;
      const title = video.snippet?.title || "Không rõ tiêu đề";
      
      if (!videoId) {
        console.log(`[VIDEO-LOG] Video ${i+1}: Bỏ qua (thiếu videoId)`);
        continue;
      }
      
      console.log(`[VIDEO-LOG] Video ${i+1}: Đang kiểm tra "${title}"`);
      
      try {
        // Lấy thông tin chi tiết video
        const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${key}`;
        const detailResponse = await axios.get(detailUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const videoDetail = detailResponse.data.items?.[0];
        const durationISO = videoDetail?.contentDetails?.duration;
        
        if (!durationISO) {
          console.log(`[VIDEO-LOG] Video ${i+1}: Bỏ qua (không có thông tin thời lượng)`);
          continue;
        }
        
        const durationInSeconds = parseDuration(durationISO);
        console.log(`[VIDEO-LOG] Video ${i+1}: Thời lượng ${durationInSeconds} giây`);
        
        // Chọn video đầu tiên dưới 10 phút (600 giây)
        if (durationInSeconds > 0 && durationInSeconds <= 600) {
          selectedVideo = {
            id: videoId,
            title: title,
            duration: formatDuration(durationInSeconds)
          };
          console.log(`[VIDEO-LOG] ✅ Chọn video: "${title}"`);
          break;
        } else {
          console.log(`[VIDEO-LOG] Video ${i+1}: Bỏ qua (dài hơn 10 phút)`);
        }
        
      } catch (error) {
        console.log(`[VIDEO-LOG] Video ${i+1}: Lỗi khi lấy thông tin - ${error.message}`);
        continue;
      }
    }
    
    if (!selectedVideo) {
      api.unsendMessage(waitingMessage.messageID).catch(() => {});
      return api.sendMessage(`❎ Không tìm thấy video nào dưới 10 phút cho từ khóa: "${input}"`, threadID, messageID);
    }
    
    // Cập nhật tin nhắn chờ
    api.editMessage(`⏳ Đang tải video: "${selectedVideo.title}"...`, waitingMessage.messageID);
    
    // Tải video
    const filePath = path.join(mediaSavePath, `${Date.now()}_${senderID}.mp4`);
    console.log(`[VIDEO-LOG] Bắt đầu tải video ID: ${selectedVideo.id}`);
    
    try {
      const stream = ytdl(`https://www.youtube.com/watch?v=${selectedVideo.id}`, { 
        quality: '18',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      });
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout khi tải video'));
        }, 120000); // 2 phút timeout
        
        stream.pipe(fs.createWriteStream(filePath))
          .on('finish', () => {
            clearTimeout(timeout);
            resolve();
          })
          .on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
      });
      
      console.log(`[VIDEO-LOG] ✅ Tải video thành công`);
      
      // Kiểm tra kích thước file
      const stats = fs.statSync(filePath);
      if (stats.size > 50 * 1024 * 1024) { // 50MB
        api.unsendMessage(waitingMessage.messageID).catch(() => {});
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return api.sendMessage('⚠️ Video quá lớn (hơn 50MB), không thể gửi', threadID, messageID);
      }
      
      // Gửi video
      const currentTime = moment.tz('Asia/Ho_Chi_Minh').format('HH:mm:ss');
      const messageBody = `[ YOUTUBE VIDEO ]\n──────────────────\n📝 Tiêu đề: ${selectedVideo.title}\n⏳ Thời lượng: ${selectedVideo.duration}\n⏰ Thời gian: ${currentTime}`;
      
      api.unsendMessage(waitingMessage.messageID).catch(() => {});
      
      await api.sendMessage({
        body: messageBody,
        attachment: fs.createReadStream(filePath)
      }, threadID, messageID);
      
      console.log(`[VIDEO-LOG] ✅ Gửi video thành công`);
      
    } catch (downloadError) {
      console.error(`[VIDEO-LOG] ❌ Lỗi tải video:`, downloadError);
      api.unsendMessage(waitingMessage.messageID).catch(() => {});
      api.sendMessage('❎ Có lỗi khi tải video, vui lòng thử lại sau', threadID, messageID);
    } finally {
      // Xóa file tạm
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[VIDEO-LOG] 🗑️ Đã xóa file tạm`);
      }
    }
    
  } catch (error) {
    console.error(`[VIDEO-LOG] ❌ Lỗi nghiêm trọng:`, error);
    if (waitingMessage) {
      api.unsendMessage(waitingMessage.messageID).catch(() => {});
    }
    api.sendMessage('❎ Có lỗi xảy ra, vui lòng thử lại sau', threadID, messageID);
  }
};