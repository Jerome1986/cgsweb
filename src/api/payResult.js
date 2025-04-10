// src/api/orderApi.js
const request = require('axios')

const orderGetApi = (order_id) => {
  return request.get('https://etnrve3alw.gzg.sealos.run/order-get', {
    params: { order_id }
  })
}

// CommonJS 导出
module.exports = { orderGetApi }
