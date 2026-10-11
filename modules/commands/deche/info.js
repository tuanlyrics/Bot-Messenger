// 📁 modules/commands/deche/info.js
const fs = require('fs-extra');
const path = require('path');
const dataPath = path.join(__dirname, 'data', 'groups.json');

module.exports = async function (api, event) {
  const threadID = event.threadID;
  const data = await fs.readJson(dataPath);
  const info = data[threadID];
  if (!data[threadID]) {
  const availableTerritory = findEmptyTerritory(data);
  if (!availableTerritory) return api.sendMessage("⚠️ Hết lãnh thổ trống.", threadID);
  data[threadID] = { hp: 100, territory: availableTerritory, items: {} };
  await fs.writeJson(dataPath, data, { spaces: 2 });
  api.sendMessage(`✅ Nhóm bạn đã tham gia game và chiếm ô: ${availableTerritory}`, threadID);
}


  return api.sendMessage(
    `📍 Nhóm hiện tại:\n` +
    `- Máu: ${info.hp}/100\n` +
    `- Lãnh thổ: ${info.territory || 'Chưa có'}\n` +
    `- Vật phẩm: ${Object.keys(info.items || {}).join(', ') || 'Không có'}`,
    threadID
  );
};
