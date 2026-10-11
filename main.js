const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const gradient = require("gradient-string");
const readlineSync = require("readline-sync");
const moment = require("moment-timezone");
const os = require("os");
const axios = require("axios");
const logger = require("./pdata/utils/log.js");

// ========== KEEP-ALIVE SERVER FOR RENDER 24/7 ==========
const express = require('express');
const keepAliveApp = express();
const PORT = process.env.PORT || 10000;

keepAliveApp.get('/', (req, res) => {
  res.status(200).send('Bot is alive and running 24/7 on Render');
});

keepAliveApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

keepAliveApp.listen(PORT, () => {
  console.log(`[KEEP-ALIVE] Server running on port ${PORT}`);
});

// Self-ping every 10 minutes to prevent sleep
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || `http://localhost:${PORT}`;
setInterval(async () => {
  try {
    await axios.get(SELF_URL, { timeout: 15000 });
    await axios.get(`${SELF_URL}/health`, { timeout: 15000 });
    console.log('[KEEP-ALIVE] Self-ping successful at', new Date().toISOString());
  } catch (err) {
    console.log('[KEEP-ALIVE] Self-ping failed, will retry...', err.message);
  }
}, 10 * 60 * 1000);
// ======================================================

// --- [FIX] THÊM ĐOẠN NÀY ĐỂ FIX LỖI KẾT NỐI IPv6 ---
const dns = require('dns');
try {
    // Ép buộc Node.js dùng IPv4 trước, tránh lỗi ENETUNREACH
    dns.setDefaultResultOrder('ipv4first'); 
} catch (error) {
    console.log("NodeJS phiên bản cũ, không hỗ trợ dns.setDefaultResultOrder (có thể bỏ qua).");
}
// --------------------------------------------------

const configFile = process.argv[2] || "config.json"; // Lấy tên file config từ tham số dòng lệnh
const con = JSON.parse(fs.readFileSync(path.resolve(__dirname, configFile), 'utf8'));


let agent;

// Proxy config
(function setupProxy() {
  let shouldSaveProxy = false;
  if (typeof con.socks5tl === 'undefined' || typeof con.socks5 === 'undefined') {
    con.socks5tl = readlineSync.question('Bật SOCKS5 proxy? (y/n): ').trim().toLowerCase() === 'y';
    con.socks5 = con.socks5tl ? readlineSync.question('Nhập socks5 proxy: ').trim() : '';
    shouldSaveProxy = true;
  }
  if (shouldSaveProxy) {
    fs.writeFileSync('./config.json', JSON.stringify(con, null, 2), 'utf8');
    logger.loader('Đã lưu cấu hình proxy socks5 vào config.json!');
  }
  // Proxy agent
  if (con.socks5tl && con.socks5 && con.socks5.startsWith('socks5://')) {
    try {
      const { SocksProxyAgent } = require('socks-proxy-agent');
      agent = new SocksProxyAgent(con.socks5);
    } catch {
      logger.loader('❌ Không thể tải socks-proxy-agent. Hãy cài: npm i socks-proxy-agent', 'error');
    }
  }
})();

// Axios instance
const axiosInstance = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36' },
  ...(agent && { httpAgent: agent, httpsAgent: agent }),
  family: 4, // [FIX] Ép buộc axios chỉ dùng IPv4
  timeout: 10000
});
global.axios = axiosInstance;

// Hàm lấy stream từ URL (dùng được trong commands/events)
async function streamURL(url, type) {
  const response = await global.axios({
    method: "GET",
    url,
    responseType: "stream",
    timeout: 15000,
    family: 4, // [FIX] Ép buộc stream dùng IPv4
    ...(agent && { httpsAgent: agent }),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
    },
  });
  return response;
}
global.streamURL = streamURL;
module.exports.streamURL = streamURL;

// Kiểm tra proxy thực tế
if (con.socks5tl && agent) {
  (async () => {
    try {
      const res = await global.axios.get('https://api64.ipify.org?format=text');
      logger.loader(`✅ Proxy OK! IP: ${res.data}`);
    } catch {
      logger.loader('❌ SOCKS5 proxy KHÔNG kết nối hoặc sai cấu hình!', 'error');
    }
  })();
}

