/**
 * @typedef {Object} orderModel - 订单信息对象
 * @property {string} _id - 当前订单id
 * @property {string} user_id - 当前订单的归属用户id
 * @property {string} order_id - 平台订单id
 * @property {string} product_id - 订单对应的产品id
 * @property {number} amount - 支付金额
 * @property {number} status - 订单状态 0 未支付 1 已支付 2 已取消 3 已完成
 * @property {number} create_date - 订单创建时间
 * @property {string} recharge_type - 订单的类型  金币充值 购买会员
 * @property {string} payment_id - 支付接口返回的第三方订单id
 * @property {string} updated_at - 更新时间
 */

/**
 * @typedef {Object} currentCoinsOrderModel 当前金币订单信息
 * @property {string} pay_order_type - 当前支付的订单类型
 * @property {number} pay_order_amount - 当前充值的金币数量
 */

/**
 * @typedef {Object} currentVipOrderModel 当前金币订单信息
 * @property {string} pay_order_type - 当前支付的订单类型
 * @property {string} membershipType - 当前充值的会员类型
 * @property {number} dailyDownloadLimit - 当前会员每日下载次数
 */
