const { spawn } = require('child_process');
const chalk = require('chalk');

// Danh sách các file config cho từng acc
const bots = [
    { name: 'ACC_CHINH', config: 'config.json', color: 'green' },
    { name: 'ACC_PHU',   config: 'config_2.json', color: 'yellow' }
];

function startBot(botInfo) {
    console.log(chalk[botInfo.color](`[LAUNCHER] Đang khởi động ${botInfo.name}...`));

    // Chạy lệnh: node index.js <tên_file_config>
    const child = spawn('node', ['main.js', botInfo.config], {
        stdio: 'inherit', // Cho phép hiện log của bot con ra màn hình chính
        shell: true
    });

    child.on('close', (code) => {
        console.log(chalk.red(`[LAUNCHER] ${botInfo.name} đã bị tắt (Code: ${code}). Đang khởi động lại sau 5s...`));
        setTimeout(() => {
            startBot(botInfo);
        }, 5000);
    });

    child.on('error', (err) => {
        console.log(chalk.red(`[LAUNCHER] Lỗi không thể chạy ${botInfo.name}: ${err}`));
    });
}

// Bắt đầu chạy tất cả các bot
console.log(chalk.blue.bold("=== HỆ THỐNG CHẠY SONG SONG 2 ACC ==="));
bots.forEach(bot => startBot(bot));
