const axios = require('axios');

module.exports.config = {
    name: "dich",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Dịch văn bản, hỗ trợ reply để dịch nhanh sang Tiếng Việt.",
    commandCategory: "Tiện ích",
    usages: "dich [văn bản] | dich <lang_code> [văn bản] | reply tin nhắn",
    cooldowns: 5,
    dependencies: {
        "axios": ""
    }
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, type, messageReply } = event;

    let textToTranslate;
    let targetLang = 'vi'; // Mặc định dịch sang Tiếng Việt

    // Trường hợp 1: Reply một tin nhắn
    if (type === "message_reply") {
        textToTranslate = messageReply.body;
        // Cho phép ghi đè ngôn ngữ nếu người dùng reply kèm mã, ví dụ: .dich en
        if (args[0] && /^[a-z]{2,3}$/.test(args[0].toLowerCase())) {
            targetLang = args[0].toLowerCase();
        }
    }
    // Trường hợp 2: Dùng lệnh bình thường
    else {
        if (args.length === 0) {
            return api.sendMessage("Vui lòng nhập văn bản cần dịch hoặc reply một tin nhắn.", threadID, messageID);
        }

        // Kiểm tra xem argument đầu tiên có phải là mã ngôn ngữ không
        if (/^[a-z]{2,3}$/.test(args[0].toLowerCase()) && args.length > 1) {
            targetLang = args[0].toLowerCase();
            textToTranslate = args.slice(1).join(" ");
        } else {
            // Nếu không, toàn bộ input là văn bản cần dịch sang Tiếng Việt
            textToTranslate = args.join(" ");
        }
    }

    if (!textToTranslate) {
        return api.sendMessage("Không tìm thấy văn bản để dịch.", threadID, messageID);
    }

    // Gọi API
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
        const response = await axios.get(url);
        const data = response.data;

        let translatedText = '';
        data[0].forEach(item => {
            if (item[0]) translatedText += item[0];
        });

        const detectedLang = data[2]; // Ngôn ngữ được phát hiện

        api.sendMessage(`[ BẢN DỊCH ]\n- Từ: ${detectedLang}\n- Sang: ${targetLang}\n──────────────────\n${translatedText}`, threadID, messageID);

    } catch (err) {
        console.error(err);
        api.sendMessage("Đã có lỗi xảy ra, không thể hoàn tất bản dịch.", threadID, messageID);
    }
};