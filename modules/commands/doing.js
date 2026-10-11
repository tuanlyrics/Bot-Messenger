module.exports.config = {
    name: "doing",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "DuyVuong & Gemini (Refactor)",
    description: "Làm việc tại các khu vực khác nhau để kiếm tiền, có thời gian chờ và tự thu hồi tin nhắn.",
    commandCategory: "Kinh tế",
    cooldowns: 5,
    dependencies: {
        'fs-extra': '',
        'request': ''
    }
};

// Cấu hình các khu vực làm việc (giữ nguyên)
const works = [
    {
        name: "Khu công nghiệp 🏭",
        jobs: ["lắp ráp linh kiện điện tử", "vận hành máy tiện CNC", "kiểm tra chất lượng sản phẩm", "đóng gói hàng hóa", "lái xe nâng trong kho", "bảo trì hệ thống máy móc", "làm nhân viên văn phòng", "pha cà phê cho sếp", "hack dạo Facebook kiếm thêm"],
        minRate: 200, maxRate: 800, failChance: 0.1,
        failMessages: ["lỡ tay làm hỏng sản phẩm và bị trừ lương.", "ngủ gật trong giờ làm và bị sếp phát hiện.", "bị đồng nghiệp chơi xấu, đổ tội đi muộn."]
    },
    {
        name: "Khu mỏ quặng 💎",
        jobs: ["đào được một viên kim cương nhỏ", "tìm thấy một mạch vàng", "khai thác được 50kg quặng sắt", "phát hiện một hang động thạch anh", "nhặt được dụng cụ của người đi trước bỏ lại", "may mắn đào trúng một túi đá quý"],
        minRate: 300, maxRate: 1200, failChance: 0.15,
        failMessages: ["gặp phải sự cố sập hầm mỏ nhưng may mắn thoát nạn.", "bị một con creeper phát nổ ngay bên cạnh.", "đào cả ngày nhưng chỉ thấy toàn sỏi đá."]
    },
    {
        name: "Khu mỏ dầu ⛽",
        jobs: ["phát hiện một mỏ dầu mới", "vận hành giàn khoan hiệu quả", "xử lý thành công một lô dầu thô", "sửa chữa được một đường ống bị rò rỉ", "bán được 5 thùng dầu với giá cao", "trở thành nhân viên xuất sắc của tháng"],
        minRate: 500, maxRate: 2000, failChance: 0.2,
        failMessages: ["làm tràn dầu và phải tốn tiền để dọn dẹp.", "gây ra một vụ nổ nhỏ, may mà không ai bị thương.", "giàn khoan gặp sự cố kỹ thuật, phải nghỉ cả ngày."]
    }
];

const WORK_COOLDOWN = 15 * 60 * 1000; // 15 phút

// =================================================================
// ▼▼▼ THÊM HÀM MỚI ĐỂ QUẢN LÝ VIỆC GỬI VÀ THU HỒI TIN NHẮN ▼▼▼
// =================================================================
function sendAndUnsend(api, event, message, delay = 15000) { // Mặc định thu hồi sau 15 giây
    api.sendMessage(message, event.threadID, (err, info) => {
        if (err) return console.error(err);
        
        // Thêm tin nhắn vào danh sách chờ thu hồi
        global.client.handleUnsend.push({
            messageID: info.messageID,
            author: event.senderID,
            tid: event.threadID,
            name: this.config.name,
            unsendAfter: Date.now() + delay
        });
    }, event.messageID);
}

module.exports.onLoad = function () {
    // Tạo mảng handleUnsend nếu chưa tồn tại
    if (!global.client.handleUnsend) {
        global.client.handleUnsend = [];
    }
    // Set interval để kiểm tra và thu hồi tin nhắn mỗi 5 giây
    setInterval(() => {
        const now = Date.now();
        for (let i = global.client.handleUnsend.length - 1; i >= 0; i--) {
            const item = global.client.handleUnsend[i];
            if (now >= item.unsendAfter) {
                global.client.api.unsendMessage(item.messageID).catch(err => {});
                global.client.handleUnsend.splice(i, 1);
            }
        }
    }, 5000);
}

