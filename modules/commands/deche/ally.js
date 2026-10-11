const fs = require('fs-extra');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'groups.json');
const allyPath = path.join(__dirname, 'data', 'allies.json');

module.exports = async function (api, event, args) {
  const threadID = event.threadID;
  const senderID = event.senderID;

  const data = await fs.readJson(dataPath).catch(() => ({}));
  const allies = await fs.readJson(allyPath).catch(() => ({}));

  const group = data[threadID];
  if (!group || !group.territory) return api.sendMessage('❌ Nhóm bạn chưa tham gia game.', threadID);

  const sub = args[1];
  const targetID = args[2];
  const threadSetting = global.data.threadData.get(event.threadID) || {};
  const prefix = threadSetting.PREFIX || global.config.PREFIX;

  // Hiện danh sách nhóm có thể liên minh nếu dùng ally add mà không kèm threadID
  if (sub === 'add' && !targetID) {
    const groupList = Object.entries(data)
      .filter(([tid, info]) => tid !== threadID && info.territory && !(allies[threadID]||[]).includes(tid))
      .map(([tid, info], i) => ({
        index: i + 1,
        threadID: tid,
        name: info.name || `Chưa rõ tên`,
        territory: info.territory || "",
        memberCount: Array.isArray(info.memberIDs) ? info.memberIDs.length : (info.memberIDs?.size || 0) || "?"
      }));

    if (groupList.length === 0)
      return api.sendMessage("⚠️ Không còn nhóm nào có thể liên minh!", threadID);

    const msg = groupList
      .map(gr => `${gr.index}. [${gr.threadID}] ${gr.name} (${gr.memberCount} thành viên)`)
      .join('\n');

    return api.sendMessage(
      `🤝 Bạn muốn liên minh với nhóm nào? Hãy reply số thứ tự hoặc threadID!\n${msg}`,
      threadID,
      (err, infoMsg) => {
        if (!err) {
          global.client.handleReply.push({
            name: "deche-ally",
            messageID: infoMsg.messageID,
            author: senderID,
            type: "choose-ally",
            groupList
          });
        }
      }
    );
  }

  // ally listgr
  if (sub === "listgr") {
    const groupList = Object.entries(data)
      .map(([tid, info], i) => ({
        index: i + 1,
        threadID: tid,
        name: info.name || `Chưa rõ tên`,
        memberCount: Array.isArray(info.memberIDs) ? info.memberIDs.length : (info.memberIDs?.size || 0) || "?"
      }));
    if (groupList.length === 0) return api.sendMessage("⚠️ Không có nhóm nào trong dữ liệu.", threadID);

    const msg = groupList
      .map(gr => `${gr.index}. [${gr.threadID}] ${gr.name} (${gr.memberCount} thành viên)`)
      .join('\n');

    return api.sendMessage(
      `📋 Danh sách các group đang tham gia game:\n${msg}\n\n💬 Reply số thứ tự hoặc threadID để xem info chi tiết group.`,
      threadID,
      (err, infoMsg) => {
        if (!err) {
          global.client.handleReply.push({
            name: "deche-ally",
            messageID: infoMsg.messageID,
            author: event.senderID,
            type: "listgr",
            groupList
          });
        }
      }
    );
  }

  if (!sub || !['add', 'remove', 'list', 'listgr'].includes(sub)) {
    return api.sendMessage(
      `🤝 Quản lý liên minh:
- ${prefix}deche ally add → Gửi yêu cầu liên minh (chọn group bằng reply)
- ${prefix}deche ally remove [threadID] → Hủy liên minh
- ${prefix}deche ally list → Danh sách liên minh
- ${prefix}deche ally listgr → Danh sách group đang tham gia game`,
      threadID
    );
  }

  if (sub === 'list') {
    const list = allies[threadID] || [];
    if (list.length === 0) return api.sendMessage('🤝 Nhóm bạn chưa liên minh với nhóm nào.', threadID);
    const msg = list.map(tid => `- Nhóm: ${tid}`).join('\n');
    return api.sendMessage(`🤝 Danh sách liên minh:\n${msg}`, threadID);
  }

  if (!targetID && sub === 'add') return; // đã xử lý ở trên
  if (!targetID) return api.sendMessage('⚠️ Vui lòng cung cấp threadID của nhóm mục tiêu.', threadID);
  if (!data[targetID] || !data[targetID].territory) return api.sendMessage('❌ Nhóm mục tiêu chưa tham gia game.', threadID);
  if (targetID === threadID) return api.sendMessage('❌ Không thể liên minh với chính mình.', threadID);

  if (sub === 'add') {
    const groupAllies = allies[threadID] || [];
    const targetAllies = allies[targetID] || [];

    if (groupAllies.includes(targetID)) return api.sendMessage('🔁 Nhóm bạn đã liên minh với nhóm này.', threadID);

    // Lấy tên nhóm gửi và nhóm nhận nếu có
    const senderName = (data[threadID] && data[threadID].name) ? data[threadID].name : `ID: ${threadID}`;
    const senderTerritory = (data[threadID] && data[threadID].territory) ? data[threadID].territory : '';
    const receiverName = (data[targetID] && data[targetID].name) ? data[targetID].name : `ID: ${targetID}`;
    const receiverTerritory = (data[targetID] && data[targetID].territory) ? data[targetID].territory : '';

    return api.sendMessage(
      `📩 Nhóm "${senderName}" (lãnh thổ: ${senderTerritory}) muốn liên minh với nhóm bạn "${receiverName}" (lãnh thổ: ${receiverTerritory})!\n\nTrả lời 'đồng ý' hoặc 'từ chối' tin nhắn này.`,
      targetID,
      (err, infoMsg) => {
        if (!err) {
          api.sendMessage(`✅ Đã gửi yêu cầu liên minh tới nhóm "${receiverName}" (lãnh thổ: ${receiverTerritory}). Vui lòng chờ phản hồi!`, threadID);
          global.client.handleReply.push({
            name: 'deche-ally',
            messageID: infoMsg.messageID,
            author: senderID,
            type: 'ally-request',
            from: threadID,
            to: targetID
          });
        } else {
          api.sendMessage(`❌ Không gửi được yêu cầu liên minh tới nhóm ${targetID}.`, threadID);
        }
      }
    );
  }

  if (sub === 'remove') {
    // Yêu cầu là admin
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(e => e.id === senderID);
    if (!isAdmin) return api.sendMessage('🔒 Chỉ quản trị viên nhóm mới có thể hủy liên minh.', threadID);

    allies[threadID] = (allies[threadID] || []).filter(tid => tid !== targetID);
    allies[targetID] = (allies[targetID] || []).filter(tid => tid !== threadID);

    await fs.writeJson(allyPath, allies, { spaces: 2 });

    return api.sendMessage(`❌ Đã hủy liên minh với nhóm ${targetID}`, threadID);
  }
};

