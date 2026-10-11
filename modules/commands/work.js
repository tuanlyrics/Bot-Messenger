module.exports.config = {
    name: "work",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Hung & Gemini (Refactor)",
    description: "Làm việc tại các khu vực khác nhau để kiếm tiền, có thời gian chờ.",
    commandCategory: "Kinh tế",
    cooldowns: 620 // Giảm cooldown của lệnh gốc, vì ta sẽ tự quản lý thời gian chờ
};

// Cấu hình các khu vực làm việc
const works = [
    {
        name: "Bắn Free Fire ⚔️",
        jobs: [
            "đạt top 1 với 0 kill", "gánh team với 20 kill", "headshot kẻ địch bằng AWM",
            "cứu sống đồng đội trong gang tấc", "ném một quả lựu đạn hoàn hảo", "chạy bo thần tốc"
        ],
        minRate: 150, // Tiền tối thiểu
        maxRate: 750, // Tiền tối đa
        failChance: 0.1, // 10% cơ hội thất bại
        failMessages: [
            "nhảy dù xuống khu đông người và bị bắn hạ đầu tiên.",
            "bị camper nấp lùm bắn lén.",
            "mải loot đồ và chết vì vòng bo."
        ]
    },
    {
        name: "Làm Thuê 🏢",
        jobs: [
            "lau dọn văn phòng cho sếp", "sửa chữa module cho khách hàng", "diễn kịch mua vui",
            "phát tờ rơi ngoài đường", "bưng bê ở quán cà phê", "gia sư cho một cậu bé thông minh"
        ],
        minRate: 200,
        maxRate: 1000,
        failChance: 0.05, // 5% cơ hội thất bại
        failMessages: [
            "làm vỡ bình hoa của sếp và phải đền tiền.",
            "bị khách hàng phàn nàn vì thái độ không tốt.",
            "đi phát tờ rơi nhưng gặp trời mưa."
        ]
    },
    {
        name: "Khai Thác Mỏ ⛏️",
        jobs: [
            "đào được một viên kim cương lớn", "tìm thấy một mỏ vàng", "khai thác được 50kg quặng sắt hiếm",
            "phát hiện một hang động thạch anh tím", "nhặt được một cây cuốc Netherite bỏ lại",
            "may mắn đào trúng một rương kho báu"
        ],
        minRate: 300,
        maxRate: 1500,
        failChance: 0.15, // 15% cơ hội thất bại
        failMessages: [
            "gặp phải sự cố sập hầm mỏ nhưng may mắn thoát nạn.",
            "bị một con creeper phát nổ ngay bên cạnh.",
            "đào cả ngày nhưng chỉ thấy toàn đá cuội."
        ]
    }
];

// Thời gian chờ giữa các lần làm việc (tính bằng mili giây)
const WORK_COOLDOWN = 15 * 60 * 1000; // 15 phút

module.exports.run = async function({ api, event, Currencies }) {
    const { threadID, messageID, senderID } = event;

    // Lấy dữ liệu của người dùng, nếu chưa có thì tạo mới
    let userData = (await Currencies.getData(senderID)) || {};
    let workData = userData.work || {};

    const lastWorkTime = workData.lastTime || 0;
    const currentTime = Date.now();
    const timeSinceLastWork = currentTime - lastWorkTime;

    // Kiểm tra thời gian chờ
    if (timeSinceLastWork < WORK_COOLDOWN) {
        const remainingTime = WORK_COOLDOWN - timeSinceLastWork;
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = ((remainingTime % 60000) / 1000).toFixed(0);
        return api.sendMessage(`🥵 Bạn vừa mới làm việc xong, hãy nghỉ ngơi chút đi.\n⏱️ Vui lòng quay lại sau ${minutes} phút ${seconds} giây nữa.`, threadID, messageID);
    }

    // Hiển thị menu lựa chọn
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
    
    // Xóa tin nhắn chờ phản hồi
    api.unsendMessage(handleReply.messageID).catch(e => console.log(e));

    const choice = parseInt(body);
    if (isNaN(choice) || choice < 1 || choice > works.length) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ.", threadID, messageID);
    }

    // Lấy lại dữ liệu để chắc chắn
    let userData = (await Currencies.getData(senderID)) || {};
    let workData = userData.work || {};
    const lastWorkTime = workData.lastTime || 0;
    const currentTime = Date.now();

    if (currentTime - lastWorkTime < WORK_COOLDOWN) {
         return api.sendMessage(`🥵 Bạn đã làm việc ở nơi khác rồi, hãy quay lại sau nhé.`, threadID, messageID);
    }

    const selectedWork = works[choice - 1];

    // Xử lý kết quả làm việc
    let message = "";
    let earnings = 0;

    // Tỉ lệ may mắn trúng quả (5%)
    const isLucky = Math.random() < 0.05;
    // Tỉ lệ gặp xui (theo cấu hình)
    const isUnlucky = Math.random() < selectedWork.failChance;

    if (isUnlucky) {
        const failMsg = selectedWork.failMessages[Math.floor(Math.random() * selectedWork.failMessages.length)];
        earnings = Math.floor(Math.random() * (selectedWork.minRate / 2)); // Thất bại nhưng vẫn có chút tiền an ủi
        message = `🤕 Thật không may! Bạn đã ${failMsg} Chỉ nhận được ${earnings.toLocaleString()} coins tiền an ủi.`;
    } else {
        const jobMsg = selectedWork.jobs[Math.floor(Math.random() * selectedWork.jobs.length)];
        earnings = Math.floor(Math.random() * (selectedWork.maxRate - selectedWork.minRate + 1)) + selectedWork.minRate;

        if (isLucky) {
            const bonusMultiplier = Math.floor(Math.random() * 2) + 2; // Gấp 2 hoặc 3 lần
            earnings *= bonusMultiplier;
            message = `🎉 JACKPOT! 🎉\nNhờ sự may mắn trời ban, khi ${jobMsg}, bạn đã trúng quả lớn và nhận được gấp ${bonusMultiplier} lần tiền thưởng!\nTổng cộng bạn nhận được ${earnings.toLocaleString()} coins.`;
        } else {
            message = `✅ Bạn đã ${jobMsg} và nhận được số tiền là ${earnings.toLocaleString()} coins.`;
        }
    }

    // Cập nhật tiền và thời gian
    await Currencies.increaseMoney(senderID, earnings);
    
    // Đảm bảo cấu trúc data đúng
    if (!userData.work) userData.work = {};
    userData.work.lastTime = currentTime;
    await Currencies.setData(senderID, userData);

    return api.sendMessage(message, threadID, messageID);
};