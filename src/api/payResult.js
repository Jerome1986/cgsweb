// 前端代码 (src/api/api.js)
import { ipcRenderer } from 'electron'

export const orderGetApi = async (params) => {
  return await ipcRenderer.invoke('payResult-get', params)
}
