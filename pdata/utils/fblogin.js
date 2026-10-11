// pdata/utils/fblogin.js
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const qs = require('qs');
const speakeasy = require('speakeasy');
const fs = require('fs');
const path = require('path');
const logger = require('./log.js');

const getFrom = (html, start, end) => {
    const startIdx = html.indexOf(start);
    if (startIdx === -1) return '';
    const endIdx = html.indexOf(end, startIdx + start.length);
    if (endIdx === -1) return '';
    return html.substring(startIdx + start.length, endIdx);
};

class FacebookLogin {
    static async _bypassAutomationWarning(appState) {
        try {
            logger.Normal("Đang kiểm tra checkpoint cảnh báo tự động...");

            const c_user = (appState.find(c => c.key === "c_user") || {}).value;
            if (!c_user) {
                logger.Warning("Không tìm thấy ID người dùng trong appState để kiểm tra cảnh báo.");
                return;
            }

            const cookie = appState.map(c => `${c.key}=${c.value}`).join('; ');
            const headers = { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0' };
            const { data: html, request } = await global.axios.get('https://www.facebook.com/', { headers });
            
            const isWarningCheckpoint = request.res.responseUrl.includes('601051028565049');

            if (isWarningCheckpoint) {
                logger.Warning("Phát hiện cảnh báo tự động! Đang cố gắng vượt qua...");

                const fb_dtsg = getFrom(html, '["DTSGInitialData",[],{"token":"', '"}');
                const jazoest = getFrom(html, 'jazoest=', '"');
                const lsd = getFrom(html, '["LSD",[],{"token":"', '"}');

                if (!fb_dtsg || !jazoest) {
                    logger.Error("Không thể lấy đủ token cần thiết để vượt checkpoint.");
                    return;
                }

                const formBypass = {
                    av: c_user, fb_dtsg, jazoest, lsd,
                    fb_api_caller_class: "RelayModern",
                    fb_api_req_friendly_name: "FBScrapingWarningMutation",
                    variables: JSON.stringify({}),
                    server_timestamps: true,
                    doc_id: "6339492849481770"
                };

                const { data: bypassResult } = await global.axios.post("https://www.facebook.com/api/graphql/", qs.stringify(formBypass), { headers });

                if (bypassResult.data?.fb_scraping_warning_clear?.success) {
                    logger.Success("Đã vượt qua cảnh báo tự động thành công.");
                } else {
                    logger.Error("Vượt checkpoint thất bại. Phản hồi không thành công.");
                }
            } else {
                logger.Normal("Không phát hiện cảnh báo tự động.");
            }
        } catch (error) {
            logger.Error("Đã xảy ra lỗi trong quá trình kiểm tra checkpoint:", error.message);
        }
    }

    static async login() {
        const { email, password, twoFAKey } = global.config.account;

        if (!email || !password) {
            return { status: false, message: 'Thiếu email hoặc mật khẩu trong config.json' };
        }

        logger.Normal("Bắt đầu tiến trình đăng nhập Facebook bằng tài khoản...");

        const adid = uuidv4();
        const device_id = uuidv4();
        const family_device_id = uuidv4();
        const machine_id = [...Array(24)].map(() => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

        let loginData = {
            adid, email, password, device_id, family_device_id,
            locale: 'en_US',
            credentials_type: 'password',
            generate_session_cookies: '1',
            source: 'login',
            machine_id,
            fb_api_caller_class: 'com.facebook.account.login.protocol.Fb4aAuthHandler',
            api_key: '882a8490361da98702bf97a021ddc14d',
            access_token: '350685531728|62f8ce9f74b12f84c123cc23437a4a32'
        };

        const sig = Object.entries(Object.fromEntries(Object.entries(loginData).sort())).map(([k, v]) => `${k}=${v}`).join('');
        loginData.sig = crypto.createHash('md5').update(sig + loginData.access_token).digest('hex');

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 12; SM-G988N Build/SP1A.210812.016; com.termux)',
            'x-fb-http-engine': 'Liger',
            'x-fb-friendly-name': 'authenticate'
        };

        try {
            logger.Normal("Đang gửi yêu cầu đăng nhập lần đầu...");
            const res = await global.axios.post('https://b-graph.facebook.com/auth/login', qs.stringify(loginData), { headers });

            const cookies = res.data.session_cookies;
            const appState = cookies.map(c => ({ key: c.name, value: c.value, domain: 'facebook.com', path: c.path, expires: c.expires, httpOnly: c.secure, secure: c.secure }));
            await this._bypassAutomationWarning(appState);
            return { status: true, appState };

        } catch (err) {
            const errorData = err.response?.data?.error?.error_data;

            if (!errorData || !twoFAKey) {
                logger.Error("Đăng nhập thất bại. Vui lòng kiểm tra email, password hoặc cung cấp mã 2FA trong config.json.");
                return { status: false, message: 'Thông tin đăng nhập sai hoặc thiếu mã 2FA.' };
            }

            const totpCode = speakeasy.totp({ secret: twoFAKey.replace(/\s+/g, '').toUpperCase(), encoding: 'base32' });
            logger.Normal(`Đã tạo mã 2FA: ${totpCode}. Gửi lại yêu cầu...`);

            const twoFactorData = {
                ...loginData,
                credentials_type: 'two_factor',
                twofactor_code: totpCode,
                userid: errorData.uid,
                machine_id: errorData.machine_id,
                first_factor: errorData.login_first_factor
            };
            const sig2 = Object.entries(Object.fromEntries(Object.entries(twoFactorData).sort())).map(([k, v]) => `${k}=${v}`).join('');
            twoFactorData.sig = crypto.createHash('md5').update(sig2 + loginData.access_token).digest('hex');

            try {
                const twoFARes = await global.axios.post('https://b-graph.facebook.com/auth/login', qs.stringify(twoFactorData), { headers });
                const cookies = twoFARes.data.session_cookies;
                const appState = cookies.map(c => ({ key: c.name, value: c.value, domain: 'facebook.com', path: c.path, expires: c.expires, httpOnly: c.secure, secure: c.secure }));
                await this._bypassAutomationWarning(appState);
                return { status: true, appState };

            } catch (err2) {
                logger.Error("Đăng nhập với 2FA thất bại.", err2.response?.data || err2.message);
                return { status: false, message: 'Đăng nhập với 2FA thất bại.' };
            }
        }
    }
}

module.exports = FacebookLogin;