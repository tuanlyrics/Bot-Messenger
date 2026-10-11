const FacebookLogin = require("./fblogin.js");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("🧪 Đang kiểm tra đăng nhập Facebook...");

  try {
    const result = await FacebookLogin.login();

    if (result.status) {
      const appState = result.appState;
      const outputPath = path.join(__dirname, "appstate.json");
      fs.writeFileSync(outputPath, JSON.stringify(appState, null, 2));
      console.log("✅ Đăng nhập thành công!");
      console.log(`📁 AppState đã lưu tại: ${outputPath}`);
      console.log("👉 Giờ mày có thể copy file appstate.json này để dùng cho bot.");
    } else {
      console.error("❌ Đăng nhập thất bại:", result.message);
    }
  } catch (err) {
    console.error("💥 Lỗi ngoài ý muốn:", err);
  }
})();
