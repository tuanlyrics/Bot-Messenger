const fs = require("fs-extra");
const axios = require("axios");
const Canvas = require("canvas");

module.exports.config = {
    name: "poker",
    version: "1.1.0",
    hasPermssion: 0,
    credits: "Dũngkon",
    description: "Game Poker Texas Hold'em cho nhóm, gửi bài riêng cho từng người",
    commandCategory: "Game",
    usages: "[create/join/start/deal/flop/turn/river/show/leave/info/checkgroup/reset]",
    cooldowns: 0
};

const cardValues = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const cardSuits = ["spades", "clubs", "diamonds", "hearts"];
const cardDeck = [];
for (const value of cardValues) {
    for (const suit of cardSuits) {
        cardDeck.push({
            Value: value,
            Suit: suit,
            Icon: suit === "spades" ? "♠️" : 
                  suit === "clubs" ? "♣️" : 
                  suit === "diamonds" ? "♦️" : "♥️"
        });
    }
}

function shuffleDeck() {
    const shuffled = [...cardDeck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getCardImage(value, suit) {
    const valueMap = {
        "J": "jack",
        "Q": "queen",
        "K": "king",
        "A": "ace"
    };
    const cardValue = valueMap[value] || value;
    return `https://raw.githubusercontent.com/PhucCuTe/card/main/cards/${cardValue}_of_${suit}.png`;
}

async function drawCards(cards) {
    const canvas = Canvas.createCanvas(500 * cards.length, 726);
    const ctx = canvas.getContext("2d");
    for (let i = 0; i < cards.length; i++) {
        try {
            const response = await axios.get(cards[i], { responseType: 'arraybuffer' });
            const image = await Canvas.loadImage(response.data);
            ctx.drawImage(image, 500 * i, 0, 500, 726);
        } catch (error) {
            console.error(`Error loading card image: ${cards[i]}`, error);
        }
    }
    return canvas.toBuffer();
}

if (!global.moduleData.poker) global.moduleData.poker = new Map();

function getHandRank(cards) {

    const valueOrder = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14 };
    return Math.max(...cards.map(c => valueOrder[c.Value]));
}

function suggestCommand(input, commands) {
    input = (input || "").toLowerCase();
    let minDist = Infinity, best = "";
    for (const cmd of commands) {
        let dist = levenshtein(input, cmd);
        if (dist < minDist) {
            minDist = dist;
            best = cmd;
        }
    }
    return minDist <= 3 ? best : null;
}

function levenshtein(a, b) {
    const dp = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i-1][j] + 1,
                dp[i][j-1] + 1,
                dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
}

