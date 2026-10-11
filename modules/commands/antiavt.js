const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// --- Thư mục & file ---
const cacheDir = path.join(__dirname, "cache");
fs.ensureDirSync(cacheDir);

const avatarDir = path.join(cacheDir, "groupAvatars");
fs.ensureDirSync(avatarDir);

const statusPath = path.join(cacheDir, "antiavt_status.json");
if (!fs.existsSync(statusPath)) fs.writeFileSync(statusPath, "{}", "utf8");

const logFile = path.join(cacheDir, "antiavt_log.txt");

// --- Ghi log ---
function writeLog(obj) {
    try {
        const time = new Date().toLocaleString();
        const text = `[${time}] ${JSON.stringify(obj, null, 2)}\n\n`;
        fs.appendFileSync(logFile, text, "utf8");
    } catch (e) {
        console.error("AntiAvt writeLog error:", e);
    }
}

// --- Trạng thái ---
function readStatus() {
    try {
        return JSON.parse(fs.readFileSync(statusPath, "utf8") || "{}");
    } catch (e) {
        return {};
    }
}
function writeStatus(s) {
    fs.writeFileSync(statusPath, JSON.stringify(s, null, 2), "utf8");
}
function getThreadStatus(threadID) {
    const s = readStatus();
    return s[threadID] || { on: false };
}
function setThreadStatus(threadID, obj) {
    const s = readStatus();
    s[threadID] = Object.assign({}, s[threadID] || {}, obj);
    writeStatus(s);
}

// --- Lưu ảnh từ url về file ---
async function saveImageFromUrl(url, threadID) {
    if (!url) throw new Error("No image url");
    const avatarPath = path.join(avatarDir, `${threadID}.jpg`);
    const res = await axios.get(url, { responseType: "stream", timeout: 15000 });
    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(avatarPath);
        res.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
    return avatarPath;
}

// --- Timers global để tránh setInterval trùng ---
global.__antiavt_timers = global.__antiavt_timers || {};

// --- Start watcher polling cho 1 thread ---
function startWatcher(threadID, api) {
    // Nếu đã có timer thì không tạo nữa
    if (global.__antiavt_timers[threadID]) return;
    writeLog({ action: "startWatcher", threadID });

    const tick = async () => {
        try {
            const status = getThreadStatus(threadID);
            if (!status.on) {
                // auto clear nếu bị tắt
                if (global.__antiavt_timers[threadID]) {
                    clearInterval(global.__antiavt_timers[threadID]);
                    delete global.__antiavt_timers[threadID];
                    writeLog({ action: "stopWatcher(auto)", threadID });
                }
                return;
            }

            // Lấy info hiện tại
            const threadInfo = await api.getThreadInfo(threadID);
            const currentImage = threadInfo?.imageSrc || threadInfo?.image || null;
            const savedImageSrc = status.savedImageSrc || null;
            const avatarPath = path.join(avatarDir, `${threadID}.jpg`);

            // Nếu không có ảnh đã lưu, cố gắng lưu lại hiện tại
            if (!savedImageSrc && currentImage) {
                setThreadStatus(threadID, { savedImageSrc: currentImage });
                writeLog({ action: "savedImageSrcMissing - save current", threadID, currentImage });
            }

            // Nếu phát hiện thay đổi (current khác saved)
            if (savedImageSrc && currentImage && currentImage !== savedImageSrc) {
                // ngăn spam restore liên tục: dùng lastRestore (30s)
                const now = Date.now();
                const lastRestore = status.lastRestoreAt || 0;
                if (now - lastRestore < 30 * 1000) {
                    writeLog({ action: "skipRestoreCooldown", threadID, diff: { savedImageSrc, currentImage } });
                    return;
                }

                writeLog({
                    action: "detectChangeByPoll",
                    threadID,
                    savedImageSrc,
                    currentImage
                });

                // Thử restore từ file (nếu có)
                if (fs.existsSync(avatarPath)) {
                    try {
                        await api.changeGroupImage(fs.createReadStream(avatarPath), threadID);
                        api.sendMessage(`⚠️ Phát hiện thay avatar — Bot đã khôi phục ảnh cũ.`, threadID);
                        setThreadStatus(threadID, { lastRestoreAt: Date.now() });
                        writeLog({ action: "restore_success_from_file", threadID });
                    } catch (err) {
                        writeLog({ action: "restore_error_from_file", threadID, error: err.message });
                    }
                } else {
                    // Nếu không có file, cố gắng tải lại savedImageSrc (url) rồi restore
                    try {
                        const newPath = await saveImageFromUrl(savedImageSrc, threadID);
                        await api.changeGroupImage(fs.createReadStream(newPath), threadID);
                        api.sendMessage(`⚠️ Phát hiện thay avatar — Bot đã khôi phục ảnh cũ.`, threadID);
                        setThreadStatus(threadID, { lastRestoreAt: Date.now() });
                        writeLog({ action: "restore_success_download_then_upload", threadID });
                    } catch (err) {
                        writeLog({ action: "restore_error_download_then_upload", threadID, error: err.message });
                    }
                }
            }
        } catch (err) {
            writeLog({ action: "watcher_tick_error", threadID, error: err.message });
        }
    };

    // Poll mỗi 5s (bạn có thể tăng lên 10s để nhẹ)
    const interval = setInterval(tick, 5000);
    // Lưu timer
    global.__antiavt_timers[threadID] = interval;
    // gọi tick ngay 1 lần để kiểm tra sớm
    tick();
}

// --- Stop watcher ---
function stopWatcher(threadID) {
    if (global.__antiavt_timers[threadID]) {
        clearInterval(global.__antiavt_timers[threadID]);
        delete global.__antiavt_timers[threadID];
        writeLog({ action: "stopWatcher_manual", threadID });
    }
}

