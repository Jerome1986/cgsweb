import request from '@/utils/request'

/**
 * 根据页面类型获取一级分类
 * /cate-first
 * @param {string} pageType - 页面类型
 */
export const cateFirstGetApi = (pageType) => {
  return request.get('/cate-first', { params: { pageType } })
}

/**
 * 根据一级分类id获取二级分类
 * /cate-sub
 * @param {string} cateId - 一级分类id
 */

export const cateSubGetApi = (cateId) => {
  return request.get('/cate-sub', { params: { cateId } })
}
