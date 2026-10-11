module.exports.config = {
    name: "2048",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Khoa x Nam & Gemini (Tối ưu)",
    description: "Chơi game 2048 phiên bản được tối ưu hóa.",
    commandCategory: "Game",
    usages: "",
    cooldowns: 5
};

const fs = require("fs").promises;
const path = require("path");
const { loadImage, createCanvas } = require("canvas");

const dirPath = path.join(__dirname, "game2048");
const TILE_ASSETS = '2,4,8,16,32,64,128,256,512,1024,2048'.split(',');
const tileCache = new Map();
let boardBackground;

// --- CÁC HÀM TRỢ GIÚP CHO GAME ---

function findMax(map) {
    return Math.max(...[].concat(...map));
}

function isGameOver(map) {
    if ([].concat(...map).includes(0)) return false;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (i < 3 && map[i][j] === map[i + 1][j]) return false;
            if (j < 3 && map[i][j] === map[i][j + 1]) return false;
        }
    }
    return true;
}

async function drawBoard(map, user) {
    const canvas = createCanvas(2500, 1500);
    const ctx = canvas.getContext('2d');

    const score = [].concat(...map).reduce((a, b) => a + b, 0);
    const max = findMax(map);
    
    // Vẽ nền
    if (boardBackground) ctx.drawImage(boardBackground, 0, 0, 2500, 1500);
    
    // Vẽ thông tin người chơi
    ctx.font = 'bold 82px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 7;
    ctx.fillText(user.name, 320, 130, 600);
    
    ctx.font = 'bold 70px Arial';
    ctx.fillStyle = '#c2ff61';
    ctx.fillText(`ID: ${user.id}`, 320, 220, 600);
    
    // Vẽ điểm và ô lớn nhất
    ctx.font = 'bold 75px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(score.toString(), 2250, 110, 300);
    ctx.fillText(max.toString(), 2250, 210, 300);

    // Vẽ các ô số
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (map[i][j] === 0) continue;
            const tileImage = tileCache.get(map[i][j]);
            if (tileImage) {
                ctx.drawImage(tileImage, 680 + 300 * j, 205 + 300 * i, 240, 240);
            }
        }
    }
    return canvas.toBuffer("image/png");
}

async function deleteGameData(userID) {
    const jsonPath = path.join(dirPath, `${userID}.json`);
    try {
        await fs.unlink(jsonPath);
    } catch (e) {
        if (e.code !== 'ENOENT') { // Bỏ qua lỗi nếu file không tồn tại
            console.error(`Lỗi khi xóa file game 2048 của ${userID}:`, e);
        }
    }
}

function createNewMap() {
    let map = Array(4).fill(0).map(() => Array(4).fill(0));
    let tilesToPlace = Math.random() < 0.8 ? 2 : 3;
    while (tilesToPlace > 0) {
        const row = Math.floor(Math.random() * 4);
        const col = Math.floor(Math.random() * 4);
        if (map[row][col] === 0) {
            map[row][col] = Math.random() < 0.8 ? 2 : 4;
            tilesToPlace--;
        }
    }
    return map;
}

function move(map, direction) {
    let newMap = JSON.parse(JSON.stringify(map));
    let moved = false;
    const rotateLeft = (matrix) => matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]).reverse());
    const rotateRight = (matrix) => matrix[0].map((_, colIndex) => matrix.map(row => row[row.length - 1 - colIndex]));
    
    if (direction === 'u') newMap = rotateRight(newMap);
    if (direction === 'd') newMap = rotateLeft(newMap);
    if (direction === 'r') newMap.forEach(row => row.reverse());
    
    for (let i = 0; i < 4; i++) {
        let newRow = newMap[i].filter(cell => cell !== 0);
        for (let j = 0; j < newRow.length - 1; j++) {
            if (newRow[j] === newRow[j + 1]) {
                newRow[j] *= 2;
                newRow.splice(j + 1, 1);
            }
        }
        const padding = Array(4 - newRow.length).fill(0);
        newMap[i] = newRow.concat(padding);
    }
    if (JSON.stringify(map) !== JSON.stringify(newMap)) moved = true;

    if (direction === 'r') newMap.forEach(row => row.reverse());
    if (direction === 'u') for (let i = 0; i < 3; i++) newMap = rotateLeft(newMap);
    if (direction === 'd') for (let i = 0; i < 3; i++) newMap = rotateRight(newMap);

    // Thêm ô mới nếu có di chuyển
    if (moved) {
        let emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (newMap[i][j] === 0) emptyCells.push({ i, j });
            }
        }
        if (emptyCells.length > 0) {
            const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            newMap[i][j] = Math.random() < 0.8 ? 2 : 4;
        }
    }
    return newMap;
}

// --- MODULE EXPORTS ---

