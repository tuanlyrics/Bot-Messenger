const fs = require('fs');
const path = require('path');

// Hàm ghi log ra file
function logToFile(message, isError = false) {
  try {
    const logPath = path.join(__dirname, '../cache/cb.log');
    const timestamp = new Date().toISOString();
    const logLevel = isError ? '[ERROR]' : '[INFO]';
    const logMessage = `${timestamp} ${logLevel} ${message}\n`;
    
    fs.appendFileSync(logPath, logMessage, 'utf8');
  } catch (err) {
    console.error("Không thể ghi log file:", err);
  }
}

// Hàm ghi log chi tiết với object
function logDetailToFile(title, data) {
  try {
    const logPath = path.join(__dirname, '../cache/cb.log');
    const timestamp = new Date().toISOString();
    const separator = "═".repeat(60);
    
    let logMessage = `\n${separator}\n`;
    logMessage += `${timestamp} - ${title}\n`;
    logMessage += `${separator}\n`;
    logMessage += typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    logMessage += `\n${separator}\n\n`;
    
    fs.appendFileSync(logPath, logMessage, 'utf8');
  } catch (err) {
    console.error("Không thể ghi log file:", err);
  }
}

module.exports.config = {
  name: "cb",
  version: "1.0.0",
  hasPermission: 1, // Chỉ QTV nhóm mới dùng được
  credits: "Assistant",
  description: "Tạo nhóm chat mới và tự động thêm stk",
  commandCategory: "Admin",
  usages: "{prefix}cb <tên nhóm> [@tag người]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args, Users }) {
  try {
    logToFile("=== BẮT ĐẦU LỆNH TẠO NHÓM ===");
    
    // Kiểm tra xem có tên nhóm không
    if (args.length === 0) {
      logToFile("Người dùng không nhập tên nhóm", true);
      return api.sendMessage("⚠️ Vui lòng nhập tên nhóm!\nCú pháp: cb <tên nhóm> [@tag người]", event.threadID);
    }

    const threadID = event.threadID;
    const senderID = event.senderID;
    
    logToFile(`Người yêu cầu: ${senderID} | Nhóm hiện tại: ${threadID}`);
    
    // Lấy danh sách người được tag
    const mentions = Object.keys(event.mentions || {});
    
    // Tạo danh sách người tham gia (bao gồm người yêu cầu và người được tag)
    let participantIDs = [senderID, ...mentions];
    
    // Loại bỏ trùng lặp
    participantIDs = [...new Set(participantIDs)];
    
    // Lấy tên nhóm (bỏ phần tag)
    let groupName = args.join(" ");
    // Xóa phần mention khỏi tên nhóm
    for (let mention in event.mentions) {
      groupName = groupName.replace(`@${event.mentions[mention]}`, '').trim();
    }
    
    if (!groupName) {
      logToFile("Tên nhóm rỗng sau khi xử lý", true);
      return api.sendMessage("⚠️ Vui lòng nhập tên nhóm!", event.threadID);
    }

    logToFile(`Tên nhóm: "${groupName}" | Số thành viên: ${participantIDs.length}`);
    api.sendMessage("⏳ Đang tạo nhóm...", event.threadID);

    // Tạo nhóm mới
    api.createNewGroup(participantIDs, groupName, async (err, newThreadID) => {
      if (err) {
        logDetailToFile("❌ LỖI TẠO NHÓM (Lần 1)", {
          senderID: senderID,
          groupName: groupName,
          participantIDs: participantIDs,
          error: err
        });
        
        console.error("════════════════════════════════════════");
        console.error("❌ LỖI TẠO NHÓM (Lần 1):");
        console.error("Chi tiết đã được ghi vào cb.log");
        console.error("Lỗi:", err.errors?.[0]?.summary || "Unknown error");
        console.error("════════════════════════════════════════");
        
        // Kiểm tra lỗi có phải do người được tag không
        const isUserUnavailable = err.errors?.[0]?.code === 1545041;
        
        if (isUserUnavailable && mentions.length > 0) {
          // Nếu không thêm được người khác, tạo nhóm chỉ có người yêu cầu
          logToFile("🔄 Thử tạo nhóm chỉ với người yêu cầu (người được tag không khả dụng)...");
          
          api.createNewGroup([senderID], groupName, async (err2, newThreadID2) => {
            if (err2) {
              logDetailToFile("❌ LỖI TẠO NHÓM (Lần 2 - Thất bại hoàn toàn)", {
                senderID: senderID,
                groupName: groupName,
                error: err2
              });
              
              console.error("════════════════════════════════════════");
              console.error("❌ LỖI TẠO NHÓM (Lần 2):");
              console.error("Chi tiết đã được ghi vào cb.log");
              console.error("Lỗi:", err2.errors?.[0]?.summary || "Unknown error");
              console.error("════════════════════════════════════════");
              
              // Gửi thông báo chi tiết về lỗi
              let errorMsg = "❌ Không thể tạo nhóm!\n\n";
              errorMsg += "🔍 Nguyên nhân có thể:\n";
              errorMsg += "• Bot không có quyền tạo nhóm\n";
              errorMsg += "• Tài khoản bot bị giới hạn\n";
              errorMsg += "• API Facebook đang có vấn đề\n";
              errorMsg += "• Người được tag đã chặn bot\n\n";
              errorMsg += "💡 Hãy thử:\n";
              errorMsg += "• Tạo nhóm thủ công rồi thêm bot vào\n";
              errorMsg += "• Hoặc tag người khác\n\n";
              errorMsg += "📝 Chi tiết lỗi đã được ghi vào cb.log";
              
              return api.sendMessage(errorMsg, event.threadID);
            }
            
            logToFile(`✅ Tạo nhóm thành công (chỉ có người yêu cầu): ${newThreadID2}`);
            console.log(`✅ Tạo nhóm thành công (Lần 2): ${newThreadID2}`);
            
            // Thông báo người được tag không thêm được
            api.sendMessage("⚠️ Không thể thêm người được tag vào nhóm (họ có thể đã chặn bot hoặc không cho phép nhận tin).\n\nNhóm vẫn được tạo thành công, đang gửi link...", event.threadID);
            
            await handleNewGroup(api, newThreadID2, groupName, senderID, threadID, mentions);
          });
          return;
        }
        
        // Nếu lỗi khác, thông báo ngay
        let errorMsg = "❌ Không thể tạo nhóm!\n\n";
        errorMsg += `🔍 Lỗi: ${err.errors?.[0]?.summary || "Lỗi không xác định"}\n`;
        errorMsg += `📝 Mô tả: ${err.errors?.[0]?.description || "Không có mô tả"}\n\n`;
        errorMsg += "💡 Vui lòng thử lại sau hoặc tạo nhóm thủ công!";
        
        return api.sendMessage(errorMsg, event.threadID);
      }
      
      logToFile(`✅ Tạo nhóm thành công (có thêm người được tag): ${newThreadID}`);
      console.log(`✅ Tạo nhóm thành công (Lần 1): ${newThreadID}`);
      await handleNewGroup(api, newThreadID, groupName, senderID, threadID, mentions);
    });

  } catch (error) {
    logDetailToFile("❌ LỖI NGOẠI LỆ trong lệnh CB", {
      error: error.message,
      stack: error.stack
    });
    
    console.error("════════════════════════════════════════");
    console.error("❌ LỖI NGOẠI LỆ - Chi tiết trong cb.log");
    console.error("════════════════════════════════════════");
    
    return api.sendMessage("❌ Đã xảy ra lỗi khi tạo nhóm!\n\n🔍 Chi tiết lỗi đã được ghi vào file cb.log", event.threadID);
  }
};