module.exports.run = async function({ api, event, Currencies }) {
    const { threadID, messageID, senderID } = event;

    let userData = (await Currencies.getData(senderID)) || {};
    let workData = userData.work || {};

    const lastWorkTime = workData.lastTime || 0;
    const currentTime = Date.now();
    const timeSinceLastWork = currentTime - lastWorkTime;

    if (timeSinceLastWork < WORK_COOLDOWN) {
        const remainingTime = WORK_COOLDOWN - timeSinceLastWork;
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = ((remainingTime % 60000) / 1000).toFixed(0);
        const msg = `🥵 Bạn vừa mới làm việc xong, hãy nghỉ ngơi chút đi.\n⏱️ Vui lòng quay lại sau ${minutes} phút ${seconds} giây nữa.`;
        
        // Sử dụng hàm mới để gửi và tự thu hồi
        return sendAndUnsend.call(this, api, event, msg);
    }

    let msg = "💼 BẢNG CÔNG VIỆC 💼\n\nMời bạn chọn khu vực để làm việc:\n\n";
    works.forEach((work, index) => {
        msg += `${index + 1}. ${work.name}\n`;
    });
    msg += "\n» Hãy reply tin nhắn này và chọn theo số «";

    return api.sendMessage(msg, threadID, (error, info) => {
        if (error) return console.error(error);
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "work_choice"
        });
    }, messageID);
};

module.exports.handleReply = async function({ api, event, Currencies, handleReply }) {
    const { threadID, messageID, senderID, body } = event;

    if (senderID !== handleReply.author) return;
    
    api.unsendMessage(handleReply.messageID).catch(e => console.log(e));

    const choice = parseInt(body);
    if (isNaN(choice) || choice < 1 || choice > works.length) {
        return sendAndUnsend.call(this, api, event, "❌ Lựa chọn không hợp lệ.");
    }

    let userData = (await Currencies.getData(senderID)) || {};
    let workData = userData.work || {};
    const lastWorkTime = workData.lastTime || 0;
    const currentTime = Date.now();

    if (currentTime - lastWorkTime < WORK_COOLDOWN) {
         return sendAndUnsend.call(this, api, event, `🥵 Bạn đã làm việc ở nơi khác rồi, hãy quay lại sau nhé.`);
    }

    const selectedWork = works[choice - 1];
    let message = "";
    let earnings = 0;

    const isLucky = Math.random() < 0.05;
    const isUnlucky = Math.random() < selectedWork.failChance;

    if (isUnlucky) {
        const failMsg = selectedWork.failMessages[Math.floor(Math.random() * selectedWork.failMessages.length)];
        earnings = Math.floor(Math.random() * (selectedWork.minRate / 2));
        message = `🤕 Thật không may! Bạn đã ${failMsg} Chỉ nhận được ${earnings.toLocaleString()} coins tiền an ủi.`;
    } else {
        const jobMsg = selectedWork.jobs[Math.floor(Math.random() * selectedWork.jobs.length)];
        earnings = Math.floor(Math.random() * (selectedWork.maxRate - selectedWork.minRate + 1)) + selectedWork.minRate;

        if (isLucky) {
            const bonusMultiplier = Math.floor(Math.random() * 2) + 2;
            earnings *= bonusMultiplier;
            message = `🎉 JACKPOT! 🎉\nNhờ sự may mắn trời ban, khi ${jobMsg}, bạn đã trúng quả lớn và nhận được gấp ${bonusMultiplier} lần tiền thưởng!\nTổng cộng bạn nhận được ${earnings.toLocaleString()} coins.`;
        } else {
            message = `✅ Bạn đã ${jobMsg} và nhận được số tiền là ${earnings.toLocaleString()} coins.`;
        }
    }

    await Currencies.increaseMoney(senderID, earnings);
    
    if (!userData.work) userData.work = {};
    userData.work.lastTime = currentTime;
    await Currencies.setData(senderID, userData);

    // Sử dụng hàm mới để gửi và tự thu hồi
    return sendAndUnsend.call(this, api, event, message);
};