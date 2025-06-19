import request from '@/utils/request'

/**
 * 请求当前类型下的所有素材
 * @param {number} pagesNum - 当前页码
 * @param {number} pagesSize - 当前页条数
 * @param {string} materialType - 当前素材所属类型
 * @returns {Promise<resultModel>} - 返回一个Promise，resolve为data下的list为素材信息
 */
export const materialAllGet = (pagesNum, pagesSize, materialType) => {
  return request.get('/material-get', {
    params: { pagesNum, pagesSize, materialType }
  })
}

/**
 * 根据标签获取素材
 * /material-tags-get
 * @param {string} tag - 标签值
 * @param {number} pagesNum - 当前页码
 * @param {number} pagesSize - 当前页条数
 * @returns {Promise<resultModel>} - 返回一个Promise，resolve为data下的list为素材信息
 */

export const tagGetMaterial = (tag, pagesNum, pagesSize) => {
  return request.get('/material-tags-get', {
    params: { tag, pagesNum, pagesSize }
  })
}

/**
 * 搜索查询素材
 * @param {string} searchValue - 搜索值
 * @param {number} pagesNum - 当前页码
 * @param {number} pagesSize - 当前页条数
 * @param {string} materialType - 素材所属类型
 * @returns {Promise<resultModel>} - 返回一个Promise，resolve为data为内容信息
 */

export const searchMaterial = (searchValue, pagesNum, pagesSize, materialType) => {
  return request.post('/material-search', {
    searchValue,
    pagesNum,
    pagesSize,
    materialType
  })
}