// Hàm xử lý sau khi tạo nhóm thành công
async function handleNewGroup(api, newThreadID, groupName, senderID, oldThreadID, mentions) {
  try {
    logToFile(`📝 Bắt đầu xử lý nhóm mới: ${newThreadID}`);
    logDetailToFile("Thông tin nhóm mới", {
      newThreadID,
      groupName,
      senderID,
      oldThreadID,
      mentionsCount: mentions.length
    });
    
    // Lấy link nhóm - có nhiều cách để lấy link
    const groupLink = `https://m.me/j/${newThreadID}`;
    
    // Copy config STK từ nhóm cũ sang nhóm mới
    await copyBankConfig(oldThreadID, newThreadID);
    
    // Gửi thông báo và link về nhóm cũ
    let message = `✅ Đã tạo nhóm "${groupName}" thành công!\n\n`;
    message += `🔗 Link nhóm:\n${groupLink}\n\n`;
    message += `📋 ID nhóm: ${newThreadID}\n\n`;
    
    if (mentions.length > 0) {
      message += `⚠️ Nếu không thêm được người được tag, hãy dùng link trên để mời họ vào nhóm.\n\n`;
    }
    
    message += `💡 Khi bạn vào nhóm qua link, bot sẽ tự động thăng bạn lên QTV!`;
    
    logToFile(`📤 Gửi link về nhóm cũ: ${oldThreadID}`);
    api.sendMessage(message, oldThreadID, (err) => {
      if (err) {
        logDetailToFile("❌ LỖI GỬI LINK VỀ NHÓM CŨ", {
          oldThreadID: oldThreadID,
          error: err
        });
        console.error("Lỗi gửi link - Chi tiết trong cb.log");
      } else {
        logToFile(`✅ Đã gửi link thành công về nhóm: ${oldThreadID}`);
      }
    });
    
    // Gửi thông báo chào mừng vào nhóm mới
    setTimeout(() => {
      logToFile(`📤 Gửi tin nhắn chào mừng vào nhóm mới: ${newThreadID}`);
      api.sendMessage(`🎉 Chào mừng đến với nhóm "${groupName}"!\n\n📌 Nhóm này được tạo bởi người dùng và đã kế thừa cấu hình STK từ nhóm gốc.\n\n🔗 Link tham gia: ${groupLink}`, newThreadID, (err) => {
        if (err) {
          logDetailToFile("❌ LỖI GỬI TIN NHẮN VÀO NHÓM MỚI", {
            newThreadID: newThreadID,
            error: err
          });
          console.error("Lỗi gửi tin nhắn - Chi tiết trong cb.log");
        } else {
          logToFile(`✅ Đã gửi tin nhắn chào mừng thành công`);
        }
      });
    }, 2000);
    
    // Lưu thông tin người tạo nhóm để tự động thăng admin
    saveCreatorInfo(newThreadID, senderID);
    
  } catch (error) {
    logDetailToFile("❌ LỖI XỬ LÝ NHÓM MỚI", {
      error: error.message,
      stack: error.stack
    });
    console.error("Lỗi xử lý nhóm mới - Chi tiết trong cb.log");
  }
}