module.exports.config = {
    name: "antiavt",
    version: "5.0.0",
    hasPermssion: 1,
    credits: "Nghia",
    description: "Chống đổi avatar nhóm — fallback polling + event",
    commandCategory: "Quản Trị Viên",
    usages: "on | off | log",
    cooldowns: 5
};

// --- LỆNH on/off/log ---
module.exports.run = async function({ api, event, args }) {
    const { threadID } = event;
    const cmd = args[0];

    if (cmd === "on") {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const imageUrl = threadInfo?.imageSrc || threadInfo?.image || null;
            if (!imageUrl) {
                api.sendMessage("❌ Nhóm chưa có avatar để lưu.", threadID);
                return;
            }

            // Lưu file ảnh và savedImageSrc
            try {
                const avatarPath = await saveImageFromUrl(imageUrl, threadID);
                setThreadStatus(threadID, { on: true, savedImageSrc: imageUrl, lastRestoreAt: 0 });
                startWatcher(threadID, api);
                api.sendMessage("✅ Đã bật chống đổi avatar. Ảnh hiện tại đã lưu và watcher đang chạy.", threadID);
                writeLog({ action: "cmd_on", threadID, imageUrl, avatarPath });
            } catch (e) {
                writeLog({ action: "cmd_on_save_error", threadID, error: e.message });
                api.sendMessage("❌ Lỗi khi lưu ảnh khởi tạo. Kiểm tra log.", threadID);
            }
        } catch (err) {
            writeLog({ action: "cmd_on_error", threadID, error: err.message });
            api.sendMessage("❌ Lỗi khi bật chế độ. Kiểm tra log.", threadID);
        }
    } else if (cmd === "off") {
        setThreadStatus(threadID, { on: false });
        stopWatcher(threadID);
        api.sendMessage("❎ Đã tắt chống đổi avatar cho nhóm này.", threadID);
        writeLog({ action: "cmd_off", threadID });
    } else if (cmd === "log") {
        // Gửi file log lên nhóm (nếu tồn tại)
        if (!fs.existsSync(logFile)) return api.sendMessage("📂 Chưa có log.", threadID);
        try {
            api.sendMessage({ body: "📂 File antiavt_log:", attachment: fs.createReadStream(logFile) }, threadID);
            writeLog({ action: "cmd_log_sent", threadID });
        } catch (e) {
            writeLog({ action: "cmd_log_error", threadID, error: e.message });
            api.sendMessage("❌ Không thể gửi file log.", threadID);
        }
    } else {
        api.sendMessage("👉 Dùng: antiavt on | off | log", threadID);
    }
};

// --- Bắt event (nếu framework gửi) ---
module.exports.handleEvent = async function({ api, event }) {
    try {
        writeLog({ action: "event_received", event });

        // Nhiều framework dùng field logMessageType; một số khác có "type" = "log:..."
        const logTypes = [
            event.logMessageType,
            event.type,
            (event.logMessageData && event.logMessageData.type) ? event.logMessageData.type : null
        ].filter(Boolean);

        // Nếu event có dạng liên quan avatar (phòng trường hợp framework dùng tên khác)
        const possibleAvatarKeywords = ["thread-image", "thread-icon", "thread-image-update", "image_update", "thread_photo"];
        const isAvatarEvent = logTypes.some(t => possibleAvatarKeywords.some(k => String(t).includes(k)));

        if (isAvatarEvent) {
            const threadID = event.threadID || event.to || (event.logMessageData && event.logMessageData.threadID);
            if (!threadID) {
                writeLog({ action: "avatarEvent_no_threadID", event });
                return;
            }

            const status = getThreadStatus(threadID);
            if (!status.on) {
                writeLog({ action: "avatarEvent_ignored_not_on", threadID });
                return;
            }

            // Nếu event bắt được tác giả thay đổi
            const author = event.author || event.senderID || (event.logMessageData && event.logMessageData.author);
            if (author && author === api.getCurrentUserID()) {
                writeLog({ action: "avatarEvent_ignored_by_bot", threadID });
                return;
            }

            writeLog({ action: "avatarEvent_detected", threadID, author });

            // Thử restore ngay (tương tự watcher)
            const avatarPath = path.join(avatarDir, `${threadID}.jpg`);
            if (fs.existsSync(avatarPath)) {
                try {
                    await api.changeGroupImage(fs.createReadStream(avatarPath), threadID);
                    api.sendMessage(`⚠️ Phát hiện thay avatar — Bot đã khôi phục ảnh cũ.`, threadID);
                    setThreadStatus(threadID, { lastRestoreAt: Date.now() });
                    writeLog({ action: "avatarEvent_restore_success", threadID });
                } catch (err) {
                    writeLog({ action: "avatarEvent_restore_error", threadID, error: err.message });
                }
            } else {
                writeLog({ action: "avatarEvent_no_backupfile", threadID });
            }
        }
    } catch (e) {
        writeLog({ action: "handleEvent_error", error: e.message });
    }
};

// --- Khi module nạp, khởi watcher cho những thread đã bật trước đó ---
(function initExistingWatchers() {
    try {
        const s = readStatus();
        Object.keys(s).forEach(threadID => {
            if (s[threadID] && s[threadID].on) {
                // note: api không có ở đây, watcher sẽ kích hoạt khi user bật lại bằng lệnh (startWatcher needs api)
                // nhưng để tiện, ta lưu rằng watcher nên được start khi người dùng bật lần tiếp theo
                writeLog({ action: "init_existing_on", threadID, info: s[threadID] });
            }
        });
    } catch (e) {
        writeLog({ action: "init_error", error: e.message });
    }
})();