'use strict';

const fs = require("fs-extra");
const path = require("path");
const axios = require('axios');
const FormData = require('form-data');

// ======================================================= //
// THAY API KEY CỦA BẠN LẤY TỪ https://api.imgbb.com/ VÀO ĐÂY
const imgbbAPIKey = "71c7fb494128d8903217e730fc9492f3"; 
// ======================================================= //

const DATA_DIR = path.join(__dirname, "../commands/cache");
const DATA_FILE = path.join(DATA_DIR, "listscam.json");

function ensureData() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirpSync(DATA_DIR);
    if (!fs.existsSync(DATA_FILE)) fs.writeJSONSync(DATA_FILE, { items: [] }, { spaces: 2 });
}

function readData() {
    ensureData();
    return fs.readJSONSync(DATA_FILE);
}

function writeData(data) {
    fs.writeJSONSync(DATA_FILE, data, { spaces: 2 });
}

async function getFbInfo(api, link) {
    try {
        const endpoint = `https://ffb.vn/api/tool/get-id-fb?idfb=${encodeURIComponent(link)}`;
        const { data } = await axios.get(endpoint);
        if (data && data.error === 0 && data.id && data.name) {
            return { name: data.name, uid: data.id, link: link };
        }
        return null;
    } catch (error) {
        console.error(`[LISTSCAM] Lỗi khi gọi API ffb.vn: ${error.message}`);
        return null;
    }
}

