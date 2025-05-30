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
  },
  // 添加获取目录中文件的方法
  getFilesInDirectory: (dirPath, namePattern) => 
    ipcRenderer.invoke('get-files-in-directory', dirPath, namePattern),
  
  // 添加窗口最小化方法
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  // 添加窗口恢复方法
  restoreWindow: () => ipcRenderer.invoke('restore-window'),

  // 添加拖拽最小化方法
  enableDragMinimize: () => ipcRenderer.invoke('enable-drag-minimize'),

  // 添加原生文件拖拽方法
  startFileDrag: (filePath) => ipcRenderer.send('ondragstart', filePath)
})
