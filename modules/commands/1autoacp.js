const fs = require('fs');
const path = require('path');

// File lưu trữ cấu hình auto add friend
const configPath = path.join(__dirname, 'autoAddConfig.json');

// Hàm đọc cấu hình
function getAutoAddConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      const defaultConfig = { enabled: false, autoAccept: true };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    return { enabled: false, autoAccept: true };
  }
}

// Hàm lưu cấu hình
function saveAutoAddConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports.config = {
  name: "autoadd",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "NTKhang - Modified",
  description: "Tự động kết bạn với công tắc bật/tắt",
  commandCategory: "Hệ thống",
  usages: "[on|off|status|list|accept|reject]",
  cooldowns: 5
};

module.exports.handleReply = async ({ handleReply, event, api }) => {
  const { author, listRequest, action } = handleReply;
  if (author != event.senderID) return;

  const args = event.body.replace(/ +/g, " ").toLowerCase().split(" ");
  
  const form = {
    av: api.getCurrentUserID(),
    fb_api_caller_class: "RelayModern",
    variables: {
      input: {
        source: "friends_tab",
        actor_id: api.getCurrentUserID(),
        client_mutation_id: Math.round(Math.random() * 19).toString()
      },
      scale: 3,
      refresh_num: 0
    }
  };
  
  const success = [];
  const failed = [];
  
  if (args[0] == "add" || args[0] == "accept") {
    form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
    form.doc_id = "3147613905362928";
  }
  else if (args[0] == "del" || args[0] == "reject") {
    form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
    form.doc_id = "4108254489275063";
  }
  else return api.sendMessage("❌ Vui lòng chọn: <accept|reject|add|del> <số thứ tự | hoặc \"all\">", event.threadID, event.messageID);

  let targetIDs = args.slice(1);
  
  if (args[1] == "all") {
    targetIDs = [];
    const lengthList = listRequest.length;
    for (let i = 1; i <= lengthList; i++) targetIDs.push(i);
  }
  
  const newTargetIDs = [];
  const promiseFriends = [];
  
  for (const stt of targetIDs) {
    const u = listRequest[parseInt(stt) - 1];
    if (!u) {
      failed.push(`Không tìm thấy STT ${stt}`);
      continue;
    }
    form.variables.input.friend_requester_id = u.node.id;
    form.variables = JSON.stringify(form.variables);
    newTargetIDs.push(u);
    promiseFriends.push(api.httpPost("https://www.facebook.com/api/graphql/", form));
    form.variables = JSON.parse(form.variables);
  }
  
  const lengthTarget = newTargetIDs.length;
  for (let i = 0; i < lengthTarget; i++) {
    try {
      const friendRequest = await promiseFriends[i];
      if (JSON.parse(friendRequest).errors) failed.push(newTargetIDs[i].node.name);
      else success.push(newTargetIDs[i].node.name);
    }
    catch(e) {
      failed.push(newTargetIDs[i].node.name);
    }
  }
  
  const actionText = (args[0] == 'add' || args[0] == 'accept') ? 'chấp nhận' : 'từ chối';
  api.sendMessage(`✅ Đã ${actionText} lời mời kết bạn thành công của ${success.length} người:\n${success.join("\n")}${failed.length > 0 ? `\n❌ Thất bại với ${failed.length} người:\n${failed.join("\n")}` : ""}`, event.threadID, event.messageID);
};