async function uploadToImgBB(imageUrl) {
    if (!imgbbAPIKey || imgbbAPIKey === "API_KEY_CUA_BAN") {
        const errorMsg = "Chưa có API key của ImgBB. Vui lòng thêm key của bạn vào code.";
        console.error(`[LISTSCAM] ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
    try {
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        const formData = new FormData();
        formData.append('image', Buffer.from(imageResponse.data).toString('base64'));

        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`,
            formData,
            { headers: formData.getHeaders() }
        );

        if (response.data.success) {
            return { success: true, url: response.data.data.url };
        } else {
            const errorMsg = `API của ImgBB báo lỗi: ${JSON.stringify(response.data.error)}`;
            console.error(`[LISTSCAM] ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    } catch (error) {
        const errorMsg = `Lỗi hệ thống khi upload: ${error.response?.data?.error?.message || error.message}`;
        console.error(`[LISTSCAM] ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}


module.exports.config = {
    name: "listscam",
    version: "5.2.1-hardcoded-key",
    hasPermssion: 0,
    credits: "",
    description: "Quản lý danh sách scam, tự động upload bằng chứng lên ImgBB để lưu trữ vĩnh viễn.",
    commandCategory: "Tiện ích",
    usages: "listscam add <link_fb/sđt/stk> [kèm hoặc reply ảnh nếu là link fb]\nlistscam del <id>\nlistscam list [page]\nlistscam find <từ khóa>",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    ensureData();
    let data = readData();
    const sub = (args[0] || "").toLowerCase();
    if (!sub) {
        return api.sendMessage("📌 Dùng:\n" + ".listscam add <link_fb | sđt | stk> (kèm hoặc reply ảnh nếu là link FB)\n" + ".listscam del <id>\n" + ".listscam list [trang]\n" + ".listscam find <từ khóa>", threadID, messageID);
    }
    if (sub === "add") {
        const content = args.slice(1).join(" ").trim();
        if (!content) return api.sendMessage("⚠️ Hãy nhập link fb/sđt/stk để thêm.", threadID, messageID);
        let item = {
            id: data.items.length > 0 ? Math.max(...data.items.map(i => i.id)) + 1 : 1,
            content,
            type: "text",
            addedBy: senderID,
            addedAt: new Date().toISOString()
        };
        if (/facebook\.com/i.test(content)) {
            const allAttachments = [...(event.attachments || []), ...(event.messageReply?.attachments || [])];
            const photoAttachments = allAttachments.filter(att => att.type === "photo");
            if (photoAttachments.length === 0) {
                return api.sendMessage("⚠️ Khi thêm link Facebook, bạn phải đính kèm hoặc reply một ảnh làm bằng chứng scam.", threadID, messageID);
            }
            const temporaryImageUrl = photoAttachments[0].url;
            api.sendMessage("⏳ Đang tải ảnh bằng chứng lên ImgBB...", threadID);
            
            const uploadResult = await uploadToImgBB(temporaryImageUrl);
            if (!uploadResult.success) {
                return api.sendMessage(`❌ Lỗi khi tải ảnh lên ImgBB:\n\n${uploadResult.error}\n\nVui lòng kiểm tra lại API Key đã điền trong code và thử lại.`, threadID, messageID);
            }
            
            const permanentImageUrl = uploadResult.url;
            api.sendMessage("🔎 Đang phân tích link Facebook qua API...", threadID);
            const fb = await getFbInfo(api, content);
            const commonFbData = {
                link: content,
                proofImage: permanentImageUrl
            };
            if (fb && fb.name) {
                item = { ...item, ...commonFbData, type: "facebook", uid: fb.uid, name: fb.name };
            } else {
                item = { ...item, ...commonFbData, type: "facebook-link" };
            }
        }
        data.items.push(item);
        writeData(data);
        if (item.type === "facebook" && item.name) {
            return api.sendMessage(`✅ Đã thêm FB:\n- Tên: ${item.name}\n- Link: ${item.link}\n- ID: #${item.id}\n(Đã lưu ảnh bằng chứng vĩnh viễn)`, threadID, messageID);
        } else if (item.type === "facebook-link") {
            return api.sendMessage(`✅ Đã thêm (FB Link):\n- Link: ${item.link}\n- ID: #${item.id}\n(Không lấy được tên, đã lưu ảnh bằng chứng vĩnh viễn)`, threadID, messageID);
        } else {
            return api.sendMessage(`✅ Đã thêm: ${content} (#${item.id})`, threadID, messageID);
        }
    }
    const createEntryText = (it) => { let text = ""; if (it.type === "facebook" && it.name) { text = `#${it.id} • Tên: ${it.name}\n  • Link: ${it.link}`; } else if (it.type === "facebook-link") { text = `#${it.id} • (FB Link) ${it.link}`; } else { return `#${it.id} • ${it.content}`; } if (it.proofImage) { text += `\n  • Bằng chứng: ${it.proofImage}`; } return text; };
    if (sub === "del") { const id = Number(args[1]); if (!id) return api.sendMessage("⚠️ Dùng: .listscam del <id>", threadID, messageID); const before = data.items.length; data.items = data.items.filter(it => it.id !== id); if (data.items.length < before) { data.items = data.items.map((it, idx) => ({ ...it, id: idx + 1 })); writeData(data); return api.sendMessage(`✅ Đã xoá mục có ID là ${id}.`, threadID, messageID); } else { return api.sendMessage(`⚠️ Không tìm thấy mục có ID là ${id}`, threadID, messageID); } }
    if (sub === "list" || sub === "ls") { const pageSize = 10; const page = Math.max(1, Number(args[1]) || 1); const start = (page - 1) * pageSize; const slice = data.items.slice(start, start + pageSize); if (!slice.length) return api.sendMessage("📭 Không có dữ liệu hoặc trang trống.", threadID, messageID); const totalPages = Math.ceil(data.items.length / pageSize); const text = slice.map(createEntryText).join("\n────────────\n"); return api.sendMessage(`📒 Danh sách scam (trang ${page}/${totalPages}, tổng ${data.items.length}):\n────────────\n${text}`, threadID, messageID); }
    if (sub === "find" || sub === "search") { const keyword = args.slice(1).join(" ").toLowerCase(); if (!keyword) return api.sendMessage("⚠️ Dùng: .listscam find <từ khóa>", threadID, messageID); const found = data.items.filter(it => (it.name && it.name.toLowerCase().includes(keyword)) || (it.link && it.link.toLowerCase().includes(keyword)) || (it.content && it.content.toLowerCase().includes(keyword))); if (!found.length) return api.sendMessage("🙅 Không có kết quả.", threadID, messageID); const text = found.map(createEntryText).join("\n────────────\n"); return api.sendMessage(`🔎 Kết quả (${found.length}):\n────────────\n${text}`, threadID, messageID); }
    return api.sendMessage("❓ Lệnh không hợp lệ. Dùng .listscam để xem hướng dẫn.", threadID, messageID);
};
