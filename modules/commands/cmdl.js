const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "reload",
    version: "1.1.0",
    hasPermssion: 2,
    credits: "Kenne400k, NTKhang",
    description: "Reload các thành phần hệ thống: event, config, command, appstate, cookie, data,... bằng menu chọn.",
    commandCategory: "Hệ thống",
    usages: "",
    cooldowns: 3
};

const menuText = `[ 𝗥𝗘𝗟𝗢𝗔𝗗 𝗠𝗘𝗡𝗨 ]
Reply (phản hồi số) để chọn loại muốn reload:
1. Reload toàn bộ (all)
2. Reload events
3. Reload config
4. Reload commands
5. Reload appstate
6. Reload cookie
7. Reload data_dongdev/

Bạn chỉ cần reply số thứ tự (vd: 3) để thực hiện reload loại tương ứng.
`;

module.exports.run = async function({ api, event, args }) {
    const permission = ["100047128875560", "100000895922054"];
    if (!permission.includes(event.senderID))
        return api.sendMessage("[DEV MODE] Lệnh này chỉ dành cho Nhà Phát Triển 💻", event.threadID, event.messageID);

    if (!args[0]) {
        return api.sendMessage(menuText, event.threadID, (err, info) => {
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: event.senderID
            });
        });
    } else {
        // Cho phép dùng reload [loại] nhanh
        return handleReload(args[0], { api, event });
    }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;
    const stt = event.body.trim();
    const typeArr = ["all", "events", "config", "commands", "appstate", "cookie", "data"];
    let type = typeArr[parseInt(stt) - 1];
    if (!type) return api.sendMessage("Số không hợp lệ!", event.threadID, event.messageID);
    await handleReload(type, { api, event });
};

async function handleReload(type, { api, event }) {
    let msg = "";
    const rootPath = path.join(__dirname, "..", "..");
    try {
        switch (type) {
            case "all":
                msg += await reloadEvents();
                msg += await reloadConfig();
                msg += await reloadCommands();
                msg += await reloadAppState();
                msg += await reloadCookie();
                msg += await reloadDataDongDev();
                break;
            case "events":
                msg += await reloadEvents();
                break;
            case "config":
                msg += await reloadConfig();
                break;
            case "commands":
                msg += await reloadCommands();
                break;
            case "appstate":
                msg += await reloadAppState();
                break;
            case "cookie":
                msg += await reloadCookie();
                break;
            case "data":
                msg += await reloadDataDongDev();
                break;
            default:
                msg = "Loại reload không hợp lệ!";
                break;
        }
    } catch (e) {
        msg += `\nĐã xảy ra lỗi: ${e.message}`;
    }
    return api.sendMessage(msg.trim() || "Hoàn tất!", event.threadID, event.messageID);
}

// Các hàm reload cụ thể
async function reloadEvents() {
    try {
        const eventsPath = path.join(__dirname, "..", "events");
        const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
        for (const file of files) {
            delete require.cache[require.resolve(path.join(eventsPath, file))];
            require(path.join(eventsPath, file));
        }
        return `\n[Event] Đã reload ${files.length} event.`;
    } catch (e) {
        return `\n[Event] Lỗi khi reload: ${e.message}`;
    }
}

async function reloadConfig() {
    try {
        const configPath = path.join(__dirname, "..", "..", "config.json");
        delete require.cache[require.resolve(configPath)];
        global.config = require(configPath);
        return `\n[Config] Đã reload config.json.`;
    } catch (e) {
        return `\n[Config] Lỗi: ${e.message}`;
    }
}

async function reloadCommands() {
    try {
        const cmdPath = __dirname;
        const files = fs.readdirSync(cmdPath).filter(f => f.endsWith(".js") && f !== "reload.js");
        for (const file of files) {
            delete require.cache[require.resolve(path.join(cmdPath, file))];
            require(path.join(cmdPath, file));
        }
        return `\n[Command] Đã reload ${files.length} lệnh.`;
    } catch (e) {
        return `\n[Command] Lỗi: ${e.message}`;
    }
}

async function reloadAppState() {
    try {
        const appState = global.api.getAppState ? global.api.getAppState() : (global.client?.api?.getAppState?.() || []);
        const appStatePath = path.join(__dirname, "..", "..", "appstate.json");
        fs.writeFileSync(appStatePath, JSON.stringify(appState, null, 2));
        return `\n[AppState] Đã làm mới appstate.json.`;
    } catch (e) {
        return `\n[AppState] Lỗi: ${e.message}`;
    }
}

async function reloadCookie() {
    try {
        const appState = global.api.getAppState ? global.api.getAppState() : (global.client?.api?.getAppState?.() || []);
        const cookie = appState.reduce((cur, item) => cur + `${item.key}=${item.value}; `, "");
        const cookiePath = path.join(__dirname, "..", "cache", "cookie.txt");
        fs.writeFileSync(cookiePath, cookie);
        return `\n[Cookie] Đã làm mới cookie.txt.`;
    } catch (e) {
        return `\n[Cookie] Lỗi: ${e.message}`;
    }
}

async function reloadDataDongDev() {
    const dataDir = path.join(__dirname, "..", "..", "pdata", "data_dongdev");
    if (!fs.existsSync(dataDir)) return "\n[Data] Không tìm thấy thư mục data_dongdev!";
    global.dataDongDev = {};
    const errorFiles = [];

    // Đọc đệ quy
    function walk(dir, prefix = "") {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            const keyBase = prefix ? `${prefix}_${file}` : file;
            if (stat.isDirectory()) {
                walk(filePath, keyBase.replace(/\./g, "_"));
            } else {
                const ext = path.extname(file).toLowerCase();
                let key = keyBase.replace(/\.(json|js|txt|log|sqlite|db)$/i, "");
                try {
                    if (ext === ".json") {
                        const raw = fs.readFileSync(filePath, "utf8");
                        global.dataDongDev[key] = JSON.parse(raw);
                    } else if (ext === ".js") {
                        delete require.cache[require.resolve(filePath)];
                        global.dataDongDev[key] = require(filePath);
                    } else if (ext === ".txt" || ext === ".log") {
                        global.dataDongDev[key] = fs.readFileSync(filePath, "utf8");
                    } else if (ext === ".sqlite" || ext === ".db") {
                        // Nếu muốn nạp Buffer
                        global.dataDongDev[key] = fs.readFileSync(filePath);
                        // Hoặc bỏ qua: chỉ cần comment dòng trên
                    } else {
                        // Các loại file khác: nạp buffer
                        global.dataDongDev[key] = fs.readFileSync(filePath);
                    }
                } catch (e) {
                    errorFiles.push(`${filePath}: ${e.message}`);
                    global.dataDongDev[key] = {};
                }
            }
        }
    }

    try {
        walk(dataDir);
        let msg = `\n[Data] Đã reload ${Object.keys(global.dataDongDev).length} file (mọi loại) trong data_dongdev/.`;
        if (errorFiles.length)
            msg += `\n[Data] Một số file lỗi (bỏ qua):\n${errorFiles.join("\n")}`;
        return msg;
    } catch (e) {
        return `\n[Data] Lỗi: ${e.message}`;
    }
}

