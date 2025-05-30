const https = require('https')

const orderGetApi = (order_id) => {
  return new Promise((resolve, reject) => {
    const apiUrl = new URL(`https://etnrve3alw.gzg.sealos.run/order-get?order_id=${order_id}`)
    
    const options = {
      hostname: apiUrl.hostname,
      path: apiUrl.pathname + apiUrl.search,
      method: 'GET'
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ data: jsonData })
        } catch (error) {
          reject(new Error('Failed to parse response: ' + error.message))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.end()
  })
}

module.exports = { orderGetApi }
