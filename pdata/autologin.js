const fs = require("fs");
const path = require("path");
const tough = require("tough-cookie");

// ==== CONFIG & PATHS ====
const ACC_PATH = path.join(__dirname, "../acc.json");
const APPSTATE_PATH = path.join(__dirname, "../appstate.json");
const COOKIE_PATH = path.join(__dirname, "../pcookie.txt");

function logger(msg, tag = "") {
  console.log(`${tag ? `[${tag}] ` : ""}${msg}`);
}

// ==== Lưu cookie từ appstate ra file ====
function saveCookieFromAppState(appState, filePath) {
  const keys = ["c_user", "xs", "datr", "sb", "fr"];
  let cookieArr = [];
  appState.forEach(({ key, value }) => {
    if (keys.includes(key)) cookieArr.push(`${key}=${value}`);
  });
  fs.writeFileSync(filePath, cookieArr.join("; "), "utf-8");
}

// ==== Tự động đăng nhập bằng acc.json, lưu appstate, cookie ====
function autoLogin(callback) {
  logger("Bắt đầu tự động đăng nhập bằng tài khoản...", "AUTOLOGIN");
  let login;
  try {
    login = require("fca-unofficial");
  } catch (e) {
    logger("Không tìm thấy module fca-unofficial. Hãy cài đặt bằng: npm install fca-unofficial", "AUTOLOGIN");
    process.exit(1);
  }
  let acc;
  try {
    acc = require(ACC_PATH);
  } catch (e) {
    logger("Không tìm thấy acc.json!", "AUTOLOGIN");
    process.exit(1);
  }

  const loginData = {
    email: acc.EMAIL,
    password: acc.PASSWORD,
    keyotp: (acc.OTPKEY || "").replace(/\s+/g, "").toLowerCase()
  };
  const options = {
    logLevel: "silent",
    forceLogin: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PcoderBrowser/1.0 Chrome/121.0.0.0 Safari/537.36"
  };

  login(loginData, options, (err, api) => {
    if (err) {
      logger("Đăng nhập thất bại: " + (err.error || err), "AUTOLOGIN");
      if (callback) callback(err, null);
      return;
    }
    logger("Đăng nhập thành công, đang lưu appstate...", "AUTOLOGIN");
    const appState = api.getAppState();
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(appState, null, 2), "utf-8");
    logger("Đã lưu appstate.json", "AUTOLOGIN");
    saveCookieFromAppState(appState, COOKIE_PATH);
    logger("Đã lưu pcookie.txt", "AUTOLOGIN");
    if (callback) callback(null, api);
  });
}

// ==== Đăng nhập lại qua cookie (nếu cần) ====
function autoLoginByCookie(callback) {
  logger("Đang thử đăng nhập lại qua cookie...", "AUTOLOGIN");
  let login;
  try {
    login = require("fca-unofficial");
  } catch (e) {
    logger("Không tìm thấy module fca-unofficial. Hãy cài đặt bằng: npm install fca-unofficial", "AUTOLOGIN");
    process.exit(1);
  }
  let cookieString;
  try {
    cookieString = fs.readFileSync(COOKIE_PATH, "utf-8");
  } catch (e) {
    logger("Không tìm thấy pcookie.txt!", "AUTOLOGIN");
    if (callback) callback(e, null);
    return;
  }
  const appState = cookieString.split(";").map(e => {
    const [key, value] = e.trim().split("=");
    return { key, value };
  });
  const options = {
    logLevel: "silent",
    forceLogin: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PcoderBrowser/1.0 Chrome/121.0.0.0 Safari/537.36"
  };
  login({ appState }, options, (err, api) => {
    if (err) {
      logger("Đăng nhập qua cookie thất bại: " + (err.error || err), "AUTOLOGIN");
      if (callback) callback(err, null);
      return;
    }
    logger("Đăng nhập lại qua cookie thành công!", "AUTOLOGIN");
    const newAppState = api.getAppState();
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(newAppState, null, 2), "utf-8");
    logger("Đã update appstate.json", "AUTOLOGIN");
    saveCookieFromAppState(newAppState, COOKIE_PATH);
    logger("Đã cập nhật pcookie.txt", "AUTOLOGIN");
    if (callback) callback(null, api);
  });
}

module.exports = {
  autoLogin,
  autoLoginByCookie,
  logger
};