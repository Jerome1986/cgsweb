const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    // 窗口最小宽度，防止内容挤压变形
    minWidth: 950,
    // 窗口最小高度
    minHeight: 600,
    webPreferences: {
      // 预加载脚本，用于在渲染进程中安全地暴露主进程功能
      preload: path.join(__dirname, 'preload.js'),
      // 开启上下文隔离，提高安全性，防止恶意脚本访问 Node.js API
      contextIsolation: true,
      // 禁用 Node.js 集成，提高安全性
      nodeIntegration: false,
    },
    // 自动隐藏菜单栏，用户可以按 Alt 键显示
    autoHideMenuBar: true,
    // 默认不显示菜单栏
    menuBarVisible: false,
  })

  // 根据环境变量判断加载开发服务器还是生产文件
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：加载 Vite 开发服务器地址
    win.loadURL('http://localhost:5173')
    // 自动打开开发者工具
    win.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的 index.html 文件
    const indexPath = path.join(__dirname, '../dist/index.html')
    win.loadFile(indexPath)
  }
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
  createWindow()

  // macOS 应用程序激活时，如果没有窗口则创建新窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户使用 Cmd + Q 退出
  // 否则保持应用程序活动状态
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
