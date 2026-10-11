const path = require('path');
const LOGO_STORAGE_PATH = path.join(__dirname, 'logos');
const LOGO_TIMESTAMPS_PATH = path.join("/root/filebot2/test/cc/pdata", 'logo_timestamps.json');

module.exports = {
    LOGO_STORAGE_PATH,
    LOGO_TIMESTAMPS_PATH
};