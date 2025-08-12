import request from '@/utils/request'

/**
 * 获取水印
 * /watermark-randomGet
 */

export const watermarkGetApi = () => {
  return request.get('/watermark-randomGet')
}