module.exports.onLoad = async () => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        boardBackground = await loadImage("https://raw.githubusercontent.com/KhoaDo472005/2048/main/board.png");
        const imagePromises = TILE_ASSETS.map(num => loadImage(`https://raw.githubusercontent.com/KhoaDo472005/2048/main/no${num}.png`));
        const loadedImages = await Promise.all(imagePromises);
        loadedImages.forEach((img, i) => tileCache.set(parseInt(TILE_ASSETS[i]), img));
    } catch (e) {
        console.error("Lỗi nghiêm trọng khi tải tài nguyên game 2048:", e);
    }
};

module.exports.run = async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const jsonPath = path.join(dirPath, `${senderID}.json`);
    let text = "🎮 **Game 2048** 🎮\nReply tin nhắn này với lựa chọn của bạn:\n\n1. Chơi mới\n2. Hướng dẫn";
    
    try {
        await fs.access(jsonPath); // Kiểm tra file có tồn tại không
        text += "\n3. Chơi tiếp";
    } catch (e) {
        // File không tồn tại, không làm gì cả
    }
    
    api.sendMessage(text, threadID, (err, info) => {
        if (err) return console.error(err);
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "menu"
        });
    }, messageID);
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (senderID !== handleReply.author) return;

    const send = (msg, callback) => api.sendMessage(msg, threadID, callback, messageID);

    try {
        api.unsendMessage(handleReply.messageID).catch(() => {});
        const jsonPath = path.join(dirPath, `${senderID}.json`);

        const sendBoard = async (map) => {
            const userName = global.data.userName.get(senderID) || "Không rõ";
            const attachmentBuffer = await drawBoard(map, { id: senderID, name: userName });
            send({
                body: "Dùng u, d, l, r để di chuyển.\n(u: lên, d: xuống, l: trái, r: phải)",
                attachment: attachmentBuffer
            }, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "play"
                });
            });
        };

        if (handleReply.type === "menu") {
            switch (body) {
                case "1": // Chơi mới
                    const newMap = createNewMap();
                    await fs.writeFile(jsonPath, JSON.stringify(newMap, null, 2));
                    await sendBoard(newMap);
                    break;
                case "2": // Hướng dẫn
                    send("📖 Hướng dẫn:\n- Dùng các phím u, d, l, r (lên, xuống, trái, phải) để di chuyển các ô số.\n- Khi hai ô có cùng số chạm vào nhau, chúng sẽ hợp nhất thành một ô có tổng giá trị.\n- Mục tiêu là tạo ra ô có số 2048.\n- Trò chơi kết thúc khi bảng đầy và không thể di chuyển được nữa.");
                    break;
                case "3": // Chơi tiếp
                    try {
                        const mapData = await fs.readFile(jsonPath, 'utf8');
                        await sendBoard(JSON.parse(mapData));
                    } catch (e) {
                        send("❌ Không tìm thấy dữ liệu game cũ. Vui lòng bắt đầu ván mới.");
                    }
                    break;
                default:
                    send("❌ Lựa chọn không hợp lệ. Vui lòng reply 1, 2, hoặc 3.");
            }
        }

        if (handleReply.type === "play") {
            const moveDirection = body.toLowerCase();
            if (!["u", "d", "l", "r"].includes(moveDirection)) {
                return send("⚠️ Sai kí tự! Vui lòng dùng u, d, l, hoặc r.");
            }

            const mapData = await fs.readFile(jsonPath, 'utf8');
            const currentMap = JSON.parse(mapData);
            const newMap = move(currentMap, moveDirection);

            // Kiểm tra xem bàn cờ có thay đổi không
            if (JSON.stringify(currentMap) === JSON.stringify(newMap)) {
                return send("➡️ Hướng đi không làm thay đổi bàn cờ. Hãy thử hướng khác!");
            }

            await fs.writeFile(jsonPath, JSON.stringify(newMap, null, 2));
            
            if ([].concat(...newMap).includes(2048)) {
                const finalBoard = await drawBoard(newMap, { id: senderID, name: global.data.userName.get(senderID) });
                send({ body: "🏆 CHÚC MỪNG! BẠN ĐÃ THẮNG!", attachment: finalBoard });
                await deleteGameData(senderID);
            } else if (isGameOver(newMap)) {
                const finalBoard = await drawBoard(newMap, { id: senderID, name: global.data.userName.get(senderID) });
                send({ body: "☠️ GAME OVER! Bạn đã thua.", attachment: finalBoard });
                await deleteGameData(senderID);
            } else {
                await sendBoard(newMap);
            }
        }
    } catch (error) {
        console.error("Lỗi trong handleReply của 2048:", error);
        send(`❌ Đã xảy ra lỗi không mong muốn: ${error.message}`);
    }
};