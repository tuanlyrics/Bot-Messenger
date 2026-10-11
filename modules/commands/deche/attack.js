const fs = require('fs-extra');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'groups.json');
const banPath = path.join(__dirname, 'data', 'banned.json');
const allyPath = path.join(__dirname, 'data', 'allies.json');

const banner = "==== [ ĐẾ CHẾ ] ====";
const COOLDOWN_MS = 5 * 60 * 1000;
const REWARD = 10000000;

module.exports = async function (api, event, args, Currencies) {
  const threadID = event.threadID;
  const senderID = event.senderID;

  const data = await fs.readJson(dataPath).catch(() => ({}));
  const banned = await fs.readJson(banPath).catch(() => []);
  const allies = await fs.readJson(allyPath).catch(() => ({}));

  if (banned.includes(threadID)) {
    return api.sendMessage(`${banner}\n🚫 Nhóm bạn đã bị loại khỏi bản đồ và không thể tham gia lại.`, threadID);
  }

  const attacker = data[threadID];
  if (!attacker || !attacker.territory) {
    return api.sendMessage(`${banner}\n⛔ Nhóm bạn chưa có lãnh thổ.`, threadID);
  }

  const now = Date.now();
  if (attacker.lastAttack && now - attacker.lastAttack < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - attacker.lastAttack)) / 1000);
    return api.sendMessage(`${banner}\n⏱️ Hãy chờ ${waitSec} giây nữa mới có thể tấn công tiếp.`, threadID);
  }

  const coord = args[1]?.toUpperCase();
  if (!coord) return api.sendMessage(`${banner}\n❓ Nhập tọa độ để tấn công. VD: /deche attack A2`, threadID);

  const defenderID = Object.keys(data).find(tid => data[tid].territory === coord);
  if (!defenderID) return api.sendMessage(`${banner}\n❌ Không có nhóm nào ở tọa độ này.`, threadID);
  if (defenderID === threadID) return api.sendMessage(`${banner}\n⚠️ Bạn không thể tự tấn công nhóm mình.`, threadID);

  // Kiểm tra liên minh
  const attackerAllies = allies[threadID] || [];
  if (attackerAllies.includes(defenderID)) {
    return api.sendMessage(`${banner}\n🤝 Nhóm này là đồng minh, không thể tấn công!`, threadID);
  }

  const defender = data[defenderID];
  const baseDmg = 20;
  const attackerAtk = attacker.atk || 0;
  const defenderDef = defender.def || 0;
  const maxHp = defender.maxHp || 10000;

  let realDmg = baseDmg + attackerAtk - defenderDef;
  if (realDmg < 5) realDmg = 5;

  defender.hp = Math.max(0, (defender.hp || maxHp) - realDmg);
  attacker.lastAttack = now;

  const notifyMsg = `${banner}\n⚠️ Nhóm bạn bị tấn công tại ${coord}, còn lại ${defender.hp}/${maxHp} máu!`;
  const resultMsg = `${banner}\n⚔️ Tấn công nhóm tại ${coord}, gây ${realDmg} sát thương. Còn lại: ${defender.hp}/${maxHp} máu.`;

  if (defender.hp <= 0) {
    defender.defeatedBy = attacker.territory || threadID;

    for (const uid of attacker.memberIDs) {
    try {
        const userData = await Currencies.getData(uid);
        if (!userData) await Currencies.setData(uid, { money: 0 });
        await Currencies.increaseMoney(uid, REWARD);
    } catch (e) {
        console.log(`[DECHE] Lỗi cộng tiền user ${uid}: ${e.message}`);
    }
    }

    for (const uid of defender.memberIDs) {
    try {
        const userData = await Currencies.getData(uid);
        if (!userData) await Currencies.setData(uid, { money: 0 });
        await Currencies.setData(uid, { money: 0 });
    } catch (e) {
        console.log(`[DECHE] Lỗi trừ tiền user ${uid}: ${e.message}`);
    }
    }

    // Gửi thông báo cho toàn bộ nhóm còn lại
    for (const tid of Object.keys(data)) {
      if (tid !== defenderID) {
        api.sendMessage(
          `${banner}\n📢 Nhóm tại ${coord} đã bị ${attacker.territory} đánh bại và bị loại khỏi game!\n` +
          `💰 +${REWARD.toLocaleString()} cho mỗi thành viên nhóm ${attacker.territory}!\n` +
          `💸 Toàn bộ thành viên nhóm ${coord} đã bị trừ hết tiền!`,
          tid
        );
      }
    }

    // Thông báo cho nhóm bị loại
    api.sendMessage(`${banner}\n💀 Nhóm bạn đã bị đánh bại bởi nhóm tại ${attacker.territory} và bị loại khỏi game.`, defenderID);
    logger(`Nhóm ${defenderID} đã bị loại!`, "[ DECHE ]")
    delete data[defenderID];
    banned.push(defenderID);
    await fs.writeJson(banPath, banned, { spaces: 2 });
  } else {
    api.sendMessage(notifyMsg, defenderID);
  }

  await fs.writeJson(dataPath, data, { spaces: 2 });
  return api.sendMessage(resultMsg, threadID);
};