// Hàm tự động xử lý friend request
async function autoProcessFriendRequests(api) {
  const config = getAutoAddConfig();
  if (!config.enabled) return;
  
  console.log(`🔄 Auto check friend requests...`); // Debug log

  try {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
      fb_api_caller_class: "RelayModern",
      doc_id: "4499164963466303",
      variables: JSON.stringify({input: {scale: 3}})
    };
    
    const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
    const responseData = JSON.parse(response);
    
    // Kiểm tra cấu trúc response
    if (!responseData || !responseData.data || !responseData.data.viewer || !responseData.data.viewer.friending_possibilities) {
      return; // Im lặng
    }
    
    const listRequest = responseData.data.viewer.friending_possibilities.edges;
    
    if (listRequest.length === 0) return;

    const processForm = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      variables: {
        input: {
          source: "friends_tab",
          actor_id: api.getCurrentUserID(),
          client_mutation_id: Math.round(Math.random() * 19).toString()
        },
        scale: 3,
        refresh_num: 0
      }
    };

    if (config.autoAccept) {
      processForm.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
      processForm.doc_id = "3147613905362928";
    } else {
      processForm.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
      processForm.doc_id = "4108254489275063";
    }

    const processed = [];
    for (const user of listRequest) {
      try {
        processForm.variables.input.friend_requester_id = user.node.id;
        processForm.variables = JSON.stringify(processForm.variables);
        
        const result = await api.httpPost("https://www.facebook.com/api/graphql/", processForm);
        if (!JSON.parse(result).errors) {
          processed.push(user.node.name);
        }
        
        processForm.variables = JSON.parse(processForm.variables);
        
        // Delay để tránh spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Im lặng
      }
    }

    if (processed.length > 0) {
      console.log(`🤖 Auto ${config.autoAccept ? 'chấp nhận' : 'từ chối'} ${processed.length} lời mời kết bạn: ${processed.join(', ')}`);
    }
  } catch (error) {
    // Im lặng - không log gì
  }
}

