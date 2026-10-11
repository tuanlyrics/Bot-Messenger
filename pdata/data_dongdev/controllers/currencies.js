module.exports = function ({ models }) {
  const Currencies = models.use('Currencies');

  // Helper: Đảm bảo object user có đủ cấu trúc data.money là string
  function normalizeUser(user) {
    if (!user.data) user.data = {};
    if (typeof user.data.money !== "string") user.data.money = String(user.data.money || "0");
    if (typeof user.money === "undefined" || user.money === null) {
      user.money = BigInt(user.data.money);
    } else if (typeof user.money !== "bigint") {
      user.money = BigInt(user.money);
    }
    return user;
  }

  /**
   * Lấy toàn bộ user tiền tệ, có thể truyền where, attributes (dạng object, array)
   * getAll({ where }, [attributes, ...])
   */
  async function getAll(...args) {
    let where = undefined, attributes = undefined;
    for (const arg of args) {
      if (Array.isArray(arg)) attributes = arg;
      else if (typeof arg === "object") where = arg;
    }
    try {
      const users = await Currencies.findAll({ where, attributes });
      return users.map(e => normalizeUser(e.get({ plain: true })));
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  /**
   * Lấy thông tin user theo userID
   */
  async function getData(userID) {
    try {
      const data = await Currencies.findOne({ where: { userID } });
      if (!data) return false;
      return normalizeUser(data.get({ plain: true }));
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  /**
   * Set/Update thông tin user
   */
  async function setData(userID, options = {}) {
    if (typeof options !== 'object' || Array.isArray(options)) throw global.getText("currencies", "needObject");
    try {
      if (options.money !== undefined) {
        // Lấy data hiện tại nếu có để đảm bảo update đúng
        const oldData = await getData(userID);
        if (!oldData) throw new Error("User not found");
        options.data = { ...(oldData.data || {}), money: String(options.money) };
      }
      const instance = await Currencies.findOne({ where: { userID } });
      if (!instance) throw new Error("User not found");
      await instance.update(options);
      return true;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  /**
   * Xóa user khỏi database
   */
  async function delData(userID) {
    try {
      const instance = await Currencies.findOne({ where: { userID } });
      if (!instance) throw new Error("User not found");
      await instance.destroy();
      return true;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  /**
   * Tạo mới user trong database
   */
  async function createData(userID, defaults = {}) {
    if (typeof defaults !== 'object' || Array.isArray(defaults)) throw global.getText("currencies", "needObject");
    try {
      await Currencies.findOrCreate({ where: { userID }, defaults });
      return true;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  /**
   * Tăng tiền cho user
   */
  async function increaseMoney(userID, money) {
    if (typeof money !== 'number' && typeof money !== 'string') {
      throw global.getText("currencies", "needNumber");
    }
    try {
      const user = await getData(userID);
      if (!user) throw new Error("User not found");
      const newMoney = BigInt(user.money) + BigInt(money);
      await setData(userID, { money: newMoney.toString() });
      return true;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  /**
   * Giảm tiền của user
   */
  async function decreaseMoney(userID, money) {
    if (typeof money !== 'number' && typeof money !== 'string') {
      throw global.getText("currencies", "needNumber");
    }
    try {
      const user = await getData(userID);
      if (!user) throw new Error("User not found");
      const newMoney = BigInt(user.money) - BigInt(money);
      await setData(userID, { money: newMoney.toString() });
      return true;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  return {
    getAll,
    getData,
    setData,
    delData,
    createData,
    increaseMoney,
    decreaseMoney
  };
};