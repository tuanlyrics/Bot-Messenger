module.exports.config = {
    name: "createThreadOnJoin",
    eventType: ["log:subscribe"],
    version: "1.0.0",
    credits: "Diagnostic",
    description: "Tạo dữ liệu cho nhóm mới khi bot được thêm vào."
};

module.exports.run = async function({ event, api, Threads }) {
    const { threadID } = event;
    try {
        // Chỉ thực hiện khi bot được thêm vào nhóm
        if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
            let threadData = await Threads.getData(threadID);
            if (!threadData) {
                console.log(`[DATA] Phát hiện nhóm mới (${threadID}), đang tạo dữ liệu...`);
                await Threads.createData(threadID);
                console.log(`[DATA] Đã tạo dữ liệu thành công cho nhóm ${threadID}.`);
            }
        }
    } catch (e) {
        console.error(`[DATA] Lỗi nghiêm trọng khi tạo dữ liệu cho nhóm mới:`, e);
    }
}