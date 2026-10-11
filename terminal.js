/**
 * 🧠 SPN BOT CONTROL PANEL (PM2 LOG + FBSTATE + RESTART + VPS MONITOR)
 * Version 3.0 - Thêm theo dõi CPU, RAM, Disk, Uptime
 */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const os = require("os");
const AnsiToHtml = require("ansi-to-html");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const convert = new AnsiToHtml();

const APPSTATE_PATH = path.join(__dirname, "appstate.json");
const LOG_FILE = path.join(__dirname, "console.log");

// ============================================================
// ⚙️ CONFIG EXPRESS
// ============================================================
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.json({ limit: "5mb" }));
app.use("/socket.io", express.static(path.join(__dirname, "node_modules/socket.io/client-dist")));

// ============================================================
// 🧾 GHI LOG CỤC BỘ (Dashboard server)
// ============================================================
const logFile = fs.createWriteStream(LOG_FILE, { flags: "a" });
const logStdout = process.stdout;
console.log = function (...args) {
  const msg = args.join(" ");
  logFile.write(msg + "\n");
  logStdout.write(msg + "\n");
};
console.error = console.log;

// ============================================================
// 📊 LẤY THÔNG TIN VPS
// ============================================================
function getVPSInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsagePercent = (100 - (100 * totalIdle / totalTick)).toFixed(1);

  const uptime = os.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return {
    cpu: {
      usage: cpuUsagePercent,
      cores: cpus.length,
      model: cpus[0].model
    },
    memory: {
      total: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      used: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      free: (freeMem / 1024 / 1024 / 1024).toFixed(2),
      usagePercent: memUsagePercent
    },
    uptime: `${days}d ${hours}h ${minutes}m`,
    platform: `${os.type()} ${os.release()}`,
    hostname: os.hostname()
  };
}

// Lấy thông tin Disk (Linux)
function getDiskInfo(callback) {
  exec("df -h / | tail -1", (err, stdout) => {
    if (err) return callback({ used: "N/A", total: "N/A", percent: "N/A" });
    const parts = stdout.trim().split(/\s+/);
    callback({
      total: parts[1],
      used: parts[2],
      free: parts[3],
      percent: parts[4]
    });
  });
}

// ============================================================
// 📡 THEO DÕI LOG PM2 (filebot)
// ============================================================
const pm2LogPath = path.join(process.env.HOME || process.env.USERPROFILE, ".pm2/logs/filebot-out.log");

if (fs.existsSync(pm2LogPath)) {
  console.log("📡 Đang theo dõi log từ:", pm2LogPath);

  fs.watchFile(pm2LogPath, { interval: 1000 }, () => {
    try {
      const logs = fs.readFileSync(pm2LogPath, "utf8").split("\n").slice(-15).join("\n");
      io.emit("console", convert.toHtml(logs.replace(/\n/g, "<br>")));
    } catch {}
  });
} else {
  console.warn("⚠️ Không tìm thấy file log PM2 của filebot:", pm2LogPath);
}

// ============================================================
// 📊 GỬI THÔNG TIN VPS MỖI 2 GIÂY
// ============================================================
setInterval(() => {
  getDiskInfo(diskInfo => {
    const vpsInfo = getVPSInfo();
    vpsInfo.disk = diskInfo;
    io.emit("vpsInfo", vpsInfo);
  });
}, 2000);

