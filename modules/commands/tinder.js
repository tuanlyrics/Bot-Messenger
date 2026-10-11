const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require('canvas');

// --- HÀM TẠO ẢNH ---
async function makeImage({ one, two }) {
    const avatarOne = await getAvatarBuffer(one);
    const avatarTwo = await getAvatarBuffer(two);
    if (!avatarOne || !avatarTwo) return null;

    const backgroundUrl = "https://i.postimg.cc/wjJ29HRB/background1.png";
    const background = await loadImage((await axios.get(backgroundUrl, { responseType: 'arraybuffer' })).data);
    
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    
    const imageOne = await loadImage(avatarOne);
    ctx.drawImage(imageOne, 100, 150, 300, 300);

    const imageTwo = await loadImage(avatarTwo);
    ctx.drawImage(imageTwo, 900, 150, 300, 300);

    return canvas.toBuffer("image/png");
}

async function getAvatarBuffer(userID) {
    try {
        const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        return res.data;
    } catch (e) {
        console.error(`Lỗi khi tải avatar cho ID ${userID}:`, e.message);
        return null;
    }
}

// --- MODULE EXPORTS ---
module.exports.config = {
    name: "tinder",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Ghép đôi ngẫu nhiên, theo giới tính hoặc với người được tag.",
    commandCategory: "Tình yêu",
    usages: "[nam/nữ] hoặc [@tag]",
    cooldowns: 10
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    const { threadID, messageID, senderID } = event;
    const mention = Object.keys(event.mentions);

    const mung = [
        "Chúc 2 bạn trăm năm hạnh phúc!",
        "Hai bạn trông thật đẹp đôi!",
        "Hãy tin vào duyên số đi, vì nó có thật đấy!",
        "Hợp đôi lắm đấy. Quan tâm chăm sóc cho mối quan hệ này nhiều hơn nữa nhé!",
        "Cưới đi chờ chi!"
    ];

    // TRƯỜNG HỢP 1: TAG MỘT NGƯỜI
    if (mention.length === 1) {
        const one = senderID;
        const two = mention[0];
        const name1 = await Users.getNameUser(one);
        const name2 = await Users.getNameUser(two);
        const tile = Math.floor(Math.random() * 51) + 50; // Tỷ lệ từ 50-100%

        try {
            const imageBuffer = await makeImage({ one, two });
            if (!imageBuffer) return api.sendMessage("Không thể tạo ảnh do lỗi tải avatar.", threadID, messageID);
            
            const imagePath = path.join(__dirname, "cache", `tinder_${one}_${two}.png`);
            fs.writeFileSync(imagePath, imageBuffer);
            
            return api.sendMessage({
                body: `❤️ Cặp đôi mới của nhóm ❤️\n\n${name1} và ${name2}\n\n💌 Tỷ lệ hợp đôi: ${tile}%\n💬 Lời chúc: ${mung[Math.floor(Math.random() * mung.length)]}`,
                mentions: [{ tag: name1, id: one }, { tag: name2, id: two }],
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => fs.unlinkSync(imagePath), messageID);

        } catch(e) {
            console.error(e);
            return api.sendMessage("Đã có lỗi xảy ra khi tạo ảnh ghép đôi.", threadID, messageID);
        }
    }
    
    // TRƯỜNG HỢP 2: GHÉP NGẪU NHIÊN
    return api.sendMessage("Bạn muốn tìm một nửa là Nam hay Nữ?\n\nReact 👍 cho Nam\nReact ❤️ cho Nữ", threadID, (err, info) => {
        global.client.handleReaction.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
        });
    }, messageID);
};

module.exports.handleReaction = async function({ api, event, handleReaction, Users, Threads }) {
    const { threadID, messageID, userID, reaction } = event;
    if (userID !== handleReaction.author) return;

    api.unsendMessage(handleReaction.messageID);

    let desiredGender;
    if (reaction === "👍") desiredGender = "MALE";
    else if (reaction === "❤️") desiredGender = "FEMALE";
    else return;

    try {
        const threadInfo = await Threads.getInfo(threadID);
        const { participantIDs, userInfo } = threadInfo;
        const botID = api.getCurrentUserID();

        const potentialPartners = userInfo.filter(user => 
            user.id !== botID && 
            user.id !== userID &&
            user.gender?.toUpperCase() === desiredGender
        );

        if (potentialPartners.length === 0) {
            return api.sendMessage(`Rất tiếc, không tìm thấy ai là ${desiredGender === "MALE" ? "Nam" : "Nữ"} trong nhóm để ghép đôi với bạn.`, threadID);
        }

        const partner = potentialPartners[Math.floor(Math.random() * potentialPartners.length)];
        const one = userID;
        const two = partner.id;
        const name1 = await Users.getNameUser(one);
        const name2 = partner.name;
        const tile = Math.floor(Math.random() * 101);

        const mung = [
            "Chúc 2 bạn trăm năm hạnh phúc!",
            "Hai bạn trông thật đẹp đôi!",
            "Hãy tin vào duyên số đi, vì nó có thật đấy!",
            "Hợp đôi lắm đấy. Quan tâm chăm sóc cho mối quan hệ này nhiều hơn nữa nhé!",
            "Cưới đi chờ chi!"
        ];

        const imageBuffer = await makeImage({ one, two });
        if (!imageBuffer) return api.sendMessage("Không thể tạo ảnh do lỗi tải avatar.", threadID, messageID);
        
        const imagePath = path.join(__dirname, "cache", `tinder_${one}_${two}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        return api.sendMessage({
            body: `❤️ Tìm thấy rồi! ❤️\n\nBot đã mai mối thành công ${name1} với ${name2}\n\n💌 Tỷ lệ hợp đôi: ${tile}%\n💬 Lời chúc: ${mung[Math.floor(Math.random() * mung.length)]}`,
            mentions: [{ tag: name1, id: one }, { tag: name2, id: two }],
            attachment: fs.createReadStream(imagePath)
        }, threadID, () => fs.unlinkSync(imagePath));

    } catch (e) {
        console.error(e);
        return api.sendMessage("Đã có lỗi xảy ra, vui lòng thử lại.", threadID);
    }
};