const { app, BrowserWindow, ipcMain, dialog, net, shell } = require('electron')
const { orderGetApi } = require('./api/payResult')
const fs = require('fs')
const path = require('path')
const extract = require('extract-zip') // 用于ZIP文件
const Seven = require('node-7z') // 用于7z、rar等格式，需要安装: npm install node-7z
const sevenBin = require('7zip-bin') // 7zip二进制文件，需要安装: npm install 7zip-bin
const os = require('os')

let win
function createWindow() {
  win = new BrowserWindow({
    // 窗口最小宽度，防止内容挤压变形
    minWidth: 950,
    // 窗口最小高度
    minHeight: 600,
    minimizable: true,
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

// 获取7zip路径
const sevenZipPath = sevenBin.path7za

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

  let isSuccessNotified = false
  let isWindowClosed = false

  // 监听导航事件
  paymentWindow.webContents.on('did-navigate', (_, url) => {
    if (isWindowClosed) return // 如果窗口已关闭，不执行后续代码

    console.log('导航到:', url)
    if (url.startsWith('https://api.xunhupay.com/payments/home/success')) {
      if (!isSuccessNotified) {
        isSuccessNotified = true
        event.sender.send('payment-result', 1) // 1=成功
      }

      // 使用一个安全的方式关闭窗口
      setTimeout(() => {
        if (!isWindowClosed && !paymentWindow.isDestroyed()) {
          isWindowClosed = true
          paymentWindow.close()
        }
      }, 1000)
    }
  })

  // 加载完成事件处理
  paymentWindow.webContents.on('did-finish-load', () => {
    if (isWindowClosed) return // 如果窗口已关闭，不执行后续代码

    const currentUrl = paymentWindow.webContents.getURL()
    if (
      currentUrl.startsWith('https://api.xunhupay.com/payments/home/success')
    ) {
      if (!isSuccessNotified) {
        isSuccessNotified = true
        event.sender.send('payment-result', 1) // 1=成功
      }

      // 使用一个安全的方式关闭窗口
      setTimeout(() => {
        if (!isWindowClosed && !paymentWindow.isDestroyed()) {
          isWindowClosed = true
          paymentWindow.close()
        }
      }, 1000)
    }
  })

  // 窗口关闭事件
  paymentWindow.on('closed', async () => {
    isWindowClosed = true

    if (!isSuccessNotified) {
      try {
        const orderRes = await orderGetApi(params.order_id)
        // 确保主窗口存在
        if (win && !win.isDestroyed()) {
          win.webContents.send('payment-result', orderRes.data.data.status)
        }
      } catch (error) {
        console.error('查询订单失败:', error)
      }
    }
  })

  try {
    await paymentWindow.loadURL(params.url)
  } catch (error) {
    console.log('支付页面加载错误:', error)
  }

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
    try {
      // 验证参数
      if (typeof url !== 'string' || !url) {
        throw new Error('无效的下载URL')
      }

      if (typeof basePath !== 'string' || !basePath) {
        throw new Error('无效的基础路径')
      }

      if (typeof category !== 'string') {
        category = 'default' // 提供默认值
      }

      if (typeof fileName !== 'string' || !fileName) {
        fileName = `download_${Date.now()}.zip` // 提供默认文件名
      }

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
          const totalBytes =
            parseInt(response.headers['content-length'], 10) || 0

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
    } catch (error) {
      console.error('下载处理错误:', error)
      throw error
    }
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

// 添加获取目录文件列表的处理函数
ipcMain.handle('get-files-in-directory', async (_, dirPath, namePattern) => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return []
    }

    // 读取目录内容
    const files = fs.readdirSync(dirPath)

    // 如果有文件名模式，按模式过滤
    if (namePattern) {
      // 创建安全的正则表达式模式
      const escapedPattern = namePattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
        .replace(/\\\*/g, '.*') // 将 \* 替换为 .*

      const regex = new RegExp(escapedPattern, 'i')

      // 返回完整路径
      return files
        .filter((file) => regex.test(file))
        .map((file) => path.join(dirPath, file))
    }

    // 返回所有文件的完整路径
    return files.map((file) => path.join(dirPath, file))
  } catch (error) {
    console.error('Error reading directory:', error)
    return []
  }
})

