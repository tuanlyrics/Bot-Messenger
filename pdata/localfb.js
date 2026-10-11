const http = require('http');
const httpProxy = require('http-proxy');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs');
const zlib = require('zlib'); // Thư viện tích hợp sẵn của Node.js để giải nén

// --- Cấu hình ---
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const proxyUrl = config.socks5;
const agent = new SocksProxyAgent(proxyUrl);

const localHost = 'localhost:9001';
const remoteHost = 'www.facebook.com';
const remoteTarget = `https://${remoteHost}`;

// Tạo máy chủ proxy
// selfHandleResponse: true là tùy chọn quan trọng, cho phép chúng ta can thiệp vào phản hồi
const proxy = httpProxy.createProxyServer({ selfHandleResponse: true });

// Lắng nghe sự kiện 'proxyRes' để sửa đổi phản hồi từ Facebook
proxy.on('proxyRes', (proxyRes, req, res) => {
    // Xóa các header bảo mật cản trở việc hiển thị trang trong proxy
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];

    // Sửa đổi cookie để chúng hoạt động trên localhost
    if (proxyRes.headers['set-cookie']) {
        const newCookies = proxyRes.headers['set-cookie'].map(cookie => {
            return cookie.replace(`domain=.facebook.com`, `domain=localhost`);
        });
        proxyRes.headers['set-cookie'] = newCookies;
    }

    // Nếu Facebook gửi lệnh chuyển hướng (redirect), chúng ta sửa đổi nó
    if (proxyRes.headers['location']) {
        proxyRes.headers['location'] = proxyRes.headers['location'].replace(remoteTarget, `http://${localHost}`);
    }

    // Buffer để lưu trữ dữ liệu phản hồi
    const body = [];
    proxyRes.on('data', chunk => {
        body.push(chunk);
    });

    // Khi nhận xong toàn bộ phản hồi
    proxyRes.on('end', () => {
        const buffer = Buffer.concat(body);
        const encoding = proxyRes.headers['content-encoding'];

        // Hàm để viết lại nội dung và gửi về trình duyệt
        const rewriteAndSend = (decodedBody) => {
            // Thay thế tất cả các URL của Facebook bằng URL của localhost
            let newBody = decodedBody.toString('utf8');
            newBody = newBody.replace(new RegExp(`https://${remoteHost}`, 'g'), `http://${localHost}`);
            newBody = newBody.replace(new RegExp(remoteHost, 'g'), localHost); // Thay cả những chỗ không có https

            // Gửi các header đã được sửa đổi
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            // Gửi nội dung đã được sửa đổi
            res.end(newBody);
        };

        // Giải nén nội dung nếu cần (thường là gzip)
        if (encoding === 'gzip') {
            zlib.gunzip(buffer, (err, decoded) => {
                if (!err) rewriteAndSend(decoded);
            });
        } else if (encoding === 'deflate') {
            zlib.inflate(buffer, (err, decoded) => {
                if (!err) rewriteAndSend(decoded);
            });
        } else {
            // Nếu không bị nén, xử lý trực tiếp
            rewriteAndSend(buffer);
        }
    });
});

const server = http.createServer((req, res) => {
    // Sửa đổi Host header để Facebook nghĩ rằng yêu cầu đến từ chính nó
    req.headers.host = remoteHost;

    proxy.web(req, res, {
        target: remoteTarget,
        agent: agent,
        changeOrigin: true,
        secure: true // Sử dụng HTTPS
    });
});

// Chạy máy chủ
const PORT = 9001;
server.listen(PORT, () => {
    console.log(`🚀 Máy chủ proxy viết lại nội dung đang chạy tại http://localhost:${PORT}`);
    console.log('Cảnh báo: Các tính năng của Facebook có thể hoạt động không ổn định.');
});