module.exports.config = {
    name: 'file',
    version: '1.1.2',
    hasPermssion: 3,
    credits: 'Niio-team (DC-Nam) (Pcoder)',
    description: 'xem item trong folder, xóa, xem file (TỐC ĐỘ CAO, KHÔNG ĐẾM SIZE FOLDER)',
    commandCategory: 'Admin',
    usePrefix: true,
    usages: '[đường dẫn]',
    cooldowns: 0,
};
const fs = require('fs');
const {
    readFileSync,
    readdirSync,
    statSync,
    unlinkSync,
    rmdirSync,
    createReadStream,
    createWriteStream,
    copyFileSync,
    existsSync,
    renameSync,
    mkdirSync,
    writeFileSync,
} = fs;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const archiver = require('archiver');

module.exports.run = function({ api, event, args }) {
    openFolder(api, event, path.resolve(process.cwd(), args[0] ? args[0] : ''));
};

module.exports.handleReply = async function({ handleReply: $, api, event }) {
    try {
        if (!global.config.ADMINBOT.includes(event.senderID)) return;
        let d = $.data[event.args[1]-1];
        let action = event.args[0].toLowerCase();

        if (!['create'].includes(action)) if (!d && event.args[0]) return api.sendMessage('⚠️ Not found index file', event.threadID, event.messageID);

        switch (action) {
            case 'open':
                if (d.info.isDirectory()) openFolder(api, event, d.dest);
                else api.sendMessage('⚠️ Path not a directory', event.threadID, event.messageID);
                break;
            case 'del': {
                let arrFile = [], fo, fi;
                for (const i of event.args.slice(1)) {
                    const { dest, info } = $.data[i-1];
                    const ext = path.basename(dest);
                    if (info.isFile()) {
                        unlinkSync(dest); fi = 'file';
                    } else if (info.isDirectory()) {
                        rmdirSync(dest, { recursive: true }); fo = 'folder';
                    }
                    arrFile.push(i+'. '+ext);
                }
                api.sendMessage(`✅ Đã xóa những ${!!fo && !!fi ? `${fo}. ${fi}`: !!fo?fo: !!fi?fi: null}:\n\n${arrFile.join('\n')}`, event.threadID, event.messageID);
            }; break;
            case 'send':
                bin(readFileSync(d.dest, 'utf8')).then(link => api.sendMessage(link, event.threadID, event.messageID));
                break;
            case 'view': {
                let p = d.dest;
                let t;
                if (/\.js$/.test(p)) copyFileSync(p, t = p.replace('.js', '.txt'));
                api.sendMessage({ attachment: createReadStream(t || p), }, event.threadID, _=>t && unlinkSync(t), event.messageID);
            }; break;
            case "create": {
                let t;
                fs[(['mkdirSync', 'writeFileSync'][t = /\/$/.test(event.args[1])?0: 1])]($.directory+event.args[1], [, event.args.slice(2).join(' ')][t]);
                api.sendMessage(`✅ Đã tạo ${['folder', 'file'][t]} path: ${event.args[1]}`, event.threadID, event.messageID);
            }; break;
            case 'copy':
                copyFileSync(d.dest, d.dest.replace(/(\.[^./]+)?$/, (m) => ` (COPY)${m||''}`));
                api.sendMessage('Done', event.threadID, event.messageID);
                break;
            case 'rename': {
                let new_path = event.args[2];
                if (!new_path) return api.sendMessage('❎ Chưa nhập đường dẫn mới', event.threadID, event.messageID);
                renameSync(d.dest, path.join(path.dirname(d.dest), new_path));
                api.sendMessage('Done', event.threadID, event.messageID);
            }; break;
            case 'zip':
                catbox(await zip($.data.filter((e,i)=>event.args.slice(1).includes(String(i+1))).map(e=>e.dest))).then(link=>api.sendMessage(link, event.threadID, event.messageID));
                break;
            default:
                api.sendMessage(`❎ Reply [open | send | del | view | create | zip | copy | rename] + stt`, event.threadID, event.messageID);
        }
    } catch(e) {
        console.error(e);
        api.sendMessage(e.toString(), event.threadID, event.messageID);
    }
};

function convertBytes(bytes) {
    let sizes = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ];
    if (bytes == 0) return '0 Byte';
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// TỐC ĐỘ CAO: KHÔNG ĐỆ QUY TÍNH SIZE FOLDER
function openFolder(a, b, c) {
    let items;
    try { items = readdirSync(c); } catch { a.sendMessage("❎ Không thể truy cập folder!", b.threadID, b.messageID); return; }
    let folders = [], files = [], txt = '', count = 0, array = [];
    for (const name of items) {
        const dest = path.join(c, name);
        let info;
        try { info = statSync(dest); } catch { continue; }
        if (info.isFile())
            files.push({ name, size: convertBytes(info.size), dest, info });
        else if (info.isDirectory())
            folders.push({ name, size: '<DIR>', dest, info });
    }
    folders.sort((a,b)=>a.name.localeCompare(b.name));
    files.sort((a,b)=>a.name.localeCompare(b.name));
    let list = [...folders, ...files];
    for (const i of list) {
        txt += `${++count}. ${i.info.isFile() ? '📄' : '🗂️'} - ${i.name} (${i.size})\n`;
        array.push({ dest: i.dest, info: i.info });
    }
    txt += `\nReply [open | send | del | view | create | zip | copy | rename] + stt`;
    a.sendMessage(txt, b.threadID, (err, data) => global.client.handleReply.push({
        name: exports.config.name,
        messageID: data.messageID, author: b.senderID,
        data: array,
        directory: c.endsWith('/') ? c : c+'/',
    }), b.messageID);
}

async function catbox(stream) {
    let formdata = new FormData;
    formdata.append('reqtype', 'fileupload');
    formdata.append('fileToUpload', stream);
    let link = (await axios({
        method: 'POST',
        url: 'https://catbox.moe/user/api.php',
        headers: formdata.getHeaders(),
        data: formdata,
        responseType: 'text',
    })).data;
    return link;
}

function zip(source_paths, output_path) {
    let archive = archiver('zip', { zlib: { level: 9, }, });
    if (output_path) {
        var output = createWriteStream(output_path);
        archive.pipe(output);
    }
    source_paths.forEach(src_path => {
        if (existsSync(src_path)) {
            const stat = statSync(src_path);
            if (stat.isFile()) archive.file(src_path, { name: path.basename(src_path) });
            else if (stat.isDirectory()) archive.directory(src_path, path.basename(src_path));
        }
    });
    archive.finalize();
    return output_path ? new Promise((resolve, reject)=> {
        output.on('close', _=>resolve(output));
        archive.on('error', reject);
    }) : archive;
}

function bin(text) {
    // Lưu nhanh file text lên mocky.io
    return axios({
        method: 'POST',
        url: 'https://api.mocky.io/api/mock',
        data: {
            "status": 200,
            "content": text,
            "content_type": "text/plain",
            "charset": "UTF-8",
            "secret": "LeMinhTien",
            "expiration": "never"
        },
    }).then(r=>r.data.link);
}