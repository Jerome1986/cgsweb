import request from '@/utils/request'

/**
 * 支付并创建订单
 * @param {string} user_id - 当前支付的用户id
 * @param {string} product_id - 当前支付的产品id
 */

export const payOrderApi = (user_id, product_id) => {
  return request.post('/order-add', { user_id, product_id })
}

/**
 * 支付成功后更新用户的金币数量
 * @param {string} user_id - 当前用户id
 * @param {string} order_type - 当前订单类型
 * @param {number} pay_order_amount - 当前订单购买的金币数量
 * @returns {Promise<resultModel>}  - 返回更新状态
 */

export const userUpdateCoins = (user_id, order_type, pay_order_amount) => {
  return request.put('/user-pay-update', {
    user_id,
    order_type,
    pay_order_amount
  })
}

/**
 * 支付成功后更新用户会员信息
 * @param {string} user_id - 当前用户id
 * @param {string} order_type - 当前订单类型
 * @param {string} membershipType - 用户会员类型 年会员 永久会员
 * @param {number} dailyDownloadLimit - 每日下载次数上限
 * @return {Promise<resultModel>} 返回更新状态
 */

export const orderUpdateVip = (
  user_id,
  order_type,
  membershipType,
  dailyDownloadLimit
) => {
  return request.put('/user-pay-update', {
    user_id,
    order_type,
    membershipType,
    dailyDownloadLimit
  })
}