module.exports.run = async function({ event, api, args, Users, Currencies }) {
    const { senderID, threadID, messageID } = event;
    const validCommands = [
        "create", "join", "leave", "start", "deal", "action", "info", "checkgroup", "reset", "huongdan"
    ];
    const validActions = ["fold", "call", "raise", "check"];

    if (!args[0]) {
        return api.sendMessage(
            `♠️ Poker ♠️

» poker create <coins>: Tạo bàn chơi (bắt buộc nhập số coins)
» poker join: Tham gia bàn
» poker leave: Rời bàn
» poker start: Bắt đầu ván
» poker deal: Chia bài riêng + bắt đầu vòng cược
» poker action [fold/call/raise/check]: Thực hiện hành động
» poker info: Xem thông tin bàn
» poker checkgroup: Kiểm tra nhóm riêng của từng người
» poker reset: Xoá bàn chơi (chỉ chủ bàn)
» poker huongdan: để xem hướng dẫn chơi và luật chơi của game poker

» LƯU Ý KẾT BẠN VỚI BOT TRƯỚC KHI CHƠI`,
            threadID, messageID
        );
    }

    const subCommand = args[0].toLowerCase();
    if (!validCommands.includes(subCommand)) {
        const suggest = suggestCommand(subCommand, validCommands);
        return api.sendMessage(
            suggest
                ? `⚠️ Lệnh không hợp lệ! Bạn có muốn dùng: "poker ${suggest}"?\nGõ "poker" để xem hướng dẫn.`
                : `⚠️ Lệnh không hợp lệ! Gõ "poker" để xem hướng dẫn.`,
            threadID, messageID
        );
    }

    const gameData = global.moduleData.poker.get(threadID) || {};

    async function checkAndAutoNextRound() {
        const alivePlayers = gameData.players.filter(p => !p.folded);
        if (alivePlayers.length === 1) {
            const winner = alivePlayers[0];
            const prizePot = gameData.pot || 0;
            const totalBet = (gameData.coins || 0) * gameData.players.length;
            const totalPrize = prizePot + totalBet;
            const winnerName = await Users.getNameUser(winner.id);

            await api.sendMessage(
                `🏆 Tất cả đã bỏ bài, chỉ còn ${winnerName}!\n${winnerName} thắng toàn bộ pot + tiền cược bàn: +${totalPrize} coins!`,
                threadID
            );
            await Currencies.increaseMoney(winner.id, totalPrize);

            global.moduleData.poker.delete(threadID);

            for (const player of gameData.players) {
                if (player.groupID) {
                    try {
                        await api.removeUserFromGroup(player.id, player.groupID);
                    } catch (e) {}
                    try {
                        await api.removeUserFromGroup(api.getCurrentUserID(), player.groupID);
                    } catch (e) {}
                }
            }
            return;
        }

        if (!gameData.players.every(p => p.acted || p.folded)) return;
        if (!gameData.players.every(p => p.folded || p.bet === gameData.currentBet)) return;

        gameData.players.forEach(p => { p.acted = false; p.bet = 0; });
        gameData.currentBet = 0;
        const nextIdx = gameData.players.findIndex(p => !p.folded);
        gameData.currentTurn = nextIdx >= 0 ? nextIdx : null;

        if (!gameData.flop) {
            gameData.community = [gameData.deck.shift(), gameData.deck.shift(), gameData.deck.shift()];
            gameData.flop = true;
            await sendCommunity(api, threadID, gameData, "🃏 FLOP (3 lá chung đầu):");
        } else if (!gameData.turn) {
            gameData.community.push(gameData.deck.shift());
            gameData.turn = true;
            await sendCommunity(api, threadID, gameData, "🃏 TURN (4 lá chung):");
        } else if (!gameData.river) {
            gameData.community.push(gameData.deck.shift());
            gameData.river = true;
            await sendCommunity(api, threadID, gameData, "🃏 RIVER (5 lá chung):");
        } else {
            let msg = "🃏 BÀI CHUNG (Community Cards):\n";
            msg += gameData.community.map(card => `${card.Icon}${card.Value}`).join(" | ");
            await api.sendMessage(msg, threadID);

            let results = [];
            for (const player of gameData.players) {
                if (!player.folded) {
                    const allCards = [...player.hand, ...gameData.community];
                    results.push({
                        id: player.id,
                        name: await Users.getNameUser(player.id),
                        rank: getHandRank(allCards)
                    });
                }
            }
            if (results.length === 0) {
                await api.sendMessage("Không ai còn lại để nhận thưởng!", threadID);
                global.moduleData.poker.delete(threadID);
            } else {
                const maxRank = Math.max(...results.map(r => r.rank));
                const winners = results.filter(r => r.rank === maxRank);
                const prize = Math.floor((gameData.pot || 0) / winners.length);
                let resultMsg = "♠️ KẾT QUẢ BÀI POKER ♠️\n";
                for (const player of gameData.players) {
                    resultMsg += `\n${await Users.getNameUser(player.id)}: ${player.hand[0].Icon}${player.hand[0].Value} | ${player.hand[1].Icon}${player.hand[1].Value}${player.folded ? " (Đã bỏ bài)" : ""}`;
                }
                resultMsg += `\n\n🏆 Người thắng: ${winners.map(w => w.name).join(", ")} (+${prize} coins)`;
                await api.sendMessage(resultMsg, threadID);

                for (const w of winners) {
                    await Currencies.increaseMoney(w.id, prize);
                }
                global.moduleData.poker.delete(threadID);
            }
            for (const player of gameData.players) {
                if (player.groupID) {
                    try {
                        await api.removeUserFromGroup(player.id, player.groupID);
                    } catch (e) {}
                    try {
                        await api.removeUserFromGroup(api.getCurrentUserID(), player.groupID);
                    } catch (e) {}
                }
            }
            return;
        }
        global.moduleData.poker.set(threadID, gameData);
    }

    async function sendCommunity(api, threadID, gameData, label) {
        const cardImages = gameData.community.map(card => getCardImage(card.Value, card.Suit));
        const imageBuffer = await drawCards(cardImages);
        const path = `./cache/poker_community_${threadID}.png`;
        await fs.writeFile(path, imageBuffer);
        let msg = label + "\n";
        msg += gameData.community.map(card => `${card.Icon}${card.Value}`).join(" | ");
        await api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(path)
        }, threadID);
        await fs.unlink(path);
    }

    switch (subCommand) {
        case "create": {
            if (global.moduleData.poker.has(threadID))
                return api.sendMessage("⚠️ Nhóm này đã có bàn Poker!", threadID, messageID);
            const coins = parseInt(args[1]);
            if (isNaN(coins) || coins < 1)
                return api.sendMessage("⚠️ Bạn phải nhập số coins tối thiểu!", threadID, messageID);
            const userData = await Currencies.getData(senderID);
            const userMoney = userData && typeof userData.money === "number" ? userData.money : 0;
            if (userMoney < coins)
                return api.sendMessage(`⚠️ Bạn không đủ ${coins} coins để tạo bàn!`, threadID, messageID);

            let isFriend = false;
            try {
                if (typeof api.getFriendsList === "function") {
                    const friends = await api.getFriendsList();
                    if (Array.isArray(friends) && friends.find(f => f.userID == senderID)) {
                        isFriend = true;
                    }
                }
            } catch (e) {}
            if (isFriend) {
                await api.sendMessage(`🤝 Bạn đã là bạn bè với bot!`, threadID, messageID);
            } else {
                try {
                    const form = {
                        av: api.getCurrentUserID(),
                        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
                        fb_api_caller_class: "RelayModern",
                        doc_id: "4499164963466303",
                        variables: JSON.stringify({input: {scale: 3}})
                    };
                    const res = await api.httpPost("https://www.facebook.com/api/graphql/", form);
                    const listRequest = JSON.parse(res).data.viewer.friending_possibilities.edges;
                    const found = listRequest.find(u => u.node.id == senderID);
                    if (found) {
                        const confirmForm = {
                            av: api.getCurrentUserID(),
                            fb_caller_class: "RelayModern",
                            fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
                            doc_id: "3147613905362928",
                            variables: JSON.stringify({
                                input: {
                                    source: "friends_tab",
                                    actor_id: api.getCurrentUserID(),
                                    client_mutation_id: Math.round(Math.random() * 19).toString(),
                                    friend_requester_id: senderID
                                },
                                scale: 3,
                                refresh_num: 0
                            })
                        };
                        await api.httpPost("https://www.facebook.com/api/graphql/", confirmForm);
                        await api.sendMessage(`🤝 Bot đã chấp nhận kết bạn với bạn!`, threadID, messageID);
                    }
                } catch (e) {}
            }

            await Currencies.decreaseMoney(senderID, coins);
            global.moduleData.poker.set(threadID, {
                author: senderID,
                started: false,
                players: [{ id: senderID, groupID: null, hand: [], folded: false, bet: 0 }],
                deck: [],
                community: [],
                dealt: false,
                flop: false,
                turn: false,
                river: false,
                coins,
                pot: 0
            });
            return api.sendMessage(`♠️ Bàn Poker đã được tạo với cược ${coins} coins/người! Dùng 'poker join' để tham gia.`, threadID, messageID);
        }

        case "join": {
            if (!gameData.author)
                return api.sendMessage("⚠️ Chưa có bàn Poker nào!", threadID, messageID);
            if (gameData.started)
                return api.sendMessage("⚠️ Bàn đã bắt đầu, không thể tham gia!", threadID, messageID);
            if (gameData.players.some(p => p.id === senderID))
                return api.sendMessage("⚠️ Bạn đã tham gia rồi!", threadID, messageID);
            const userData = await Currencies.getData(senderID);
            const userMoney = userData && typeof userData.money === "number" ? userData.money : 0;
            if (userMoney < gameData.coins)
                return api.sendMessage(`⚠️ Bạn không đủ ${gameData.coins} coins để tham gia!`, threadID, messageID);

            const playerName = await Users.getNameUser(senderID);

            let isFriend = false, hasRequest = false;
            try {
                if (typeof api.getFriendsList === "function") {
                    const friends = await api.getFriendsList();
                    if (Array.isArray(friends) && friends.find(f => f.userID == senderID)) {
                        isFriend = true;
                    }
                }
            } catch (e) {}
            if (!isFriend) {
                try {
                    const form = {
                        av: api.getCurrentUserID(),
                        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
                        fb_api_caller_class: "RelayModern",
                        doc_id: "4499164963466303",
                        variables: JSON.stringify({input: {scale: 3}})
                    };
                    const res = await api.httpPost("https://www.facebook.com/api/graphql/", form);
                    const listRequest = JSON.parse(res).data.viewer.friending_possibilities.edges;
                    const found = listRequest.find(u => u.node.id == senderID);
                    if (found) {
                        hasRequest = true;
                        const confirmForm = {
                            av: api.getCurrentUserID(),
                            fb_caller_class: "RelayModern",
                            fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
                            doc_id: "3147613905362928",
                            variables: JSON.stringify({
                                input: {
                                    source: "friends_tab",
                                    actor_id: api.getCurrentUserID(),
                                    client_mutation_id: Math.round(Math.random() * 19).toString(),
                                    friend_requester_id: senderID
                                },
                                scale: 3,
                                refresh_num: 0
                            })
                        };
                        await api.httpPost("https://www.facebook.com/api/graphql/", confirmForm);
                        await api.sendMessage(`🤝 Bot đã chấp nhận kết bạn với ${playerName}!`, threadID, messageID);
                    }
                } catch (e) {}
            }
            if (!isFriend && !hasRequest) {
                await api.sendMessage(
                    `⚠️ Người chơi ${playerName} chưa gửi lời mời kết bạn cho bot và cũng không phải bạn bè với bot!\n` +
                    `Bot có thể không gửi được bài cho ${playerName}. Vui lòng kết bạn với bot trước khi ván game bắt đầu.`,
                    threadID, messageID
                );
            }

            await Currencies.decreaseMoney(senderID, gameData.coins);
            gameData.players.push({ id: senderID, groupID: null, hand: [], folded: false, bet: 0 });
            global.moduleData.poker.set(threadID, gameData);
            return api.sendMessage(`✅ ${playerName} đã tham gia bàn Poker!`, threadID, messageID);
        }
        case "huongdan": {
            return api.sendMessage(
`♠️ HƯỚNG DẪN CHƠI POKER ♠️

1. *Luật chơi cơ bản:*
- Mỗi người được chia 2 lá bài riêng.
- 5 lá bài chung sẽ được lật ra giữa bàn (3 lá đầu gọi là Flop, lá thứ 4 là Turn, lá thứ 5 là River).
- Người chơi kết hợp 2 lá bài riêng và 5 lá bài chung để tạo thành bộ bài mạnh nhất (5 lá).
- Người mạnh nhất hoặc người cuối cùng không bỏ bài sẽ thắng toàn bộ pot.

2. *Các loại bài mạnh từ cao đến thấp:*
- *Thùng phá sảnh (Royal Flush):* 10-J-Q-K-A cùng chất.
- *Sảnh chúa (Straight Flush):* 5 lá liên tiếp cùng chất.
- *Tứ quý (Four of a Kind):* 4 lá cùng số.
- *Cù lũ (Full House):* 3 lá cùng số + 1 đôi.
- *Thùng (Flush):* 5 lá cùng chất.
- *Sảnh (Straight):* 5 lá liên tiếp khác chất.
- *Bộ ba (Three of a Kind):* 3 lá cùng số.
- *Hai đôi (Two Pair):* 2 đôi khác nhau.
- *Một đôi (One Pair):* 2 lá cùng số.
- *Mậu thầu (High Card):* Không có bộ nào trên, lấy lá cao nhất.

3. *Các hành động trong mỗi vòng cược:*
- *check:* Không tố thêm, chỉ khi chưa ai tố.
- *call:* Theo số coins đã tố trước đó.
- *raise <số coins>:* Tố thêm số coins (phải lớn hơn số đã tố trước đó).
- *raise all:* Tố toàn bộ số coins bạn còn lại (all-in).
- *fold:* Bỏ bài, không chơi tiếp ván đó.

4. *Cách chơi trên bot:*
- Tạo bàn: poker create <coins>
- Tham gia: poker join
- Rời bàn: poker leave
- Bắt đầu: poker start
- Chia bài: poker deal
- Thực hiện hành động: poker action [fold/call/raise/check]
- Xem thông tin bàn: poker info
- Kiểm tra nhóm riêng: poker checkgroup
- Reset bàn: poker reset

💡 *Lưu ý:* Hãy kết bạn với bot trước khi chơi để nhận bài riêng!
`, threadID, messageID);
}

        case "leave": {
            if (!gameData.author)
                return api.sendMessage("⚠️ Chưa có bàn Poker nào!", threadID, messageID);
            const idx = gameData.players.findIndex(p => p.id === senderID);
            if (idx === -1)
                return api.sendMessage("⚠️ Bạn chưa tham gia bàn này!", threadID, messageID);
            if (gameData.started)
                return api.sendMessage("⚠️ Bàn đã bắt đầu, không thể rời!", threadID, messageID);

            gameData.players.splice(idx, 1);
            global.moduleData.poker.set(threadID, gameData);
            const playerName = await Users.getNameUser(senderID);
            return api.sendMessage(`👋 ${playerName} đã rời bàn Poker!`, threadID, messageID);
        }

        case "info": {
            if (!gameData.author)
                return api.sendMessage("⚠️ Chưa có bàn Poker nào!", threadID, messageID);
            const authorName = await Users.getNameUser(gameData.author);
            const playerNames = await Promise.all(
                gameData.players.map(p => Users.getNameUser(p.id))
            );
            return api.sendMessage(
                `♠️ THÔNG TIN BÀN POKER ♠️
» Chủ bàn: ${authorName}
» Số người chơi: ${gameData.players.length}
» Trạng thái: ${gameData.started ? "Đã bắt đầu" : "Chưa bắt đầu"}
» Người chơi:\n${playerNames.map((name, i) => `${i+1}. ${name}`).join("\n")}`,
                threadID, messageID
            );
        }

        case "checkgroup": {
            if (!gameData.author)
                return api.sendMessage("⚠️ Chưa có bàn Poker nào!", threadID, messageID);
            let msg = "🔎 Nhóm riêng của từng người:\n";
            for (const player of gameData.players) {
                const name = await Users.getNameUser(player.id);
                msg += `${name}: ${player.groupID ? player.groupID : "Chưa tạo"}\n`;
            }
            return api.sendMessage(msg, threadID, messageID);
        }

        case "reset": {
            if (!gameData.author)
                return api.sendMessage("⚠️ Chưa có bàn Poker nào!", threadID, messageID);
            if (senderID !== gameData.author)
                return api.sendMessage("⚠️ Chỉ chủ bàn mới được xoá/reset!", threadID, messageID);

            for (const player of gameData.players || []) {
                if (player.groupID) {
                    try {
                        await api.removeUserFromGroup(player.id, player.groupID);
                        await api.removeUserFromGroup(api.getCurrentUserID(), player.groupID);
                    } catch (e) {}
                }
            }
            global.moduleData.poker.delete(threadID);
            return api.sendMessage("✅ Đã xoá bàn Poker!", threadID, messageID);
        }

        case "start": {
            if (!gameData.author)
                return api.sendMessage("⚠️ Chưa có bàn Poker nào!", threadID, messageID);
            if (senderID !== gameData.author)
                return api.sendMessage("⚠️ Chỉ chủ bàn mới được bắt đầu ván đấu!", threadID, messageID);
            if (gameData.players.length < 2)
                return api.sendMessage("⚠️ Cần ít nhất 2 người để bắt đầu!", threadID, messageID);
            if (gameData.started)
                return api.sendMessage("⚠️ Bàn đã bắt đầu rồi!", threadID, messageID);

            let warningMsg = "";
            for (const player of gameData.players) {
                let isFriend = false, hasRequest = false;
                try {
                    if (typeof api.getFriendsList === "function") {
                        const friends = await api.getFriendsList();
                        if (Array.isArray(friends) && friends.find(f => f.userID == player.id)) {
                            isFriend = true;
                        }
                    }
                } catch (e) {}
                if (!isFriend) {
                    try {
                        const form = {
                            av: api.getCurrentUserID(),
                            fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
                            fb_api_caller_class: "RelayModern",
                            doc_id: "4499164963466303",
                            variables: JSON.stringify({input: {scale: 3}})
                        };
                        const res = await api.httpPost("https://www.facebook.com/api/graphql/", form);
                        const listRequest = JSON.parse(res).data.viewer.friending_possibilities.edges;
                        const found = listRequest.find(u => u.node.id == player.id);
                        if (found) {
                            hasRequest = true;
                            const confirmForm = {
                                av: api.getCurrentUserID(),
                                fb_caller_class: "RelayModern",
                                fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
                                doc_id: "3147613905362928",
                                variables: JSON.stringify({
                                    input: {
                                        source: "friends_tab",
                                        actor_id: api.getCurrentUserID(),
                                        client_mutation_id: Math.round(Math.random() * 19).toString(),
                                        friend_requester_id: player.id
                                },
                                scale: 3,
                                refresh_num: 0
                            })
                        };
                        await api.httpPost("https://www.facebook.com/api/graphql/", confirmForm);
                        const name = await Users.getNameUser(player.id);
                        await api.sendMessage(`🤝 Bot đã chấp nhận kết bạn với ${name}!`, threadID, messageID);
                    }
                } catch (e) {}
            }
            if (!isFriend && !hasRequest) {
                const name = await Users.getNameUser(player.id);
                warningMsg += `⚠️ Người chơi ${name} chưa gửi lời mời kết bạn cho bot và cũng không phải bạn bè với bot!\n`;
            }
        }
        if (warningMsg) {
            warningMsg += "Bot có thể không gửi được bài cho những người này. Vui lòng kết bạn với bot trước khi ván game bắt đầu!";
            await api.sendMessage(warningMsg, threadID, messageID);
        }

        gameData.started = true;
        gameData.deck = shuffleDeck();
        gameData.community = [];
        gameData.dealt = false;
        gameData.flop = false;
        gameData.turn = false;
        gameData.river = false;
        global.moduleData.poker.set(threadID, gameData);
        return api.sendMessage("♠️ Bàn Poker đã bắt đầu! Dùng 'poker deal' để chia bài.", threadID, messageID);
    }

        case "deal": {
            if (!gameData.author || !gameData.started)
                return api.sendMessage("⚠️ Bàn chưa bắt đầu!", threadID, messageID);
            if (senderID !== gameData.author)
                return api.sendMessage("⚠️ Chỉ chủ bàn mới được chia bài!", threadID, messageID);
            if (gameData.dealt)
                return api.sendMessage("⚠️ Đã chia bài rồi!", threadID, messageID);

            for (const player of gameData.players) {
                player.folded = false;
                player.acted = false;
                player.bet = 0;
                if (!player.groupID) {
                    try {
                        player.groupID = await new Promise((resolve) => {
                            api.createNewGroup([api.getCurrentUserID(), player.id], (err, groupID) => {
                                if (err || !groupID) {
                                    Users.getNameUser(player.id).then(name => {
                                        api.sendMessage(
                                            `⚠️ Không thể tạo nhóm riêng cho ${name}. Hãy kiểm tra cài đặt Facebook của bạn.`,
                                            threadID
                                        );
                                    });
                                    return resolve(null);
                                }
                                resolve(groupID);
                            });
                        });
                    } catch (error) {
                        player.groupID = null;
                    }
                }
            }
            gameData.currentBet = 0;
            gameData.pot = 0;
            for (const player of gameData.players) {
                player.hand = [gameData.deck.shift(), gameData.deck.shift()];
                if (player.groupID) {
                    try {
                        const cardImages = [
                            getCardImage(player.hand[0].Value, player.hand[0].Suit),
                            getCardImage(player.hand[1].Value, player.hand[1].Suit)
                        ];
                        const imageBuffer = await drawCards(cardImages);
                        const path = `./cache/poker_${player.id}.png`;
                        await fs.writeFile(path, imageBuffer);
                        await api.sendMessage({
                            body: `Bài của bạn:\n${player.hand[0].Icon}${player.hand[0].Value} | ${player.hand[1].Icon}${player.hand[1].Value}`,
                            attachment: fs.createReadStream(path)
                        }, player.groupID);
                        await fs.unlink(path);
                    } catch (error) {}
                }
            }
            gameData.community = [gameData.deck.shift(), gameData.deck.shift(), gameData.deck.shift()];
            gameData.dealt = true;
            gameData.flop = true;
            gameData.turn = false;
            gameData.river = false;
            global.moduleData.poker.set(threadID, gameData);

            await sendCommunity(api, threadID, gameData, "🃏 FLOP (3 lá chung đầu):");

            await api.sendMessage("✅ Đã chia bài! Mỗi người hãy dùng 'poker action [fold/call/raise/check]' để thực hiện hành động.", threadID, messageID);
            gameData.currentTurn = 0; 
            global.moduleData.poker.set(threadID, gameData);
            return;
        }

        case "action": {
            if (!gameData.author || !gameData.started || !gameData.dealt)
                return api.sendMessage("⚠️ Bàn chưa chia bài!", threadID, messageID);

            if (!args[1]) {
                return api.sendMessage(
                    `⚠️ Bạn cần nhập hành động!\nVí dụ: poker action call\nCác hành động hợp lệ: fold, call, raise, check`,
                    threadID, messageID
                );
            }
            const action = (args[1] || "").toLowerCase();
            if (!validActions.includes(action)) {
                const suggest = suggestCommand(action, validActions);
                return api.sendMessage(
                    suggest
                        ? `⚠️ Hành động không hợp lệ! Bạn có muốn dùng: "${suggest}"?\nCác hành động hợp lệ: fold, call, raise, check`
                        : `⚠️ Hành động không hợp lệ! Các hành động hợp lệ: fold, call, raise, check`,
                    threadID, messageID
                );
            }

            const player = gameData.players.find(p => p.id === senderID);
            if (!player) return api.sendMessage("Bạn không ở trong bàn này!", threadID, messageID);
            if (player.folded) return api.sendMessage("Bạn đã bỏ bài!", threadID, messageID);
            if (player.acted) return api.sendMessage("Bạn đã hành động ở vòng này!", threadID, messageID);

            const currentIdx = gameData.currentTurn;
            if (
                typeof currentIdx !== "number" ||
                !gameData.players[currentIdx] ||
                gameData.players[currentIdx].id !== senderID
            ) {
                return api.sendMessage("Chưa đến lượt bạn!", threadID, messageID);
            }

            const playerName = await Users.getNameUser(senderID);

            if (action === "raise") {
                let raiseAmount;
                if ((args[2] && args[2].toLowerCase() === "all") || (args[1] && args[1].toLowerCase() === "all")) {
                    // raise all: tố toàn bộ số coins còn lại
                    const userData = await Currencies.getData(senderID);
                    const userMoney = userData && typeof userData.money === "number" ? userData.money : 0;
                    raiseAmount = userMoney;
                    if (raiseAmount <= 0)
                        return api.sendMessage(`${playerName} không còn coins để all-in!`, threadID, messageID);
                } else {
                    raiseAmount = parseInt(args[2]);
                    if (isNaN(raiseAmount) || raiseAmount < 10)
                        return api.sendMessage(`${playerName} phải tố (raise) ít nhất 10 coins hoặc dùng 'raise all'!`, threadID, messageID);
                }

                // Số tiền cần bỏ thêm để raise = (currentBet - player.bet) + raiseAmount
                const needToAdd = (gameData.currentBet || 0) - (player.bet || 0) + raiseAmount;

                // Kiểm tra raise phải lớn hơn currentBet
                if (raiseAmount <= (gameData.currentBet || 0))
                    return api.sendMessage(`${playerName} phải tố số coins lớn hơn số đã tố trước đó (${gameData.currentBet || 0})!`, threadID, messageID);

                // Cho phép âm tiền nếu không đủ
                await Currencies.decreaseMoney(senderID, needToAdd);
                gameData.pot = (gameData.pot || 0) + needToAdd;
                player.bet = (player.bet || 0) + needToAdd;
                gameData.currentBet = player.bet;
                player.acted = true;
                await api.sendMessage(`${playerName} đã tố (raise) ${raiseAmount} coins!`, threadID, messageID);

                for (const p of gameData.players) {
                    if (p.id !== senderID && !p.folded) p.acted = false;
                }
            } else if (action === "call") {
                if (!gameData.currentBet || gameData.currentBet === 0) {
                    return api.sendMessage(
                        "Chưa có ai tố, bạn vui lòng dùng check hoặc raise!",
                        threadID,
                        messageID
                    );
                }
                const needToCall = (gameData.currentBet || 0) - (player.bet || 0);
                if (needToCall <= 0)
                    return api.sendMessage(`Chưa có ai tố, ${playerName} vui lòng dùng check hoặc raise!`, threadID, messageID);

                // Cho phép âm tiền nếu không đủ
                await Currencies.decreaseMoney(senderID, needToCall);
                gameData.pot = (gameData.pot || 0) + needToCall;
                player.bet = (player.bet || 0) + needToCall;
                player.acted = true;
                await api.sendMessage(`${playerName} đã theo (call) ${needToCall} coins!`, threadID, messageID);
            } else if (action === "check") {
                if (gameData.currentBet > player.bet)
                    return api.sendMessage(`${playerName} không thể check khi chưa theo đủ số coins đã tố!`, threadID, messageID);
                player.acted = true;
                await api.sendMessage(`${playerName} đã chọn: CHECK`, threadID, messageID);
            } else if (action === "fold") {
                player.acted = true;
                player.folded = true;
                await api.sendMessage(`${playerName} đã bỏ bài!`, threadID, messageID);
            }

            let nextIdx = currentIdx;
            let found = false;
            for (let i = 1; i <= gameData.players.length; i++) {
                const idx = (currentIdx + i) % gameData.players.length;
                const p = gameData.players[idx];
                if (!p.folded && !p.acted) {
                    gameData.currentTurn = idx;
                    found = true;
                    break;
                }
            }
            if (!found) gameData.currentTurn = null; 

            await checkAndAutoNextRound();
            return;
        }
    }
};