module.exports.run = async ({ event, api, args }) => {
  const moment = require("moment-timezone");
  
  if (!args[0]) {
    const config = getAutoAddConfig();
    return api.sendMessage(
      `🤖 AUTO ADD FRIEND BOT\n\n` +
      `📊 Trạng thái: ${config.enabled ? '🟢 BẬT' : '🔴 TẮT'}\n` +
      `⚙️ Chế độ: ${config.autoAccept ? '✅ Tự động chấp nhận' : '❌ Tự động từ chối'}\n\n` +
      `📝 Cách sử dụng:\n` +
      `• ${this.config.name} on - Bật auto add\n` +
      `• ${this.config.name} off - Tắt auto add\n` +
      `• ${this.config.name} accept - Đặt chế độ tự động chấp nhận\n` +
      `• ${this.config.name} reject - Đặt chế độ tự động từ chối\n` +
      `• ${this.config.name} status - Xem trạng thái\n` +
      `• ${this.config.name} list - Xem danh sách lời mời kết bạn`,
      event.threadID, event.messageID
    );
  }

  const command = args[0].toLowerCase();
  const config = getAutoAddConfig();

  switch (command) {
    case "on":
    case "bật":
      config.enabled = true;
      if (saveAutoAddConfig(config)) {
        api.sendMessage("🟢 Đã BẬT chức năng auto add friend!", event.threadID, event.messageID);
        
        // Bắt đầu auto process
        setInterval(() => autoProcessFriendRequests(api), 30000); // Chạy mỗi 30 giây
      } else {
        api.sendMessage("❌ Lỗi khi lưu cấu hình!", event.threadID, event.messageID);
      }
      break;

    case "off":
    case "tắt":
      config.enabled = false;
      if (saveAutoAddConfig(config)) {
        api.sendMessage("🔴 Đã TẮT chức năng auto add friend!", event.threadID, event.messageID);
      } else {
        api.sendMessage("❌ Lỗi khi lưu cấu hình!", event.threadID, event.messageID);
      }
      break;

    case "accept":
    case "chấpnhận":
      config.autoAccept = true;
      if (saveAutoAddConfig(config)) {
        api.sendMessage("✅ Đã đặt chế độ: Tự động CHẤP NHẬN lời mời kết bạn!", event.threadID, event.messageID);
      } else {
        api.sendMessage("❌ Lỗi khi lưu cấu hình!", event.threadID, event.messageID);
      }
      break;

    case "reject":
    case "từchối":
      config.autoAccept = false;
      if (saveAutoAddConfig(config)) {
        api.sendMessage("❌ Đã đặt chế độ: Tự động TỪ CHỐI lời mời kết bạn!", event.threadID, event.messageID);
      } else {
        api.sendMessage("❌ Lỗi khi lưu cấu hình!", event.threadID, event.messageID);
      }
      break;

    case "status":
    case "trạngthái":
      api.sendMessage(
        `📊 TRẠNG THÁI AUTO ADD FRIEND:\n\n` +
        `🔘 Tính năng: ${config.enabled ? '🟢 ĐANG BẬT' : '🔴 ĐANG TẮT'}\n` +
        `⚙️ Chế độ: ${config.autoAccept ? '✅ Tự động chấp nhận' : '❌ Tự động từ chối'}`,
        event.threadID, event.messageID
      );
      break;

    case "list":
    case "danhsách":
      // Thử API mới hơn
      const forms = [
        {
          av: api.getCurrentUserID(),
          fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
          fb_api_caller_class: "RelayModern", 
          doc_id: "4499164963466303",
          variables: JSON.stringify({input: {scale: 3}})
        },
        {
          av: api.getCurrentUserID(),
          fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
          fb_api_caller_class: "RelayModern",
          doc_id: "3691490624291607", // API backup
          variables: JSON.stringify({input: {scale: 3}})
        }
      ];
      
      let success = false;
      let listRequest = [];
      
      // Thử từng API
      for (let form of forms) {
        try {
          console.log(`🔄 Thử API doc_id: ${form.doc_id}`);
          const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
          console.log(`📥 Response: ${response.substring(0, 200)}...`);
          
          const responseData = JSON.parse(response);
          
          if (responseData && responseData.data && responseData.data.viewer && responseData.data.viewer.friending_possibilities) {
            listRequest = responseData.data.viewer.friending_possibilities.edges;
            success = true;
            console.log(`✅ API thành công! Tìm thấy ${listRequest.length} requests`);
            break;
          }
        } catch (error) {
          console.log(`❌ API ${form.doc_id} failed:`, error.message);
        }
      }
      
      if (!success) {
        return api.sendMessage("❌ Tất cả API đều lỗi! Có thể:\n🔸 Token hết hạn\n🔸 Facebook thay đổi API\n🔸 Tài khoản bị hạn chế", event.threadID, event.messageID);
      }
        
      if (listRequest.length === 0) {
        return api.sendMessage("📭 Không có lời mời kết bạn nào!", event.threadID, event.messageID);
      }

      let msg = "📋 DANH SÁCH LỜI MỜI KẾT BẠN:\n\n";
      let i = 0;
      
      for (const user of listRequest) {
        i++;
        msg += (`${i}. 👤 ${user.node.name}\n` +
                `🆔 ID: ${user.node.id}\n` +
                `🔗 Link: ${user.node.url.replace("www.facebook", "fb")}\n` +
                `⏰ Thời gian: ${moment(user.time*1000).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss")}\n\n`);
      }
      
      msg += `💡 Reply tin nhắn này với:\n` +
             `• "accept <số>" hoặc "accept all" - Chấp nhận\n` +
             `• "reject <số>" hoặc "reject all" - Từ chối`;

      api.sendMessage(msg, event.threadID, (e, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          listRequest,
          author: event.senderID,
          action: "manual"
        });
      }, event.messageID);
      break;

    default:
      api.sendMessage(
        `❌ Lệnh không hợp lệ!\n\n` +
        `✅ Các lệnh khả dụng:\n` +
        `• on/off - Bật/tắt auto add\n` +
        `• accept/reject - Chế độ chấp nhận/từ chối\n` +
        `• status - Xem trạng thái\n` +
        `• list - Xem danh sách lời mời`,
        event.threadID, event.messageID
      );
  }
};

// Auto-start khi bot khởi động
module.exports.handleEvent = async ({ api }) => {
  const config = getAutoAddConfig();
  if (config.enabled) {
    // Khởi động auto process với delay
    setTimeout(() => {
      setInterval(() => autoProcessFriendRequests(api), 30000);
    }, 5000);
  }
};