// ============================================================
// 🌐 GIAO DIỆN DASHBOARD
// ============================================================
app.get("/", (req, res) => {
  res.send(`
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>🧠 SPN BOT CONTROL PANEL</title>
      <style>
        * { box-sizing: border-box; }
        body {
          background: #0d1117; color: #c9d1d9;
          font-family: 'Segoe UI', Tahoma, monospace; 
          margin: 0; padding: 20px;
        }
        h2, h3 { color: #58a6ff; margin-bottom: 8px; }
        
        /* VPS Stats Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 15px;
          position: relative;
          overflow: hidden;
        }
        .stat-title {
          font-size: 12px;
          color: #8b949e;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #58a6ff;
          margin-bottom: 5px;
        }
        .stat-sub {
          font-size: 13px;
          color: #8b949e;
        }
        .progress-bar {
          width: 100%;
          height: 6px;
          background: #21262d;
          border-radius: 3px;
          margin-top: 10px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #58a6ff, #1f6feb);
          transition: width 0.3s ease;
        }
        .progress-fill.high { background: linear-gradient(90deg, #f85149, #da3633); }
        
        textarea {
          width: 100%; height: 250px; background: #161b22;
          color: #fff; border: 1px solid #30363d; border-radius: 6px;
          padding: 10px; font-size: 14px; font-family: monospace;
        }
        button {
          margin-top: 10px; margin-right: 10px; padding: 10px 20px;
          border: none; border-radius: 6px; font-weight: bold;
          cursor: pointer; font-size: 14px;
        }
        .save { background: #238636; color: #fff; }
        .save:hover { background: #2ea043; }
        .restart { background: #da3633; color: #fff; }
        .restart:hover { background: #f85149; }
        .flex { display: flex; gap: 20px; flex-wrap: wrap; }
        .column { flex: 1; min-width: 320px; }
        #console {
          background: #000; color: #ccc; padding: 10px;
          height: 400px; overflow: auto; border-radius: 5px;
          white-space: pre-wrap; border: 1px solid #30363d;
          font-size: 13px; font-family: monospace;
        }
        hr { border: 0; border-bottom: 1px solid #30363d; margin: 25px 0; }
        .timestamp {color:#6ee7b7;font-size:11px;}
        .hostname { color: #8b949e; font-size: 12px; }
      </style>
    </head>
    <body>
      <h2>🖥️ VPS MONITOR</h2>
      <div class="hostname" id="hostname">Loading...</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">💻 CPU Usage</div>
          <div class="stat-value" id="cpu-usage">--%</div>
          <div class="stat-sub" id="cpu-info">-- cores</div>
          <div class="progress-bar">
            <div class="progress-fill" id="cpu-bar" style="width:0%"></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-title">🧠 Memory</div>
          <div class="stat-value" id="mem-usage">--%</div>
          <div class="stat-sub" id="mem-info">-- / -- GB</div>
          <div class="progress-bar">
            <div class="progress-fill" id="mem-bar" style="width:0%"></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-title">💾 Disk Space</div>
          <div class="stat-value" id="disk-usage">--%</div>
          <div class="stat-sub" id="disk-info">-- / --</div>
          <div class="progress-bar">
            <div class="progress-fill" id="disk-bar" style="width:0%"></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-title">⏱️ Uptime</div>
          <div class="stat-value" id="uptime" style="font-size:20px">--</div>
          <div class="stat-sub" id="platform">--</div>
        </div>
      </div>

      <hr>
      <h2>🖥️ CONSOLE REALTIME (PM2)</h2>
      <div id="console">Đang tải log...</div>

      <hr>
      <div class="flex">
        <div class="column">
          <h3>📦 Cập nhật FBSTATE</h3>
          <form method="POST" action="/save">
            <textarea name="data" placeholder="Dán FBSTATE JSON tại đây..."></textarea><br>
            <button class="save">💾 Lưu FBSTATE</button>
          </form>
        </div>

        <div class="column">
          <h3>⚙️ Điều khiển Bot</h3>
          <button class="restart" onclick="restartBot()">🔁 Khởi động lại bot</button>
          <pre id="current" style="color:#8b949e;font-size:12px;"></pre>
        </div>
      </div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const consoleDiv = document.getElementById("console");
        
        // Console logs
        socket.on("console", line => {
          const time = new Date().toLocaleTimeString('vi-VN');
          consoleDiv.innerHTML += "<span class='timestamp'>["+time+"]</span> " + line + "<br>";
          consoleDiv.scrollTop = consoleDiv.scrollHeight;
        });

        // VPS Info realtime
        socket.on("vpsInfo", data => {
          // CPU
          document.getElementById('cpu-usage').textContent = data.cpu.usage + '%';
          document.getElementById('cpu-info').textContent = data.cpu.cores + ' cores • ' + data.cpu.model.substring(0,30);
          updateProgressBar('cpu-bar', data.cpu.usage);

          // Memory
          document.getElementById('mem-usage').textContent = data.memory.usagePercent + '%';
          document.getElementById('mem-info').textContent = data.memory.used + ' / ' + data.memory.total + ' GB';
          updateProgressBar('mem-bar', data.memory.usagePercent);

          // Disk
          const diskPercent = parseFloat(data.disk.percent);
          document.getElementById('disk-usage').textContent = data.disk.percent;
          document.getElementById('disk-info').textContent = data.disk.used + ' / ' + data.disk.total;
          updateProgressBar('disk-bar', diskPercent);

          // Uptime & Platform
          document.getElementById('uptime').textContent = data.uptime;
          document.getElementById('platform').textContent = data.platform;
          document.getElementById('hostname').textContent = '🌐 ' + data.hostname;
        });

        function updateProgressBar(id, percent) {
          const bar = document.getElementById(id);
          bar.style.width = percent + '%';
          bar.className = 'progress-fill' + (percent > 80 ? ' high' : '');
        }

        // Load current appstate
        fetch('/current').then(r=>r.json()).then(j=>{
          document.getElementById('current').textContent = 
            'Appstate: ' + (j.error ? 'Chưa có' : 'Đã tải (' + Object.keys(j).length + ' cookies)');
        });

        function restartBot(){
          if(confirm('Bạn chắc chắn muốn khởi động lại bot?')) {
            fetch('/restart',{method:'POST'}).then(r=>r.text()).then(alert);
          }
        }
      </script>
    </body>
  </html>
  `);
});

// ============================================================
// 💾 API: LƯU FBSTATE
// ============================================================
app.post("/save", (req, res) => {
  try {
    const raw = req.body.data;
    const json = JSON.parse(raw);
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(json, null, 2));
    console.log("✅ FBSTATE đã lưu thành appstate.json");
    res.send("<h3 style='color:lime'>✅ Lưu thành công! <a href='/'>Quay lại</a></h3>");
  } catch (e) {
    res.send(`<h3 style='color:red'>❌ Lỗi: ${e.message}</h3>`);
  }
});

// ============================================================
// 📜 API: XEM APPSTATE
// ============================================================
app.get("/current", (req, res) => {
  try {
    const data = fs.readFileSync(APPSTATE_PATH, "utf8");
    res.json(JSON.parse(data));
  } catch {
    res.json({ error: "Chưa có appstate.json" });
  }
});

// ============================================================
// 🔁 API: RESTART BOT (PM2)
// ============================================================
app.post("/restart", (req, res) => {
  res.send("🌀 Bot đang khởi động lại...");
  setTimeout(() => {
    exec("pm2 restart filebot -f", (err, stdout, stderr) => {
      if (err) console.error("❌ Lỗi restart bot:", err);
      else console.log("✅ Bot đã restart:", stdout || stderr);
    });
  }, 500);
});

// ============================================================
const PORT = 9090;
server.listen(PORT, () => {
  console.log(`🌍 Dashboard chạy tại: http://localhost:${PORT}`);
});