// handleEvent.js - fix by Pcoder
module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const logger = require("../../utils/log.js");
  const moment = require("moment");

  return function ({ event }) {
    const { logMessageType, type } = event;
    const timeStart = Date.now();
    const time = moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss L");

    const { userBanned, threadBanned } = global.data;
    const { events } = global.client;
    const { allowInbox, DeveloperMode } = global.config;

    let { senderID, threadID } = event;

    senderID = String(senderID);
    threadID = String(threadID);

    // ⛔ Bỏ qua nếu user hoặc thread bị chặn, hoặc không cho inbox
    if (
      userBanned.has(senderID) ||
      threadBanned.has(threadID) ||
      (allowInbox === false && senderID === threadID)
    ) {
      return;
    }

    // 🔧 Danh sách tên event muốn tắt hoàn toàn
    const disabledEvents = [
      "subscribe",
      "log:unsubscribe",
      "unsend"
      // 👉 Thêm tên event khác nếu muốn tắt
    ];

    // 🪵 Log sự kiện khi DeveloperMode bật
    if (DeveloperMode === true && type === "message") {
      console.log("[EVENT]", {
        type,
        threadID,
        senderID,
        messageID: event.messageID,
        body: event.body,
        messageReply: event.messageReply?.messageID || undefined
      });
    }

    // 🔁 Duyệt qua tất cả event đã load
    for (const [key, value] of events.entries()) {
      if (!value?.config?.eventType || !Array.isArray(value.config.eventType)) continue;

      // ⛔ Bỏ qua nếu nằm trong danh sách tắt
      if (disabledEvents.includes(value.config.name)) continue;

      // ✅ Nếu khớp loại sự kiện thì chạy
      if (value.config.eventType.includes(logMessageType)) {
        const eventRun = events.get(key);

        try {
          const Obj = {
            api,
            event,
            models,
            Users,
            Threads,
            Currencies
          };

          eventRun.run(Obj);

          if (DeveloperMode === true) {
            logger(
              global.getText("handleEvent", "executeEvent", time, eventRun.config.name, threadID, Date.now() - timeStart),
              "[ Sự kiện ]"
            );
          }
        } catch (error) {
          logger(
            global.getText("handleEvent", "eventError", eventRun.config.name, JSON.stringify(error)),
            "error"
          );
        }
      }
    }
  };
};
