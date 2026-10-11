// lib/fblogin.js
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const qs = require("qs");
const logger = console;

// 👉 SỬA EMAIL & MẬT KHẨU CỦA MÀY Ở ĐÂY
const EMAIL = "tuanlyricsbot@gmail.com";
const PASSWORD = "tuananhtiktok";

class FacebookLogin {
  static async login() {
    if (!EMAIL || !PASSWORD) {
      logger.error("❌ Thiếu thông tin đăng nhập Facebook!");
      return { status: false, message: "Thiếu email hoặc mật khẩu" };
    }

    logger.log("🌐 Đang gửi yêu cầu đăng nhập Facebook...");

    const adid = uuidv4();
    const device_id = uuidv4();
    const family_device_id = uuidv4();
    const machine_id = [...Array(24)]
      .map(() => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)])
      .join("");

    const loginData = {
      adid,
      email: EMAIL,
      password: PASSWORD,
      device_id,
      family_device_id,
      locale: "en_US",
      credentials_type: "password",
      generate_session_cookies: "1",
      source: "login",
      machine_id,
      fb_api_caller_class: "com.facebook.account.login.protocol.Fb4aAuthHandler",
      api_key: "882a8490361da98702bf97a021ddc14d",
      access_token: "350685531728|62f8ce9f74b12f84c123cc23437a4a32",
    };

    // Ký md5 để xác thực request
    const sig = Object.entries(Object.fromEntries(Object.entries(loginData).sort()))
      .map(([k, v]) => `${k}=${v}`)
      .join("");
    loginData.sig = crypto.createHash("md5").update(sig + loginData.access_token).digest("hex");

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 12; SM-G988N Build/SP1A.210812.016; com.termux)",
      "x-fb-http-engine": "Liger",
    };

    try {
      const res = await axios.post(
        "https://b-graph.facebook.com/auth/login",
        qs.stringify(loginData),
        { headers }
      );

      if (res.data?.session_cookies) {
        const cookies = res.data.session_cookies;
        const appState = cookies.map((c) => ({
          key: c.name,
          value: c.value,
          domain: "facebook.com",
          path: c.path,
          expires: c.expires,
          httpOnly: c.secure,
          secure: c.secure,
        }));

        const output = path.join(__dirname, "appstate.json");
        fs.writeFileSync(output, JSON.stringify(appState, null, 2));

        logger.log("✅ Đăng nhập thành công! AppState đã lưu tại:", output);
        return { status: true, appState };
      } else {
        logger.error("❌ Đăng nhập thất bại:", res.data?.error?.message || "Không rõ lỗi");
        return { status: false, message: res.data?.error?.message || "Login fail" };
      }
    } catch (err) {
      logger.error("❌ Lỗi đăng nhập:", err.message);
      return { status: false, message: err.message };
    }
  }
}

module.exports = FacebookLogin;