// Hàm copy config STK từ nhóm cũ sang nhóm mới
async function copyBankConfig(oldThreadID, newThreadID) {
  try {
    const configPath = path.join(__dirname, '../cache/stk_config.json');
    
    logToFile(`📂 Đọc file config STK: ${configPath}`);
    
    // Đọc file config
    let config = {};
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
      logToFile("✅ Đọc file stk_config.json thành công");
    } else {
      logToFile("⚠️ File stk_config.json không tồn tại");
      return;
    }
    
    // Copy config từ nhóm cũ sang nhóm mới
    if (config[oldThreadID]) {
      config[newThreadID] = { ...config[oldThreadID] };
      
      // Lưu lại file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      logToFile(`✅ Đã copy config STK từ nhóm ${oldThreadID} sang ${newThreadID}`);
      logDetailToFile("Nội dung STK đã copy", config[newThreadID]);
    } else {
      logToFile(`⚠️ Nhóm ${oldThreadID} không có config STK để copy`);
    }
  } catch (error) {
    logDetailToFile("❌ LỖI COPY BANK CONFIG", {
      error: error.message,
      stack: error.stack
    });
    console.error("Lỗi copy bank config - Chi tiết trong cb.log");
  }
}

// Hàm lưu thông tin người tạo nhóm
function saveCreatorInfo(threadID, creatorID) {
  try {
    const creatorInfoPath = path.join(__dirname, '../cache/group_creators.json');
    
    logToFile("💾 Lưu thông tin người tạo nhóm...");
    
    let creators = {};
    if (fs.existsSync(creatorInfoPath)) {
      const data = fs.readFileSync(creatorInfoPath, 'utf8');
      creators = JSON.parse(data);
    }
    
    creators[threadID] = {
      creatorID: creatorID,
      createdAt: Date.now()
    };
    
    fs.writeFileSync(creatorInfoPath, JSON.stringify(creators, null, 2), 'utf8');
    logToFile(`✅ Đã lưu: ThreadID ${threadID} - Creator ${creatorID}`);
  } catch (error) {
    logDetailToFile("❌ LỖI LƯU CREATOR INFO", {
      error: error.message,
      stack: error.stack
    });
    console.error("Lỗi lưu creator info - Chi tiết trong cb.log");
  }
}

