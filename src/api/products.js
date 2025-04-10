import request from '@/utils/request'

/**
 * 获取产品列表
 * @param {string} productType
 * @return {Promise<resultModel>} 返回一个Promise，resolve为data为产品信息
 */
export const productsGetApi = (productType) => {
  return request.get('/products-get', { params: { productType } })
}
