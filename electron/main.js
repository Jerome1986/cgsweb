const { app, BrowserWindow, ipcMain, dialog, net, shell } = require('electron')
const { orderGetApi } = require('../src/api/payResult')
const fs = require('fs')
const path = require('path')

let win
function createWindow() {
  win = new BrowserWindow({
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
      scrollBounce: false // 禁用滚动反弹效果
    },
    // 自动隐藏菜单栏，用户可以按 Alt 键显示
    autoHideMenuBar: true,
    // 默认不显示菜单栏
    menuBarVisible: false
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

// 置顶
ipcMain.handle('toggle-on-top', (event, isOnTop) => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    win.setAlwaysOnTop(isOnTop)
    return isOnTop // 返回设置后的状态
  }
  return false // 当没有窗口时返回false
})

// 处理支付窗口逻辑
ipcMain.handle('open-payment-window', async (event, params) => {
  const paymentWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    },
    autoHideMenuBar: true,
    menuBarVisible: false
  })

  let isSuccessNotified = false // 标记
  await paymentWindow.loadURL(params.url)

  // 检测成功页面
  paymentWindow.webContents.on('did-finish-load', () => {
    const currentUrl = paymentWindow.webContents.getURL()
    if (
      currentUrl.startsWith('https://api.xunhupay.com/payments/home/success')
    ) {
      setTimeout(() => {
        paymentWindow.close()
        if (!isSuccessNotified) {
          isSuccessNotified = true
          event.sender.send('payment-result', 1) // 1=成功
        }
      }, 1000)
    }
  })

  // 窗口关闭事件（仅未成功时查询订单）
  paymentWindow.on('closed', async () => {
    if (!isSuccessNotified) {
      // 只有未成功才查询订单
      const orderRes = await orderGetApi(params.order_id)
      event.sender.send('payment-result', orderRes.data.data.status)
    }
  })

  return true
})

// 添加选择文件夹处理
ipcMain.handle('select-download-path', async () => {
  try {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: '选择下载路径',
      buttonLabel: '选择文件夹',
      defaultPath: app.getPath('downloads')
    })

    if (result.canceled) {
      return null
    }
    return result.filePaths[0]
  } catch (error) {
    console.error('Error in select-download-path:', error)
    throw error
  }
})

// 拼接下载路径
ipcMain.handle('join-paths', (event, downloadPath, fileName) => {
  // 安全校验（可选）：确保路径在合法目录下
  const userDownloads = app.getPath('downloads')
  if (!downloadPath.startsWith(userDownloads)) {
    throw new Error('下载路径必须在系统下载目录内')
  }

  // 拼接路径
  return path.join(downloadPath, fileName)
})

// 下载素材文件
ipcMain.handle(
  'download-file',
  async (event, url, basePath, category, fileName) => {
    // 1. 构建完整路径：基础路径/分类/文件名
    const fullDir = path.join(basePath, category) // 分类目录
    const fullPath = path.join(fullDir, fileName) // 最终文件路径

    // 2. 提前创建分类目录
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true })
    }

    return new Promise((resolve, reject) => {
      const request = net.request(url)
      request.on('response', (response) => {
        const fileStream = fs.createWriteStream(fullPath)
        let receivedBytes = 0
        const totalBytes = parseInt(response.headers['content-length'], 10) || 0

        response.on('data', (chunk) => {
          receivedBytes += chunk.length
          fileStream.write(chunk)
          event.sender.send('download-progress', {
            percent:
              totalBytes > 0
                ? ((receivedBytes / totalBytes) * 100).toFixed(2)
                : 0
          })
        })

        response.on('end', () => {
          fileStream.end()
          resolve(fullPath)
        })

        response.on('error', (error) => {
          fileStream.destroy()
          fs.unlink(fullPath, () => {})
          reject(new Error(`下载失败: ${error.message}`))
        })
      })

      request.on('error', (error) => {
        reject(new Error(`网络请求失败: ${error.message}`))
      })

      request.end()
    })
  }
)

// 下载成功后自动打开路径文件夹
ipcMain.handle('open-path', (_, path) => {
  return shell.openPath(path)
})

// 检查本地路径是否有素材文件
ipcMain.handle('checkFileExists', async (_, path) => {
  try {
    await fs.access(path, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
})

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
