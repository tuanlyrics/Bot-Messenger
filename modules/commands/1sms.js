const smsApis = require('./../../lib/smsapi.js');

module.exports.config = {
    name: "sms",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Pcoder",
    description: "Spam OTP/SMS đa API (tối đa 120s)",
    commandCategory: "Tiện ích",
    usages: "sms <sdt> <second (tối đa 120)>",
    cooldowns: 10
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    if (args.length < 2)
        return api.sendMessage("Dùng: sms <sdt> <second (tối đa 120)>", threadID, messageID);

    const phone = args[0].replace(/[^0-9]/g, "");
    let seconds = parseInt(args[1]);
    if (isNaN(seconds) || seconds < 1) seconds = 20;
    if (seconds > 120) seconds = 120;

    let count = 0, funcIndex = 0;
    const startTime = Date.now();

    api.sendMessage(`🔰 Bắt đầu spam SMS/OTP cho số: ${phone}\n⏳ Thời gian: ${seconds}s\n⏱️ Vui lòng chờ...`, threadID, messageID);

    async function spamLoop() {
        while (Date.now() - startTime < seconds * 1000) {
            const fn = smsApis[funcIndex];
            funcIndex = (funcIndex + 1) % smsApis.length;
            count++;
            try { await fn(phone); } catch (e) {}
            await new Promise(r => setTimeout(r, 700));
        }
        api.sendMessage(`✅ Đã hoàn thành spam: ${count} lần gửi SMS/OTP cho ${phone} trong ${seconds} giây.`, threadID);
    }
    spamLoop();
};