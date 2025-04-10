import request from '@/utils/request'

/**
 * 获取所有产品列表
 * @return {Promise<resultModel>} 返回一个Promise，resolve为data下的list为分类信息
 */
export const cateDataGetAll = () => {
  return request.get('/cate-get')
}
