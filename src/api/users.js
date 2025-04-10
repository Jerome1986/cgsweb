import request from '@/utils/request'

/**
 * 将素材添加到下载列表 - 本机有
 * @param {string} user_id - 当前用户id
 * @param {string} material_id - 添加到下载列表的素材id
 * @returns {Promise<resultModel>} 返回data为内容体，code 200为成功
 */

export const userDownLoadListAdd = (user_id, material_id) => {
  return request.post('user-add-download', { user_id, material_id })
}

/**
 * 获取用户的下载列表 - 本机有
 * @param {string} user_id - 当前用户id
 * @returns {Promise<{
 *   code: number,
 *   message: string,
 *   data: downloadListModel[]
 * }>} 返回data为内容体，code 200为成功
 */

export const userDownLoadListGet = (user_id) => {
  return request.get('/user-downloadList-get', { params: { user_id } })
}

/**
 * 将素材添加到用户的收藏列表
 * /user-loveList-add
 * @param {string} user_id - 当前用户id
 * @param {string} material_id - 素材id
 * @returns {Promise<resultModel>} 返回data为内容体，code 200为成功
 */

export const userLoveListAdd = (user_id, material_id) => {
  return request.post('/user-loveList-add', { user_id, material_id })
}

/**
 * 获取当前用户的收藏列表
 * /user-loveList-get
 * @param {string} user_id - 当前用户id
 * @returns {Promise<{
 *   code: number,
 *   message: string,
 *   data: loveListModel[]
 * }>} 返回data为内容体，code 200为成功
 */

export const userLoveListGet = (user_id) => {
  return request.get('/user-loveList-get', { params: { user_id } })
}

/**
 * 用户下载后更新用户金币数量
 * @param {string} user_id - 当前更新的用户
 * @param {string} material_id - 当前操作的素材id
 * @returns {Promise<resultModel>} 返回data为内容体，code 200为成功
 */

export const useCoins = (user_id, material_id) => {
  return request.put('/user-webCoins-update', { user_id, material_id })
}
