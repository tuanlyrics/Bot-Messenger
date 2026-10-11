const fs = require('fs-extra');
const path = require('path');
const dataPath = path.join(__dirname, 'data', 'groups.json');

const itemsList = [
  {
    id: 'sword',
    name: '🗡️ Kiếm Sắt',
    price: 300,
    desc: '+5 sức tấn công',
    effect: group => group.atk = (group.atk || 0) + 5
  },
  {
    id: 'sword2',
    name: '⚔️ Kiếm Vàng',
    price: 600,
    desc: '+10 sức tấn công',
    effect: group => group.atk = (group.atk || 0) + 10
  },
  {
    id: 'shield',
    name: '🛡️ Khiên Gỗ',
    price: 300,
    desc: '+5 phòng thủ',
    effect: group => group.def = (group.def || 0) + 5
  },
  {
    id: 'shield2',
    name: '🪙 Khiên Thép',
    price: 700,
    desc: '+10 phòng thủ',
    effect: group => group.def = (group.def || 0) + 10
  },
  {
    id: 'hp',
    name: '💉 Hồi Máu',
    price: 200,
    desc: '+30 máu',
    effect: group => {
      const maxHp = group.maxHp || 10000;
      group.hp = Math.min((group.hp || maxHp) + 30, maxHp);
    },
    noItem: true
  },
  {
    id: 'maxhp',
    name: '❤️ Tăng Máu Tối Đa',
    price: 800,
    desc: '+50 máu tối đa',
    effect: group => {
      group.maxHp = (group.maxHp || 10000) + 50;
      group.hp = (group.hp || 10000) + 50;
    },
    noItem: true
  }
];

module.exports = async function (api, event, args, Currencies) {
  const threadID = event.threadID;
  const data = await fs.readJson(dataPath).catch(() => ({}));
  const group = data[threadID];
  if (!group || !group.territory) return api.sendMessage('❌ Nhóm bạn chưa tham gia game.', threadID);

  const sub = args[1];
  const itemId = args[2];

  if (!sub) {
    const itemList = itemsList.map(item => `- ${item.name} (${item.id}): ${item.price} đô\n${item.desc}`).join('\n\n');
    return api.sendMessage(`🛒 Shop vật phẩm:\n\n${itemList}\n\n💬 Dùng: /deche shop [id] hoặc /deche shop sell [id]`, threadID);
  }

  if (sub === 'sell') {
    if (!itemId) return api.sendMessage('⚠️ Nhập id vật phẩm cần bán. VD: /deche shop sell sword', threadID);
    const item = itemsList.find(i => i.id === itemId.toLowerCase());
    if (!item) return api.sendMessage('❌ Không tìm thấy vật phẩm.', threadID);
    if (item.noItem) return api.sendMessage('🚫 Vật phẩm này không thể bán lại.', threadID);

    const owned = group.items?.[item.id] || 0;
    if (owned <= 0) return api.sendMessage('❌ Nhóm bạn không sở hữu vật phẩm này.', threadID);

    const sellPrice = Math.floor(item.price / 2);
    group.items[item.id] -= 1;
    if (group.items[item.id] <= 0) delete group.items[item.id];

    await Currencies.increaseMoney(event.senderID, sellPrice);
    await fs.writeJson(dataPath, data, { spaces: 2 });

    return api.sendMessage(`💰 Đã bán 1 ${item.name} với giá ${sellPrice} đô.`, threadID);
  }

  const item = itemsList.find(i => i.id === sub.toLowerCase());
  if (!item) return api.sendMessage('❌ Không tìm thấy vật phẩm.', threadID);

  const userData = await Currencies.getData(event.senderID);
  if (userData.money < item.price) return api.sendMessage('💸 Bạn không đủ tiền để mua vật phẩm này.', threadID);

  item.effect(group);

  if (!item.noItem) {
    group.items = group.items || {};
    group.items[item.id] = (group.items[item.id] || 0) + 1;
  }

  await Currencies.decreaseMoney(event.senderID, item.price);
  await fs.writeJson(dataPath, data, { spaces: 2 });

  return api.sendMessage(`✅ Đã mua ${item.name} thành công!\n💰 Trừ ${item.price} đô`, threadID);
};
