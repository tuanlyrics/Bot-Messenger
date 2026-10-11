// 📁 modules/commands/deche/repair.js
const fs = require('fs-extra');
const path = require('path');
const dataPath = path.join(__dirname, 'data', 'groups.json');

module.exports = async function (api, event, args, Currencies) {
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

  const cost = 100;
  const userMoney = (await Currencies.getData(event.senderID)).money;
  if (userMoney < cost) return api.sendMessage('💸 Không đủ tiền để sửa chữa.', threadID);

  await Currencies.decreaseMoney(event.senderID, cost);
  info.hp = Math.min(info.hp + 30, 100);
  await fs.writeJson(dataPath, data, { spaces: 2 });
  return api.sendMessage(`🔧 Đã sửa chữa, máu nhóm: ${info.hp}/100`, threadID);
};