// ========== THEME ==========
const theme = con.DESIGN?.Theme || 'default';
let co, error;
switch ((theme || '').toLowerCase()) {
  case 'blue':
    co = gradient(["#1affa3", "cyan", "pink", "cyan", "#1affa3"]);
    error = chalk.red.bold;
    break;
  case 'dream2':
    co = gradient("#a200ff", "#21b5ff", "#a200ff");
    break;
  case 'dream':
    co = gradient(["blue", "pink", "gold", "pink", "blue"]);
    error = chalk.red.bold;
    break;
  case 'fiery':
    co = gradient("#fc2803", "#fc6f03", "#fcba03");
    error = chalk.red.bold;
    break;
  case 'rainbow':
    co = gradient.rainbow;
    error = chalk.red.bold;
    break;
  case 'pastel':
    co = gradient.pastel;
    error = chalk.red.bold;
    break;
  case 'red':
    co = gradient("red", "orange");
    error = chalk.red.bold;
    break;
  case 'aqua':
    co = gradient("#0030ff", "#4e6cf2");
    error = chalk.blueBright;
    break;
  case 'retro':
    co = gradient.retro;
    break;
  case 'ghost':
    co = gradient.mind;
    break;
  case 'hacker':
    co = gradient('#47a127', '#0eed19', '#27f231');
    break;
  default:
    co = gradient("#243aff", "#4687f0", "#5800d4");
    error = chalk.red.bold;
    break;
}

