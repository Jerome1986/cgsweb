import request from '@/utils/request'

/**
 * 根据页面类型或者分类来请求素材
 * /material-byCateId-get
 * @param {string} pageType - 页面类型
 * @param {string} cate_id - 分类id
 * @param {number} pagesNum - 当前页码
 * @param {number} pagesSize - 当前页条数
 */
export const materialByCateIdGetApi = (pageType, cate_id, pagesNum, pagesSize) => {
  return request.get('/material-byCateId-get', {
    params: { pageType, cate_id, pagesNum, pagesSize }
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
 * /material-searchWeb
 * @param {string} cate_id - 分类id
 * @param {string} pagesType - 页面类型
 * @param {string} currentTag - 属性标签
 * @param {string} currentColor - 颜色标签
 * @param {string} searchVal - 搜索值
 * @param {number} pageNum - 当前页码
 * @param {number} pageSize - 当前页条数
 */

export const searchMaterial = (
  cate_id,
  pagesType,
  currentTag = '',
  currentColor = '',
  searchVal,
  pageNum = 1,
  pageSize = 20
) => {
  return request.post('/material-searchWeb', {
    cate_id,
    pagesType,
    currentTag,
    currentColor,
    searchVal,
    pageNum,
    pageSize
  })
}

/**
 * 联合筛选素材
 * /filterMaterial
 * @param {string} pagesType - 当前页面类型
 * @param {string} cateId - 分类id
 * @param {string} tag - 标签值
 * @param {string} color - 颜色标签
 * @param {number} pageNum - 当前页码
 * @param {number} pageSize - 当前页条数
 */

export const filterMaterialApi = (pagesType, cateId, tag, color, pageNum, pageSize) => {
  return request.get('/filterMaterial', { params: { pagesType, cateId, tag, color, pageNum, pageSize } })
}

/**
 * 收藏和下载的筛选
 * /bothFilterMaterial
 */

export const bothFilterMaterialApi = (loveIds = '', downIds = '', pagesType, cateId, tag, color, pageNum, pageSize) => {
  return request.get('/bothFilterMaterial', {
    params: {
      loveIds,
      downIds,
      pagesType,
      cateId,
      tag,
      color,
      pageNum,
      pageSize
    }
  })
}