// 添加窗口最小化处理函数
ipcMain.handle('minimize-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  console.log('当前活动窗口:', focusedWindow?.id)
  
  if (focusedWindow) {
    console.log('最小化前状态:', focusedWindow.isMinimized())
    focusedWindow.minimize();
    console.log('最小化后状态:', focusedWindow.isMinimized())
    return true
  }
  return false
})

// 修改拖拽处理函数，修复自动解压调用问题
ipcMain.on('ondragstart', async (event, filePath) => {
  console.log('开始原生拖拽文件:', filePath)
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    console.error('拖拽的文件不存在:', filePath)
    return
  }
  
  // 获取文件扩展名（小写）
  const ext = path.extname(filePath).toLowerCase()
  
  // 判断是否为支持的压缩文件
  const supportedArchives = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2']
  const isArchive = supportedArchives.includes(ext)
  let dragFilePath = filePath
  
  // 如果是压缩文件，尝试解压
  if (isArchive) {
    try {
      console.log(`检测到${ext}压缩文件，尝试自动解压...`)
      
      // 直接调用解压函数，而不是通过handlers
      const extractResult = await extractArchive(filePath)
      
      if (extractResult.success) {
        dragFilePath = extractResult.path
        console.log('解压成功，将拖拽解压后的文件:', dragFilePath)
      } else {
        console.error('解压失败:', extractResult.error)
      }
    } catch (error) {
      console.error('自动解压过程出错，将拖拽原始文件:', error)
    }
  }
  
  // 隐藏窗口和其余代码保持不变...
  try {
    console.log('尝试隐藏/最小化窗口...')
    const sourceWindow = BrowserWindow.fromWebContents(event.sender)
    if (sourceWindow) {
      sourceWindow.hide()
      sourceWindow.minimize()
    } else {
      const allWindows = BrowserWindow.getAllWindows()
      for (const win of allWindows) {
        win.hide()
      }
    }
  } catch (error) {
    console.error('隐藏/最小化窗口失败:', error)
  }
  
  // 创建临时图标
  const iconPath = path.join(app.getPath('temp'), 'drag-icon.png')
  if (!fs.existsSync(iconPath)) {
    // 创建一个1x1像素的透明PNG图像
    const buffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    fs.writeFileSync(iconPath, buffer)
  }
  
  // 启动原生拖拽，使用解压后的文件
  console.log('开始执行startDrag，使用文件:', dragFilePath)
  event.sender.startDrag({
    file: dragFilePath,
    icon: iconPath
  })
  console.log('startDrag已执行')
})

// 提取解压逻辑为单独的函数，便于直接调用
async function extractArchive(archivePath) {
  try {
    // 确保文件存在
    if (!fs.existsSync(archivePath)) {
      throw new Error('压缩文件不存在')
    }
    
    // 获取文件扩展名（小写）
    const ext = path.extname(archivePath).toLowerCase()
    
    // 创建临时解压目录
    const extractDir = path.join(os.tmpdir(), `extract-${Date.now()}`)
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true })
    }
    
    // 根据文件扩展名选择解压方法
    if (ext === '.zip') {
      // 使用extract-zip处理ZIP文件
      await extract(archivePath, { dir: extractDir })
    } else if (['.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext)) {
      // 使用7zip处理其他格式
      const stream = Seven.extract(archivePath, extractDir, {
        $bin: sevenZipPath,
        $progress: true
      })
      
      // 等待解压完成
      await new Promise((resolve, reject) => {
        stream.on('end', () => resolve())
        stream.on('error', (err) => reject(err))
      })
    } else {
      throw new Error(`不支持的压缩格式: ${ext}`)
    }
    
    // 读取解压后的文件
    const files = fs.readdirSync(extractDir)
    if (files.length === 0) {
      throw new Error('解压后没有文件')
    }
    
    // 返回第一个文件的路径
    const extractedFilePath = path.join(extractDir, files[0])
    return {
      success: true,
      path: extractedFilePath,
      originalArchive: archivePath,
      extractDir: extractDir
    }
  } catch (error) {
    console.error('解压文件失败:', error)
    return { success: false, error: error.message }
  }
}

// 保持现有的 ipcMain.handle 以兼容可能的 API 调用
ipcMain.handle('extract-archive', async (event, archivePath) => {
  return await extractArchive(archivePath)
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
