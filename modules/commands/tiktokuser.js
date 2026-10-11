const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports.config = {
    name: "tiktokuser",
    version: "5.1.1",
    hasPermssion: 0,
    credits: "Pcoder (fix by ChatGPT)",
    description: "Tải toàn bộ video TikTok của người dùng và lưu link Catbox.",
    commandCategory: "Tiện ích",
    usages: "[@username]",
    cooldowns: 300
};

module.exports.run = async function ({ api, event, args }) {
    if (!args[0]) return api.sendMessage("❌ Vui lòng nhập ID người dùng TikTok (ví dụ: @username)", event.threadID, event.messageID);

    const userID = args[0].startsWith('@') ? args[0].slice(1) : args[0];
    const outputPath = path.join(__dirname, '../../pdata/tiktok.json');
    let progressMessage = null;

    try {
        console.log(`[TIKTOK] 🔍 Bắt đầu tải video của user: ${userID}`);
        progressMessage = await api.sendMessage(`⏳ Đang quét video của @${userID}...`, event.threadID, event.messageID);

        // === GIAI ĐOẠN 1: QUÉT VIDEO ===
        let allVideos = [];
        let cursor = null;
        let hasMore = true;
        let pageCount = 0;

        while (hasMore) {
            pageCount++;
            const apiUrl = `https://www.tikwm.com/api/user/posts?unique_id=${userID}` + (cursor ? `&cursor=${cursor}` : '');
            console.log(`[REQUEST] Trang ${pageCount}: ${apiUrl}`);

            let res;
            try {
                res = await axios.get(apiUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 10000
                });
            } catch (err) {
                console.error(`[ERROR] Lỗi kết nối TikWM (trang ${pageCount}): ${err.message}`);
                break;
            }

            if (!res.data || typeof res.data !== 'object') {
                console.warn(`[WARNING] Phản hồi không hợp lệ từ API.`);
                break;
            }

            const { code, data, msg } = res.data;

            if (code !== 0 || !data?.videos?.length) {
                console.warn(`[END] Kết thúc tại trang ${pageCount}: ${msg || 'Không có video'}`);
                break;
            }

            allVideos.push(...data.videos);
            console.log(`[SUCCESS] Trang ${pageCount}: +${data.videos.length} video (Tổng: ${allVideos.length})`);
            hasMore = data.hasMore;
            cursor = data.cursor;

            await wait(500);
        }

        if (allVideos.length === 0) {
            return api.editMessage(`❌ Không tìm thấy video nào của @${userID}.`, progressMessage.messageID);
        }

        await api.editMessage(`✅ Tìm thấy ${allVideos.length} video. Đang upload lên Catbox...`, progressMessage.messageID);

        // === GIAI ĐOẠN 2: UPLOAD CATBOX ===
        const catboxLinks = [];

        for (let i = 0; i < allVideos.length; i++) {
            const video = allVideos[i];
            const link = video.play;

            console.log(`[UPLOAD] Đang upload video ${i + 1}/${allVideos.length}: ${link}`);

            try {
                const res = await axios.get(`https://catbox-mnib.onrender.com/upload?url=${encodeURIComponent(link)}`, {
                    timeout: 60000
                });

                if (res.data?.url) {
                    catboxLinks.push(res.data.url);
                    console.log(`[UPLOAD ✅] ${i + 1}: ${res.data.url}`);
                } else {
                    catboxLinks.push(`ERROR_NO_URL_${video.video_id}`);
                    console.warn(`[UPLOAD ❌] Không có URL trả về.`);
                }

            } catch (err) {
                console.error(`[UPLOAD ERROR] Video ${i + 1} lỗi: ${err.message}`);
                catboxLinks.push(`ERROR_UPLOAD_${video.video_id}`);
            }

            if ((i + 1) % 5 === 0 || i + 1 === allVideos.length) {
                await api.editMessage(`⏳ Đã upload ${i + 1}/${allVideos.length} video...`, progressMessage.messageID);
            }

            await wait(1000); // tránh spam server
        }

        // === GIAI ĐOẠN 3: GHI FILE JSON ===
        fs.ensureFileSync(outputPath);
        let jsonData = {};

        try {
            jsonData = fs.readJsonSync(outputPath, { throws: false }) || {};
        } catch (err) {
            console.error(`[FILE ERROR] Không đọc được JSON cũ: ${err.message}`);
        }

        jsonData[userID] = catboxLinks;

        try {
            fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 4));
            console.log(`[SAVE ✅] Dữ liệu lưu tại: ${outputPath}`);
        } catch (err) {
            console.error(`[SAVE ❌] Ghi file lỗi: ${err.message}`);
        }

        const successCount = catboxLinks.filter(url => !url.startsWith("ERROR")).length;
        await api.editMessage(`✅ Hoàn tất! Đã xử lý ${successCount}/${allVideos.length} video.\n📁 Lưu tại: /pdata/tiktok.json`, progressMessage.messageID);

    } catch (err) {
        console.error(`[FATAL ❌] Lỗi toàn cục:`, err);
        const errorMsg = `❌ Đã xảy ra lỗi: ${err.message}`;
        if (progressMessage) {
            return api.editMessage(errorMsg, progressMessage.messageID);
        }
        return api.sendMessage(errorMsg, event.threadID, event.messageID);
    }
};
