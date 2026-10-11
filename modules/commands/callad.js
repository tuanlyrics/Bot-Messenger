module.exports.config = {
  name: "callad",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Improved Version",
  description: "Báo cáo lỗi hoặc liên hệ admin",
  commandCategory: "Tiện ích",
  usages: "[nội dung báo cáo]",
  cooldowns: 5,
};

module.exports.handleReply = async function({ api, args, event, handleReply, Users }) {
  try {
    const name = (await Users.getData(event.senderID)).name;
    const attachments = await handleAttachments(event.attachments);
    
    switch (handleReply.type) {
      case "reply": {
        const adminList = global.config.ADMINBOT;
        const messageContent = event.body || "Không có nội dung";
        
        const replyMessage = {
          body: `📞 Phản hồi từ ${name}:\n💬 Nội dung: ${messageContent}`,
          mentions: [{ id: event.senderID, tag: name }]
        };
        
        if (attachments.streams.length > 0) {
          replyMessage.attachment = attachments.streams;
        }
        
        for (let adminID of adminList) {
          api.sendMessage(replyMessage, adminID, (e, data) => {
            if (!e) {
              global.client.handleReply.push({
                name: this.config.name,
                messageID: data.messageID,
                messID: event.messageID,
                author: event.senderID,
                id: event.threadID,
                type: "calladmin"
              });
            }
          });
        }
        
        cleanupFiles(attachments.paths);
        break;
      }
      
      case "calladmin": {
        const messageContent = event.body || "Không có nội dung phản hồi";
        
        // Gửi phản hồi đến user
        const userReply = {
          body: `📌 Phản hồi từ Admin ${name}:\n\n💬 Nội dung: ${messageContent}\n\n» Phản hồi tin nhắn này nếu muốn tiếp tục trò chuyện với admin`,
          mentions: [{ tag: name, id: event.senderID }]
        };
        
        if (attachments.streams.length > 0) {
          userReply.attachment = attachments.streams;
        }
        
        // Gửi tin nhắn đến user (handleReply.id là threadID của user)
        api.sendMessage(userReply, handleReply.id, (e, data) => {
          if (!e) {
            global.client.handleReply.push({
              name: this.config.name,
              author: event.senderID,
              messageID: data.messageID,
              type: "reply"
            });
          }
        }, handleReply.messID);
        
        cleanupFiles(attachments.paths);
        break;
      }
    }
  } catch (error) {
    console.log("HandleReply Error:", error);
  }
};

module.exports.run = async function({ api, event, Threads, args, Users }) {
  try {
    // Kiểm tra nội dung
    let messageContent = args.join(" ");
    let attachments = { paths: [], streams: [] };
    
    // Xử lý reply message
    if (event.messageReply && event.messageReply.attachments.length > 0) {
      attachments = await handleAttachments(event.messageReply.attachments);
    }
    
    if (!messageContent && attachments.streams.length === 0) {
      return api.sendMessage(
        "⚠️ Bạn chưa nhập nội dung cần báo cáo!",
        event.threadID,
        event.messageID
      );
    }
    
    // Lấy thông tin user và thread
    const name = (await Users.getData(event.senderID)).name;
    const uid = event.senderID;
    const threadID = event.threadID;
    const threadData = (await Threads.getData(threadID)).threadInfo;
    const threadName = threadData.threadName || "Không có tên";
    
    // Thời gian
    const moment = require("moment-timezone");
    const currentTime = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    
    const adminCount = global.config.ADMINBOT.length;
    
    // Thông báo gửi thành công
    api.sendMessage(
      `✅ Đã gửi báo cáo đến ${adminCount} admin thành công!\n⏰ Thời gian: ${currentTime}`,
      threadID,
      () => {
        sendToAdmins(api, {
          name,
          uid,
          threadName,
          threadID,
          messageContent: messageContent || "Chỉ có file đính kèm",
          currentTime,
          attachments,
          senderID: event.senderID,
          originalMessageID: event.messageID
        });
      },
      event.messageID
    );
    
  } catch (error) {
    console.log("Run Error:", error);
    api.sendMessage("❌ Có lỗi xảy ra khi gửi báo cáo!", event.threadID, event.messageID);
  }
};

// Hàm xử lý attachments
async function handleAttachments(attachments) {
  const fs = require('fs-extra');
  const { join } = require('path');
  const axios = require('axios');
  
  const paths = [];
  const streams = [];
  
  if (!attachments || attachments.length === 0) {
    return { paths, streams };
  }
  
  for (let attachment of attachments) {
    try {
      const randomName = generateRandomString(10);
      let extension = 'jpg';
      
      switch (attachment.type) {
        case 'photo': extension = 'jpg'; break;
        case 'video': extension = 'mp4'; break;
        case 'audio': extension = 'mp3'; break;
        case 'animated_image': extension = 'gif'; break;
      }
      
      const filePath = join(__dirname, 'cache', `${randomName}.${extension}`);
      const response = await axios.get(encodeURI(attachment.url), { 
        responseType: "arraybuffer" 
      });
      
      fs.writeFileSync(filePath, Buffer.from(response.data));
      paths.push(filePath);
      streams.push(fs.createReadStream(filePath));
    } catch (error) {
      console.log("Attachment processing error:", error);
    }
  }
  
  return { paths, streams };
}

// Hàm gửi tin nhắn đến admin
function sendToAdmins(api, data) {
  const adminList = global.config.ADMINBOT;
  
  const adminMessage = {
    body: `📱 CALL ADMIN 📱\n\n` +
          `👤 Người báo cáo: ${data.name}\n` +
          `🆔 User ID: ${data.uid}\n` +
          `👥 Nhóm: ${data.threadName}\n` +
          `🔰 Thread ID: ${data.threadID}\n\n` +
          `💌 Nội dung: ${data.messageContent}\n` +
          `⏰ Thời gian: ${data.currentTime}`,
    mentions: [{ id: data.senderID, tag: data.name }]
  };
  
  if (data.attachments.streams.length > 0) {
    adminMessage.attachment = data.attachments.streams;
  }
  
  for (let adminID of adminList) {
    api.sendMessage(adminMessage, adminID, (error, info) => {
      if (!error) {
        global.client.handleReply.push({
          name: "callad",
          messageID: info.messageID,
          author: data.senderID,
          messID: data.originalMessageID,
          id: data.threadID,
          type: "calladmin"
        });
      }
    });
  }
  
  // Cleanup files after sending
  setTimeout(() => {
    cleanupFiles(data.attachments.paths);
  }, 5000);
}

// Hàm tạo chuỗi ngẫu nhiên
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Hàm dọn dẹp file
function cleanupFiles(filePaths) {
  const fs = require('fs-extra');
  for (let filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.log("Cleanup error:", error);
    }
  }
}