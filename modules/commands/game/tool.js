const fs = require('fs-extra');
const path = require('path');

// --- CẤU HÌNH VÀ BIẾN TOÀN CỤC ---
const HISTORY_FILE = path.join(__dirname, "cache", "soicau_history.json");
const MAX_HISTORY = 2000;

// Sử dụng một đối tượng để quản lý dữ liệu, tránh biến toàn cục lung tung
const dataStore = {
    history: [],
    stats: { "Tài": 0, "Xỉu": 0 },
    methods: { "smart": [0, 0], "dice": [0, 0], "percent": [0, 0], "ai": [0, 0] },
    isInitialized: false
};

// --- CÁC HÀM LOGIC (CHUYỂN TỪ PYTHON) ---

function isMd5(s) {
    return /^[a-f0-9]{32}$/i.test(s);
}

function md5int(s) {
    // Dùng BigInt để xử lý số lớn từ mã MD5
    return BigInt('0x' + s);
}

function diceResult(md5Hash) {
    const n = md5int(md5Hash);
    const dice = [
        (n >> 0n) % 6n + 1n,
        (n >> 8n) % 6n + 1n,
        (n >> 16n) % 6n + 1n
    ];
    const total = dice.reduce((sum, val) => sum + val, 0n);
    const result = total >= 11n ? "Tài" : "Xỉu";
    return { result, dice: dice.map(d => Number(d)), total: Number(total) };
}

function percentResult(md5Hash) {
    const v = md5int(md5Hash);
    const taiPercent = Number(v % 100n);
    return taiPercent >= 50 ? "Tài" : "Xỉu";
}

function detectCauPattern() {
    if (dataStore.history.length < 4) return null;
    const seq = dataStore.history.slice(-12).map(item => item.realResult);
    const l = seq.length;

    // Cầu bệt (3 tay liên tiếp)
    if (seq.slice(-3).every(val => val === seq[seq.length - 1])) return seq[seq.length - 1];
    // Cầu 1-2-1
    if (l >= 4 && seq.slice(-4).join(',') === ['Tài', 'Xỉu', 'Xỉu', 'Tài'].join(',')) return 'Xỉu';
    if (l >= 4 && seq.slice(-4).join(',') === ['Xỉu', 'Tài', 'Tài', 'Xỉu'].join(',')) return 'Tài';
    // Cầu 1-1
    if (l >= 4 && seq.slice(-4).join(',') === ['Tài', 'Xỉu', 'Tài', 'Xỉu'].join(',')) return 'Tài';
    if (l >= 4 && seq.slice(-4).join(',') === ['Xỉu', 'Tài', 'Xỉu', 'Tài'].join(',')) return 'Xỉu';
    // Cầu 2-2
    if (l >= 4 && seq.slice(-4).join(',') === ['Tài', 'Tài', 'Xỉu', 'Xỉu'].join(',')) return 'Tài';
    if (l >= 4 && seq.slice(-4).join(',') === ['Xỉu', 'Xỉu', 'Tài', 'Tài'].join(',')) return 'Xỉu';
    
    return null;
}

function predictSmart(md5Hash) {
    const { result: resDice, dice, total } = diceResult(md5Hash);
    const resPercent = percentResult(md5Hash);
    const resCau = detectCauPattern();
    let finalPrediction, confidence;

    if (resDice === resPercent) {
        finalPrediction = resDice;
        confidence = "CAO";
    } else if (resCau) {
        finalPrediction = resCau;
        confidence = "THEO CẦU";
    } else {
        finalPrediction = resDice; // Ưu tiên xúc xắc khi không có cầu
        confidence = "TRUNG BÌNH";
    }
    
    let message = `🎲 Xúc xắc : [${dice.join(', ')}] = ${total} -> ${resDice}\n`;
    message += `📊 Phần trăm: ${resPercent}\n`;
    if (resCau) message += `📈 Cầu      : ${resCau}\n`;
    message += `---------------------------------\n`;
    message += `🔮 Dự đoán  : ${finalPrediction} (Độ tin cậy: ${confidence})`;
    
    return { prediction: finalPrediction, message };
}

function predictAI(md5Hash) {
    const bitCount = md5int(md5Hash).toString(2).split('1').length - 1;
    const prefer = bitCount % 2 === 0 ? "Tài" : "Xỉu";

    const recentResults = dataStore.history.slice(-10).map(item => item.realResult);
    const trend = recentResults.length ?
        Object.entries(recentResults.reduce((acc, val) => (acc[val] = (acc[val] || 0) + 1, acc), {}))
            .sort((a, b) => b[1] - a[1])[0][0]
        : "Tài";

    const cau = detectCauPattern();
    const score = { "Tài": 0, "Xỉu": 0 };
    score[prefer] += 1.0;
    score[trend] += 1.5;
    if (cau) score[cau] += 2.0;
    
    const prediction = score["Tài"] >= score["Xỉu"] ? "Tài" : "Xỉu";
    const message = `🤖 AI dự đoán: ${prediction}\n(Bit: ${prefer}, Xu hướng: ${trend}, Cầu: ${cau || 'Không'})`;
    
    return { prediction, message };
}


