const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: 'testcmd',
  version: '1.0.1',
  hasPermssion: 2,
  credits: 'pcoder',
  description: 'Test tất cả lệnh trong thư mục',
  commandCategory: 'Admin',
  usages: '',
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const dir = __dirname; // Thư mục hiện tại, có thể thay đổi nếu cần
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.js') && file !== path.basename(__filename));
  
  let result = '';
  for (const file of files) {
    const cmdName = file.replace('.js', '');
    try {
      delete require.cache[require.resolve(path.join(dir, file))]; // Xóa cache để load mới
      require(path.join(dir, file));
      result += `✅ ${cmdName} load thành công\n`;
    } catch (err) {
      result += `❌ ${cmdName} lỗi: ${err.message}\n`;
    }
  }
  if (!result) result = 'Không tìm thấy lệnh nào để kiểm tra!';
  return api.sendMessage(result, event.threadID);
};