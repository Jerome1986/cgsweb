/**
 * 生成指定长度的随机验证码
 * @param {number} length - 验证码长度，默认为4
 * @returns {string} 生成的验证码
 */

export const generateCaptchaCode = (length = 4) => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