// --- HANDLE REPLY ---
module.exports.handleReply = async function({ api, event, handleReply }) {
  // Xử lý reply chọn ally để gửi yêu cầu liên minh
  if (handleReply.type === "choose-ally") {
    const input = (event.body || "").trim();
    let groupInfo;
    if (/^\d+$/.test(input)) {
      // Reply số thứ tự
      const idx = parseInt(input, 10) - 1;
      groupInfo = handleReply.groupList[idx];
    } else {
      // Reply threadID
      groupInfo = handleReply.groupList.find(gr => gr.threadID == input);
    }
    if (!groupInfo) return api.sendMessage("❌ Không tìm thấy group tương ứng.", event.threadID, event.messageID);

    // Gửi yêu cầu liên minh như bình thường
    const data = await fs.readJson(dataPath).catch(() => ({}));
    const allies = await fs.readJson(allyPath).catch(() => ({}));
    const yourGroup = data[event.threadID];
    const targetID = groupInfo.threadID;

    // Kiểm tra lại
    if (!data[targetID] || !data[targetID].territory) return api.sendMessage('❌ Nhóm mục tiêu chưa tham gia game.', event.threadID, event.messageID);
    if (targetID === event.threadID) return api.sendMessage('❌ Không thể liên minh với chính mình.', event.threadID, event.messageID);
    if ((allies[event.threadID] || []).includes(targetID)) return api.sendMessage('🔁 Nhóm bạn đã liên minh với nhóm này.', event.threadID, event.messageID);

    const senderName = (yourGroup && yourGroup.name) ? yourGroup.name : `ID: ${event.threadID}`;
    const senderTerritory = (yourGroup && yourGroup.territory) ? yourGroup.territory : '';
    const receiverName = (data[targetID] && data[targetID].name) ? data[targetID].name : `ID: ${targetID}`;
    const receiverTerritory = (data[targetID] && data[targetID].territory) ? data[targetID].territory : '';

    // Gửi thông báo tới nhóm mục tiêu và báo lại cho nhóm gửi yêu cầu
    api.sendMessage(
      `📩 Nhóm "${senderName}" (lãnh thổ: ${senderTerritory}) muốn liên minh với nhóm bạn "${receiverName}" (lãnh thổ: ${receiverTerritory})!\n\nTrả lời 'đồng ý' hoặc 'từ chối' tin nhắn này.`,
      targetID,
      (err, infoMsg) => {
        if (!err) {
          api.sendMessage(`✅ Đã gửi yêu cầu liên minh tới nhóm "${receiverName}" (lãnh thổ: ${receiverTerritory}). Vui lòng chờ phản hồi!`, event.threadID, event.messageID);
          global.client.handleReply.push({
            name: 'deche-ally',
            messageID: infoMsg.messageID,
            author: event.senderID,
            type: 'ally-request',
            from: event.threadID,
            to: targetID
          });
        } else {
          api.sendMessage(`❌ Không gửi được yêu cầu liên minh tới nhóm ${targetID}.`, event.threadID, event.messageID);
        }
      }
    );

    return;
  }

  // Xử lý reply vào danh sách group (listgr)
  if (handleReply.type === "listgr") {
    const input = (event.body || "").trim();
    let groupInfo;
    if (/^\d+$/.test(input)) {
      // Reply số thứ tự
      const idx = parseInt(input, 10) - 1;
      groupInfo = handleReply.groupList[idx];
    } else {
      // Reply threadID
      groupInfo = handleReply.groupList.find(gr => gr.threadID == input);
    }
    if (!groupInfo) return api.sendMessage("❌ Không tìm thấy group tương ứng.", event.threadID, event.messageID);

    // Đọc lại data để lấy info mới nhất
    const data = await fs.readJson(dataPath).catch(() => ({}));
    const info = data[groupInfo.threadID];
    if (!info) return api.sendMessage("❌ Không tìm thấy thông tin group.", event.threadID, event.messageID);

    let items = Object.keys(info.items || {}).join(", ");
    if (!items) items = "Không có";

    const msg =
      `🔎 Thông tin group:\n` +
      `- ThreadID: ${groupInfo.threadID}\n` +
      `- Tên: ${info.name || "Chưa rõ"}\n` +
      `- Thành viên: ${(info.memberIDs && info.memberIDs.length) || "?"}\n` +
      `- Lãnh thổ: ${info.territory || "Chưa có"}\n` +
      `- Máu: ${info.hp || "?"}\n` +
      `- Vật phẩm: ${items}`;

    return api.sendMessage(msg, event.threadID, event.messageID);
  }

  // --- Xử lý reply yêu cầu liên minh ---
  if (handleReply.type === "ally-request") {
    const answer = (event.body || "").trim().toLowerCase();
    if (answer !== "đồng ý" && answer !== "dong y" && answer !== "d" && answer !== "ok") {
      return api.sendMessage("❌ Yêu cầu liên minh đã bị từ chối.", event.threadID, event.messageID);
    }

    // Đồng ý liên minh
    const allies = await fs.readJson(allyPath).catch(() => ({}));
    if (!allies[handleReply.from]) allies[handleReply.from] = [];
    if (!allies[handleReply.to]) allies[handleReply.to] = [];
    if (!allies[handleReply.from].includes(handleReply.to)) allies[handleReply.from].push(handleReply.to);
    if (!allies[handleReply.to].includes(handleReply.from)) allies[handleReply.to].push(handleReply.from);
    await fs.writeJson(allyPath, allies, { spaces: 2 });

    // Thông báo 2 bên
    api.sendMessage("✅ Hai nhóm đã trở thành liên minh!", event.threadID, event.messageID);
    if (handleReply.from !== event.threadID) {
      api.sendMessage("✅ Yêu cầu liên minh đã được chấp nhận!", handleReply.from);
    }
  }
};