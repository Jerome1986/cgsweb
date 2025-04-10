const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOnTop: (isOnTop) => ipcRenderer.invoke('toggle-on-top', isOnTop),
  selectDownloadPath: () => ipcRenderer.invoke('select-download-path'),
  joinPaths: (downloadPath, fileName, pathName) =>
    ipcRenderer.invoke('join-paths', downloadPath, fileName, pathName),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  downloadFile: (url, savePath, category, fileName) =>
    ipcRenderer.invoke('download-file', url, savePath, category, fileName),
  openDownloadFolder: (path) => shell.openPath(path),
  // 检查路径是否存在
  checkFileExists: (path) => ipcRenderer.invoke('checkFileExists', path),
  // 新增进度监听方法
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => {
      // 安全地将进度传递给渲染进程
      callback(progress)
    })
  },

  // 移除监听器（避免内存泄漏）
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners('download-progress')
  },
  getWindowState: () => ipcRenderer.invoke('get-window-top-state'),
  openPaymentWindow: (params) =>
    ipcRenderer.invoke('open-payment-window', params),
  onPaymentResult: (callback) => {
    ipcRenderer.on('payment-result', (event, status) => callback(status))
  },
  removePaymentResult: (callback) => {
    ipcRenderer.removeListener('payment-result', callback)
  }
})
