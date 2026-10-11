/**
 * Chuyển đổi mảng appstate (dạng FCA) thành chuỗi cookie browser chuẩn.
 * @param {Array} appState - Mảng appstate Facebook
 * @returns {string} cookieHeader - Chuỗi cookie để dùng cho browser, tool, ...
 */
function appstate2cookie(appState) {
  if (!Array.isArray(appState)) throw new Error("appState phải là một mảng!");
  // Chỉ lấy các key có giá trị (đôi khi FCA có property lạ)
  const cookieArr = appState
    .filter(c => c && typeof c.key === "string" && typeof c.value === "string")
    .map(c => `${encodeURIComponent(c.key)}=${encodeURIComponent(c.value)}`);
  return cookieArr.join('; ');
}

module.exports = appstate2cookie;

// === Ví dụ sử dụng độc lập ===
// node pdata/a2c.js appstate.json pcookie.txt
if (require.main === module) {
  const fs = require('fs');
  const [,, appstateFile, cookieFile] = process.argv;
  if (!appstateFile || !cookieFile) {
    console.log('Cách dùng: node pdata/a2c.js appstate.json pcookie.txt');
    process.exit(1);
  }
  const appState = JSON.parse(fs.readFileSync(appstateFile, 'utf8'));
  const cookieHeader = appstate2cookie(appState);
  fs.writeFileSync(cookieFile, cookieHeader, 'utf8');
  console.log('✅ Đã xuất cookie thành công!');
}