// --- QUẢN LÝ DỮ LIỆU ---

function loadData() {
    if (dataStore.isInitialized) return;
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const rawData = fs.readJsonSync(HISTORY_FILE);
            if (Array.isArray(rawData)) {
                dataStore.history = rawData.slice(-MAX_HISTORY);
                // Tính lại thống kê từ lịch sử đã tải
                dataStore.history.forEach(item => {
                    if (item.prediction === item.realResult) {
                        dataStore.stats[item.realResult]++;
                    }
                    if (dataStore.methods[item.method]) {
                        if (item.prediction === item.realResult) {
                            dataStore.methods[item.method][0]++;
                        }
                        dataStore.methods[item.method][1]++;
                    }
                });
            }
        }
        dataStore.isInitialized = true;
    } catch (e) {
        console.error("Lỗi khi tải dữ liệu soi cầu:", e);
    }
}

function saveData() {
    try {
        fs.writeJsonSync(HISTORY_FILE, dataStore.history, { spaces: 2 });
    } catch (e) {
        console.error("Lỗi khi lưu dữ liệu soi cầu:", e);
    }
}

function updateStats(md5Hash, prediction, realResult, method) {
    dataStore.history.push({ md5Hash, prediction, realResult, method });
    if (dataStore.history.length > MAX_HISTORY) {
        dataStore.history.shift();
    }
    
    // Cập nhật stats
    if (prediction === realResult) {
        dataStore.stats[prediction]++;
        dataStore.methods[method][0]++;
    }
    dataStore.methods[method][1]++;

    saveData();
    return `-> Kết quả: ${prediction} vs ${realResult} ${prediction === realResult ? '✔️' : '❌'}`;
}

// --- CẤU HÌNH LỆNH ---

module.exports.config = {
    name: "soicau",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Công cụ soi cầu Tài Xỉu đa phương pháp.",
    commandCategory: "game",
    usages: "[phương pháp] [md5] [kết quả thật] | list | stats | history",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    loadData();
    const { threadID, messageID } = event;
    const [command, md5, realResultInput] = args;

    if (!command || command === "list") {
        const list = "📢 Các phương pháp có thể dùng:\n👉 smart : Dự đoán tổng hợp thông minh\n👉 dice  : Dự đoán theo 3 xúc xắc\n👉 percent: Dự đoán theo phần trăm MD5\n👉 ai    : Dự đoán AI theo xu hướng";
        return api.sendMessage(list, threadID, messageID);
    }

    if (command === "stats") {
        let statsMsg = "📊 **THỐNG KÊ ĐỘ CHÍNH XÁC** 📊\n---------------------------------\n";
        statsMsg += `📈 **ĐỘ CHÍNH XÁC THEO PHƯƠNG PHÁP**\n`;
        for (const [method, [correct, total]] of Object.entries(dataStore.methods)) {
            const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : "N/A";
            statsMsg += `🔹 ${method.toUpperCase()}: ${correct}/${total} (${accuracy}%)\n`;
        }
        return api.sendMessage(statsMsg, threadID, messageID);
    }

    if (command === "history") {
        const limit = 15;
        let historyMsg = `📜 **LỊCH SỬ ${limit} PHIÊN GẦN NHẤT** 📜\n---------------------------------\n`;
        const recentHistory = dataStore.history.slice(-limit);
        recentHistory.forEach((item, index) => {
            historyMsg += `${index + 1}. ${item.md5Hash.substring(0, 10)}... -> ${item.realResult}\n`;
        });
        return api.sendMessage(historyMsg || "Chưa có lịch sử.", threadID, messageID);
    }

    if (!isMd5(md5)) {
        return api.sendMessage("⚠️ Lỗi: Chuỗi MD5 không hợp lệ.", threadID, messageID);
    }

    let prediction, responseMsg;

    switch (command.toLowerCase()) {
        case "smart": {
            const { prediction: p, message: m } = predictSmart(md5);
            prediction = p;
            responseMsg = m;
            break;
        }
        case "ai": {
            const { prediction: p, message: m } = predictAI(md5);
            prediction = p;
            responseMsg = m;
            break;
        }
        case "dice": {
            const { result } = diceResult(md5);
            prediction = result;
            responseMsg = `🎲 Dự đoán theo xúc xắc: ${prediction}`;
            break;
        }
        case "percent": {
            prediction = percentResult(md5);
            responseMsg = `📊 Dự đoán theo phần trăm: ${prediction}`;
            break;
        }
        default:
            return api.sendMessage("❌ Phương pháp không hợp lệ. Dùng 'soicau list' để xem các lựa chọn.", threadID, messageID);
    }

    await api.sendMessage(responseMsg, threadID, messageID);

    if (realResultInput && ["tài", "xỉu"].includes(realResultInput.toLowerCase())) {
        const realResult = realResultInput.charAt(0).toUpperCase() + realResultInput.slice(1).toLowerCase();
        const updateMsg = updateStats(md5, prediction, realResult, command.toLowerCase());
        // Gửi tin nhắn cập nhật sau một khoảng trễ nhỏ
        setTimeout(() => api.sendMessage(updateMsg, threadID, messageID), 1000);
    }
};