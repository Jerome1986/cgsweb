const { contextBridge } = require('electron')

// 在渲染进程中暴露 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 可以在这里暴露一些安全的 API
})
