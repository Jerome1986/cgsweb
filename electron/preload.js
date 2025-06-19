const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOnTop: (isOnTop) => ipcRenderer.invoke('toggle-on-top', isOnTop),
  selectDownloadPath: () => ipcRenderer.invoke('select-download-path'),
  joinPaths: (downloadPath, fileName, pathName) => ipcRenderer.invoke('join-paths', downloadPath, fileName, pathName),
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
  openPaymentWindow: (params) => ipcRenderer.invoke('open-payment-window', params),
  onPaymentResult: (callback) => {
    ipcRenderer.on('payment-result', (event, status) => callback(status))
  },
  removePaymentResult: (callback) => {
    ipcRenderer.removeListener('payment-result', callback)
  },
  // 添加获取目录中文件的方法
  getFilesInDirectory: (dirPath, namePattern) => ipcRenderer.invoke('get-files-in-directory', dirPath, namePattern),

  // 添加原生文件拖拽方法
  startFileDrag: (filePath, fileType = 'model') => ipcRenderer.send('ondragstart', filePath, fileType),

  // 添加解压功能
  extractArchive: async (archivePath) => {
    try {
      const result = await ipcRenderer.invoke('extract-archive', archivePath)
      console.log('解压结果:', result)
      return result // 直接返回路径
    } catch (error) {
      console.error('解压出错:', error)
      throw error
    }
  },

  // 在 electronAPI 对象中添加获取子目录的方法
  getSubDirectories: (dirPath) => ipcRenderer.invoke('get-sub-directories', dirPath),

  // 添加获取.max文件路径的方法
  getMaxFilePath: (dirPath) => ipcRenderer.invoke('get-max-file-path', dirPath),

  // 添加获取特定类型文件路径的方法
  getSpecificFilePath: (dirPath, fileType) => ipcRenderer.invoke('get-specific-file-path', dirPath, fileType),

  // 添加准备下载路径的方法
  prepareDownloadPath: (basePath, category) => ipcRenderer.invoke('prepare-download-path', basePath, category),

  // 添加删除文件的功能
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // 添加写入路径到文件的功能
  writePathToFile: (filePath, txtFileName) => ipcRenderer.invoke('write-path-to-file', filePath, txtFileName),

  // 添加获取资源路径的方法
  getResourcesPath: () => ipcRenderer.invoke('get-resources-path'),

  // 添加拖拽准备方法
  prepareDragAndDrop: (basePath, fileType) => ipcRenderer.invoke('prepare-drag-and-drop', basePath, fileType),

  // 添加监听拖拽开始事件
  onStartFileDrag: (callback) => {
    ipcRenderer.on('start-file-drag', (_, scriptPath, fileType) => {
      callback(scriptPath, fileType)
    })
  },

  // 移除监听器
  removeStartFileDragListener: () => {
    ipcRenderer.removeAllListeners('start-file-drag')
  },

  // 添加准备并启动拖拽的方法
  prepareAndStartDrag: (basePath, fileType, txtFile) =>
    ipcRenderer.invoke('prepare-and-start-drag', basePath, fileType, txtFile)
})
