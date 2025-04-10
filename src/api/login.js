import request from '@/utils/request'

/**
 * 注册
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @return {Promise<resultModel>} - 返回一个Promise，resolve为用户id和用户名
 */

export const register = (username, password) => {
  return request.post('/user-register', { username, password })
}

/**
 * 登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @return {Promise<resultModel>} - 返回一个Promise，resolve为用户信息
 */

export const login = (username, password) => {
  return request.post('/user-login', { username, password })
}