// Event handler - Thêm vào file events/handle.js hoặc tạo file riêng
module.exports.handleEvent = async function({ api, event }) {
  try {
    // Chỉ xử lý khi có người vào nhóm
    if (event.logMessageType !== "log:subscribe") return;
    
    const threadID = event.threadID;
    const addedUsers = event.logMessageData.addedParticipants;
    
    if (!addedUsers || addedUsers.length === 0) return;
    
    logToFile(`👤 Có người vào nhóm: ${threadID}`);
    logToFile(`Danh sách: ${addedUsers.map(u => u.userFbId).join(', ')}`);
    
    // Đọc thông tin người tạo nhóm
    const creatorInfoPath = path.join(__dirname, '../cache/group_creators.json');
    
    if (!fs.existsSync(creatorInfoPath)) {
      logToFile("⚠️ File group_creators.json không tồn tại");
      return;
    }
    
    const data = fs.readFileSync(creatorInfoPath, 'utf8');
    const creators = JSON.parse(data);
    
    // Kiểm tra xem nhóm này có trong danh sách không
    if (!creators[threadID]) {
      logToFile("ℹ️ Nhóm này không có trong danh sách theo dõi");
      return;
    }
    
    const creatorID = creators[threadID].creatorID;
    logToFile(`🔍 Người tạo nhóm: ${creatorID}`);
    
    // Kiểm tra xem người vừa vào có phải là người tạo nhóm không
    for (let user of addedUsers) {
      if (user.userFbId === creatorID) {
        logToFile(`✅ Phát hiện người tạo nhóm đã vào!`);
        
        // Thăng người đó lên admin
        setTimeout(() => {
          logToFile(`👑 Đang thăng người dùng ${creatorID} lên QTV...`);
          api.changeAdminStatus(threadID, creatorID, true, (err) => {
            if (err) {
              logDetailToFile("❌ LỖI THĂNG ADMIN", {
                threadID: threadID,
                creatorID: creatorID,
                error: err
              });
              console.error("Lỗi thăng admin - Chi tiết trong cb.log");
              api.sendMessage("⚠️ Không thể thăng bạn lên QTV. Vui lòng yêu cầu admin hiện tại thăng cho bạn.", threadID);
            } else {
              logToFile(`✅ Đã thăng QTV thành công cho: ${creatorID}`);
              api.sendMessage(`✅ Đã tự động thăng bạn lên Quản trị viên nhóm!`, threadID);
              
              // Xóa thông tin sau khi thăng thành công
              delete creators[threadID];
              fs.writeFileSync(creatorInfoPath, JSON.stringify(creators, null, 2), 'utf8');
              logToFile(`🗑️ Đã xóa thông tin tracking nhóm: ${threadID}`);
            }
          });
        }, 2000);
        break;
      }
    }
  } catch (error) {
    logDetailToFile("❌ LỖI TRONG HANDLEEVENT", {
      error: error.message,
      stack: error.stack
    });
    console.error("Lỗi handleEvent - Chi tiết trong cb.log");
  }
};Event = async function({ api, event }) {
  try {
    // Chỉ xử lý khi có người vào nhóm
    if (event.logMessageType !== "log:subscribe") return;
    
    const threadID = event.threadID;
    const addedUsers = event.logMessageData.addedParticipants;
    
    if (!addedUsers || addedUsers.length === 0) return;
    
    console.log("👤 Có người vào nhóm:", threadID);
    console.log("Danh sách người vào:", addedUsers.map(u => u.userFbId));
    
    // Đọc thông tin người tạo nhóm
    const creatorInfoPath = path.join(__dirname, '../cache/group_creators.json');
    
    if (!fs.existsSync(creatorInfoPath)) {
      console.log("⚠️ File group_creators.json không tồn tại");
      return;
    }
    
    const data = fs.readFileSync(creatorInfoPath, 'utf8');
    const creators = JSON.parse(data);
    
    // Kiểm tra xem nhóm này có trong danh sách không
    if (!creators[threadID]) {
      console.log("ℹ️ Nhóm này không có trong danh sách theo dõi");
      return;
    }
    
    const creatorID = creators[threadID].creatorID;
    console.log("🔍 Người tạo nhóm:", creatorID);
    
    // Kiểm tra xem người vừa vào có phải là người tạo nhóm không
    for (let user of addedUsers) {
      if (user.userFbId === creatorID) {
        console.log("✅ Phát hiện người tạo nhóm đã vào!");
        
        // Thăng người đó lên admin
        setTimeout(() => {
          console.log("👑 Đang thăng người dùng lên QTV...");
          api.changeAdminStatus(threadID, creatorID, true, (err) => {
            if (err) {
              console.error("════════════════════════════════════════");
              console.error("❌ LỖI THĂNG ADMIN:");
              console.error("ThreadID:", threadID);
              console.error("UserID:", creatorID);
              console.error("Chi tiết lỗi:", JSON.stringify(err, null, 2));
              console.error("════════════════════════════════════════");
              api.sendMessage("⚠️ Không thể thăng bạn lên QTV. Vui lòng yêu cầu admin hiện tại thăng cho bạn.", threadID);
            } else {
              console.log("✅ Đã thăng QTV thành công cho:", creatorID);
              api.sendMessage(`✅ Đã tự động thăng bạn lên Quản trị viên nhóm!`, threadID);
              
              // Xóa thông tin sau khi thăng thành công
              delete creators[threadID];
              fs.writeFileSync(creatorInfoPath, JSON.stringify(creators, null, 2), 'utf8');
              console.log("🗑️ Đã xóa thông tin tracking nhóm:", threadID);
            }
          });
        }, 2000);
        break;
      }
    }
  } catch (error) {
    console.error("════════════════════════════════════════");
    console.error("❌ LỖI TRONG HANDLEEVENT:");
    console.error("Stack trace:", error.stack);
    console.error("════════════════════════════════════════");
  }
};