// ========== CACHE FOLDER ==========
const cacheDir = path.join(__dirname, "pdata", "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const restartNotifyPath = path.join(cacheDir, "restart_notify.json");
setTimeout(() => {
  try {
    if (fs.existsSync(restartNotifyPath)) {
      const { threadID, senderID } = JSON.parse(fs.readFileSync(restartNotifyPath, "utf8"));
      const now = moment.tz("Asia/Ho_Chi_Minh");
      const msg = `✅ [BOT ĐÃ KHỞI ĐỘNG LẠI]\n→ Thời gian: ${now.format("HH:mm:ss - DD/MM/YYYY")}\n→ Gửi bởi Admin: https://facebook.com/${senderID}\n→ Uptime: ${Math.floor(process.uptime())} giây`;
      global.client?.api?.sendMessage?.(msg, threadID, (err) => err && console.error(err));
      fs.unlinkSync(restartNotifyPath);
    }
  } catch (e) {
    console.error("Lỗi gửi notify restart:", e);
  }
}, 5000);

// ========== GLOBALS ==========
global.client = {
  commands: new Map(),
  superBan: new Map(),
  events: new Map(),
  allThreadID: [],
  allUsersInfo: new Map(),
  timeStart: { timeStamp: Date.now(), fullTime: "" },
  allThreadsBanned: new Map(),
  allUsersBanned: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleSchedule: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: "",
  getTime: (option) => {
    const format = {
      seconds: "ss", minutes: "mm", hours: "HH", date: "DD", month: "MM", year: "YYYY",
      fullHour: "HH:mm:ss", fullYear: "DD/MM/YYYY", fullTime: "HH:mm:ss DD/MM/YYYY"
    };
    return format[option] ? moment.tz("Asia/Ho_Chi_Minh").format(format[option]) : "";
  }
};

global.data = {
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: [],
  allUserID: [],
  allCurrenciesID: [],
  allThreadID: []
};
global.utils = require("./pdata/utils");
global.nodemodule = {};
global.config = con;
global.configModule = {};
global.moduleData = [];
global.language = {};
global.account = {};
global.anti = path.resolve(process.cwd(), 'anti.json');

// ========== CONFIG LOAD ==========
(() => {
  try {
    global.client.configPath = path.join(global.client.mainPath, configFile);
    Object.assign(global.config, require(global.client.configPath));
  } catch {
    const tempPath = global.client.configPath.replace(/\.json$/, "") + ".temp";
    if (fs.existsSync(tempPath)) Object.assign(global.config, JSON.parse(fs.readFileSync(tempPath)));
  }
  fs.writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');
})();

// ========== LANGUAGE ==========
(() => {
  const langFile = fs.readFileSync(`${__dirname}/pdata/languages/${global.config.language || "en"}.lang`, 'utf-8').split(/\r?\n|\r/);
  langFile.filter(item => item[0] !== '#' && item).forEach(line => {
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const [itemKey, itemValue] = [line.slice(0, idx), line.slice(idx + 1)];
    const [head, ...rest] = itemKey.split('.');
    if (!global.language[head]) global.language[head] = {};
    global.language[head][rest.join('.')] = itemValue.replace(/\\n/gi, '\n');
  });
  global.getText = function (...args) {
    const [cat, key, ...params] = args;
    let text = global.language?.[cat]?.[key];
    params.forEach((v, i) => text = text.replace(RegExp(`%${i + 1}`, 'g'), v));
    return text;
  };
})();

// ========== AUTO CLEAN CACHE ==========
if (con.autoCleanCache?.Enable) {
  const { CachePath, AllowFileExtension } = con.autoCleanCache;
  fs.readdir(CachePath, (err, files) => {
    if (!err) {
      files.forEach(file => {
        if (AllowFileExtension.includes(path.extname(file).toLowerCase()))
          fs.unlink(path.join(CachePath, file), () => {});
      });
      logger('Đã xoá các file cache', "[ AUTO - CLEAN ]");
    } else {
      console.error('Lỗi khi đọc thư mục:', err);
    }
  });
} else {
  logger('Auto Clean Cache Đã Bị Tắt', "[ AUTO - CLEAN ]");
}

// ========== MODULE FAIL ==========
const failModules = [];
const failModulesPath = path.join(__dirname, "failmodules.txt");
// ========== ONBOT ==========
function onBot({ models }) {
  const login = require(con.NPM_FCA);
  const appStatePath = path.resolve(global.client.mainPath, global.config.APPSTATEPATH || 'appstate.json');

  let loginData;
  try {
    let appStateRaw = fs.readFileSync(appStatePath, 'utf8');
    let appState = (process.env.KEY && global.config.encryptSt && appStateRaw[0] !== '[')
      ? JSON.parse(decryptState(appStateRaw, process.env.KEY))
      : JSON.parse(appStateRaw);
    loginData = { appState };
    logger.loader("Đã tìm thấy appState, đang đăng nhập...");
  } catch {
    logger.loader("Không tìm thấy appState, đang thử login bằng cookie...", "warn");
    const cookies = global.utils.parseCookies(fs.readFileSync('./pcookie.txt', 'utf8'));
    loginData = { appState: cookies };
  }

  const loginOptions = {
    logLevel: "silent",
    forceLogin: true,
    userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
  };

  if (con.socks5tl && agent) loginOptions.agent = agent;

  login(loginData, loginOptions, async (err, api) => {
  if (err) {
    logger("⚠️ [FCA-ERROR] Đăng nhập bằng appState thất bại, đang thử AutoLogin qua fblogin.js...", "warn");

    try {
      const { login: fbAutoLogin } = require("./lib/fblogin.js");
      const result = await fbAutoLogin();

      if (result?.status) {
        logger("✅ AutoLogin thành công! AppState mới đã được tạo. Đang khởi động lại bot...", "success");

        // Restart tiến trình
        const { spawn } = require("child_process");
        // Thêm ...process.argv.slice(2) để giữ lại config
spawn(process.argv[0], [process.argv[1], ...process.argv.slice(2)], {

          detached: true,
          stdio: "inherit",
        }).unref();
        process.exit(1);
      } else {
        logger(`❌ AutoLogin thất bại: ${result?.message || "Không rõ lỗi"}`, "error");
        return process.exit(1);
      }
    } catch (e) {
      logger(`❌ Lỗi khi gọi fblogin.js: ${e.message}`, "error");
      return process.exit(1);
    }
  }

  // ====== Nếu login thành công bằng appState ======
  api.setOptions(global.config.FCAOption);
  global.client.api = api;

  let newAppState = JSON.stringify(api.getAppState(), null, 2);
  if (process.env.KEY && global.config.encryptSt) {
    newAppState = await encryptState(newAppState, process.env.KEY);
  }
  fs.writeFileSync(appStatePath, newAppState);

  const userId = api.getCurrentUserID();
  const userInfo = await api.getUserInfo([userId]);
  const userName = userInfo[userId]?.name || "Unknown";
  logger(`Đăng nhập thành công với tài khoản ${chalk.bold.cyan(userName)}`, "success");

    // ========== LOAD MODULES ==========
    global.client.version = '4.6.9';
    global.client.timeStart = Date.now();
    const startTime = Date.now();

    // Load commands và events
    loadModules('commands', global.client.commands, models, failModules, file =>
      !file.includes('example') && !global.config.commandDisabled.includes(file.replace(/\.js$/, ''))
    );
    loadModules('commands/game', global.client.commands, models, failModules, file =>
      !file.includes('example') && !global.config.commandDisabled.includes(file.replace(/\.js$/, ''))
    );
    loadModules('events', global.client.events, models, failModules, file =>
      !global.config.eventDisabled.includes(file.replace(/\.js$/, ''))
    );

    if (failModules.length) fs.writeFileSync(failModulesPath, failModules.join('\n\n'), 'utf8');
    else if (fs.existsSync(failModulesPath)) fs.unlinkSync(failModulesPath);
    
    // ==================================================================================================== //
    // =================================== PHẦN GIAO DIỆN ĐÃ NÂNG CẤP =================================== //
    // ==================================================================================================== //

    
    const timeLoad = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    const totalUsers = global.data.allUserID?.length || 0;
    const totalThreads = global.data.allThreadID?.length || 0;

    // ASCII Art Banner
    const banner = `

   ___              __       
  / _ \_______  ___/ /__ ____
 / ___/ __/ _ \/ _  / -_) __/
/_/   \__/\___/\_,_/\__/_/   
                             

    `;
    console.log(co(banner));

    // Bảng thông tin
    const box = {
      topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
      horizontal: '═', vertical: '║'
    };
    
    const info = [
        { label: 'Tên Bot', value: chalk.cyan(global.config.BOTNAME || 'Mirai Bot') },
        { label: 'Prefix', value: chalk.yellow(global.config.PREFIX) },
        { label: 'Phiên bản', value: chalk.magenta(global.client.version) },
        { label: 'Tổng lệnh', value: chalk.green(global.client.commands.size) },
        { label: 'Tổng sự kiện', value: chalk.green(global.client.events.size) },
        { label: 'Thời gian load', value: chalk.hex('#f5a623')(timeLoad) },
        { label: 'Tổng người dùng', value: chalk.blue(totalUsers) },
        { label: 'Tổng nhóm', value: chalk.blue(totalThreads) },
        { label: 'NodeJS', value: chalk.greenBright(process.version) },
        { label: 'Hệ điều hành', value: `${os.type()} ${os.release()}` }
    ];

    const maxLength = Math.max(...info.map(i => i.label.length));
    const boxWidth = 50;

    console.log(co(`${box.topLeft}${box.horizontal.repeat(boxWidth)}${box.topRight}`));
    console.log(co(`${box.vertical}${chalk.bold(' THÔNG TIN KHỞI ĐỘNG BOT ')}`.padEnd(boxWidth + co(' ').length) + co(box.vertical)));
    console.log(co(`${box.vertical}${box.horizontal.repeat(boxWidth)}${box.bottomRight}`));

    info.forEach(item => {
        const label = ` ${item.label.padEnd(maxLength)}`;
        const line = ` ${box.vertical}${label} : ${item.value}`;
        console.log(line);
    });
    
    console.log(co(`${box.bottomLeft}${box.horizontal.repeat(boxWidth)}${box.bottomRight}`));

    if (failModules.length > 0) {
        logger(`Phát hiện ${failModules.length} module lỗi. Kiểm tra file 'failmodules.txt' để xem chi tiết.`, "warn");
    }

    require('chalkercli').rainbow('🚀 Bot đã sẵn sàng nhận lệnh! 🚀').start();

    // ==================================================================================================== //
    // ==================================================================================================== //
    
    fs.writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');

    const { spawn } = require('child_process');
    const listener = require('./pdata/data_dongdev/listen')({ api, models });
    global.handleListen = api.listenMqtt(async (error, message) => {
      if (error) {
  logger('⚠️ Tài khoản bị đăng xuất, đang tự động login lại bằng fblogin.js...', 'warn');
  try {
    const { login } = require('./fblogin.js');
    const result = await login();
    if (result.status) {
      logger('✅ Tự động đăng nhập lại thành công! Đang khởi động lại bot...');
      const { spawn } = require('child_process');
      spawn(process.argv[0], [process.argv[1], ...process.argv.slice(2)], {
        detached: true,
        stdio: 'inherit'
      }).unref();
    } else {
      logger('❌ Login lại thất bại:', result.message);
    }
  } catch (e) {
    logger('❌ Lỗi khi tự động login lại:', e.message);
  }
  process.exit(1);
}

      if (['presence', 'typ', 'read_receipt'].includes(message.type)) return;
      return listener(message);
    });
  });
}

// Helper: Load modules
function loadModules(type, collection, models, failModules, filter) {
  const dir = path.join(global.client.mainPath, `modules/${type}`);
  const list = fs.readdirSync(dir).filter(f => f.endsWith('.js') && filter(f));
  const listPackage = require('./package.json').dependencies;
  const builtins = require("module").builtinModules;
  for (const file of list) {
    try {
      const module = require(path.join(dir, file));
      if (!module.config || !module.run || (type === 'commands' && !module.config.commandCategory)) throw new Error(global.getText('mirai', 'errorFormat'));
      if (collection.has(module.config.name || '')) throw new Error(global.getText('mirai', 'nameExist'));
      // Require dependencies
      if (module.config.dependencies) for (const dep in module.config.dependencies) {
        if (!global.nodemodule[dep]) {
          if (listPackage[dep] || builtins.includes(dep)) global.nodemodule[dep] = require(dep);
          else global.nodemodule[dep] = require(path.join(__dirname, 'nodemodules', 'node_modules', dep));
        }
      }
      // Env config
      if (module.config.envConfig) for (const env in module.config.envConfig) {
        global.configModule[module.config.name] = global.configModule[module.config.name] || {};
        global.config[module.config.name] = global.config[module.config.name] || {};
        global.configModule[module.config.name][env] = global.configModule[module.config.name][env] ?? module.config.envConfig[env];
        global.config[module.config.name][env] = global.config[module.config.name][env] ?? module.config.envConfig[env];
      }
      // onLoad
      module.onLoad?.({ api: global.client.api, models });
      if (module.handleEvent) global.client.eventRegistered.push(module.config.name);
      collection.set(module.config.name, module);
    } catch (err) {
      failModules.push(`✖ [ PCODER ]  𝐅𝐚𝐢𝐥 ${file.replace(/\.js$/, '')}\n    → ${err?.stack || err}`);
    }
  }
}

// =================================================================
// XỬ LÝ KHI TẮT BOT (CTRL + C)
// =================================================================
process.on('SIGINT', async () => {
    console.log(chalk.yellow("\n[SYSTEM] Đã nhận tín hiệu tắt bot (Ctrl+C). Bắt đầu dọn dẹp..."));
    
    try {
        // Nạp file connect.js để có thể gọi hàm đóng
        const db = require('./modules/commands/1connect.js'); 
        if (db && typeof db.close === 'function') {
            await db.close(); // Gọi hàm đóng kết nối an toàn
        }
    } catch (e) {
        console.error("❌ [DATABASE] Lỗi khi cố gắng đóng kết nối MySQL:", e);
    }

    // Các tác vụ dọn dẹp khác có thể thêm vào đây
    // Ví dụ: Lưu lại các dữ liệu quan trọng...
    
    console.log(chalk.green("[SYSTEM] Đã dọn dẹp xong. Tạm biệt!"));
    process.exit(0); // Tắt tiến trình
});


// ========== DB + START ==========
(async () => {
    try {
        const { Sequelize, sequelize } = require("./pdata/data_dongdev/database");
        await sequelize.authenticate();
        const models = require('./pdata/data_dongdev/database/model')({ Sequelize, sequelize });
        logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ]');
        onBot({ models });
    } catch (error) {
        logger(global.getText('mirai', 'successConnectDatabase', JSON.stringify(error)), '[ DATABASE ]');
    }
})();


process.on('unhandledRejection', () => { })
  .on('uncaughtException', err => { console.log(err); });
