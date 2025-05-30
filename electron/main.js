const { app, BrowserWindow, ipcMain, dialog, net, shell } = require('electron')
const { orderGetApi } = require('./api/payResult')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
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
ipcMain.handle('join-paths', (_, basePath, fileName, category) => {
  try {
    // 移除文件名中的非法字符
    const sanitizedFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    
    // 添加时间戳以避免重名
    const timestamp = Date.now();
    const fileNameWithTimestamp = `${sanitizedFileName}_${timestamp}${path.extname(sanitizedFileName)}`;
    
    // 如果提供了类别，则添加到路径中
    if (category) {
      const categoryDirs = {
        'model': '模型',
        'material': '材质',
        'light': '灯光',
        'texture': '贴图'
      };
      
      const dirName = categoryDirs[category] || category;
      const categoryPath = path.join(basePath, dirName);
      
      // 确保目录存在
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }
      
      return path.join(categoryPath, fileNameWithTimestamp);
    }
    
    return path.join(basePath, fileNameWithTimestamp);
  } catch (error) {
    console.error('路径拼接出错:', error);
    // 出错时返回一个基本的安全路径
    return path.join(basePath, `download_${Date.now()}.zip`);
  }
})

// 下载文件处理
ipcMain.handle('download-file', async (_, url, savePath, category, fileName) => {
  try {
    console.log(`开始下载文件:
      URL: ${url}
      保存路径: ${savePath}
      类别: ${category}
      文件名: ${fileName}
    `);
    
    // URL验证
    if (!url || typeof url !== 'string') {
      return { success: false, error: '无效的下载URL' };
    }
    
    // 确保URL是正确的HTTP/HTTPS格式
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { success: false, error: `URL格式不正确: ${url}` };
    }
    
    // 确保下载目录存在
    const downloadDir = path.dirname(savePath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // 创建下载请求
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url: url
      });
      
      // 请求超时处理
      const timeoutId = setTimeout(() => {
        request.abort();
        reject(new Error('下载请求超时'));
      }, 30000); // 30秒超时
      
      let receivedBytes = 0;
      let totalBytes = 0;
      
      request.on('response', (response) => {
        clearTimeout(timeoutId);
        
        // 检查响应状态码
        if (response.statusCode !== 200) {
          reject(new Error(`服务器响应错误: ${response.statusCode}`));
          return;
        }
        
        totalBytes = parseInt(response.headers['content-length'] || '0');
        const chunks = [];
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
          receivedBytes += chunk.length;
          
          // 发送进度更新
          if (win && !win.isDestroyed()) {
            win.webContents.send('download-progress', { 
              progress: totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0,
              fileName 
            });
          }
        });
        
        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(savePath, buffer);
            console.log(`文件下载完成: ${savePath}`);
            resolve({ success: true, path: savePath });
          } catch (error) {
            console.error('保存文件时出错:', error);
            reject(error);
          }
        });
        
        response.on('error', (error) => {
          console.error('响应接收错误:', error);
          reject(error);
        });
      });
      
      request.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error('请求错误:', error);
        reject(error);
      });
      
      request.end();
    }).catch(error => {
      console.error('下载过程中出错:', error);
      return { success: false, error: error.message || '下载失败' };
    });
  } catch (error) {
    console.error('下载处理函数出错:', error);
    return { success: false, error: error.message || '下载处理错误' };
  }
});

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

// 获取资源文件夹路径
ipcMain.handle('get-resources-path', () => {
  return path.join(app.getAppPath(), 'resources');
});

// 原生文件拖拽处理
ipcMain.on('ondragstart', (event, filePath, fileType) => {
  try {
    console.log(`开始拖拽文件: ${filePath}, 类型: ${fileType}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`拖拽失败: 文件不存在 ${filePath}`);
      return;
    }
    
    // 创建一个空的临时图像文件
    const tempIconPath = path.join(app.getPath('temp'), 'empty-icon.png');
    
    // 创建一个1x1像素的透明PNG (如果不存在)
    if (!fs.existsSync(tempIconPath)) {
      const emptyPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(tempIconPath, emptyPNG);
    }
    
    // 设置拖拽文件
    event.sender.startDrag({
      file: filePath,
      icon: tempIconPath
    });
    
    console.log('拖拽开始');
  } catch (error) {
    console.error('拖拽过程出错:', error);
  }
});

// 添加解压文件的处理函数
async function extractArchive(archivePath) {
  console.log('开始解压文件:', archivePath);
  
  try {
    // 获取解压目标目录 - 保持在zip文件所在目录
    const extractDir = path.dirname(archivePath);
    console.log('解压目标目录:', extractDir);
    
    // 检查文件是否存在
    if (!fs.existsSync(archivePath)) {
      throw new Error(`压缩文件不存在: ${archivePath}`);
    }
    
    // 创建以zip文件名(不含扩展名)命名的目录
    let zipBasename = path.basename(archivePath, path.extname(archivePath));
    // 移除可能的时间戳后缀
    zipBasename = zipBasename.replace(/_\d+$/, '');
    
    const specificExtractDir = path.join(extractDir, zipBasename);
    
    // 确保解压目标目录存在
    if (!fs.existsSync(specificExtractDir)) {
      fs.mkdirSync(specificExtractDir, { recursive: true });
    }
    
    // 执行解压缩到指定目录
    if (process.platform === 'win32') {
      await extractWithPowerShell(archivePath, specificExtractDir);
    } else {
      await extractWithUnzip(archivePath, specificExtractDir);
    }
    
    console.log('解压完成, 目录:', specificExtractDir);
    return specificExtractDir; // 返回特定的解压目录
  } catch (error) {
    console.error('解压过程中出错:', error);
    throw error;
  }
}

// Windows平台使用PowerShell解压
function extractWithPowerShell(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    // PowerShell命令解压ZIP文件
    const psPath = zipPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const psDir = extractDir.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    
    const command = `powershell -command "& {try { Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${psPath}', '${psDir}') } catch { exit 1 }}"`;
    
    console.log('执行PowerShell解压命令');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('PowerShell解压失败, 尝试备用方法...');
        
        // 尝试使用内置的expand命令
        const expandCommand = `powershell -command "Expand-Archive -Path '${psPath}' -DestinationPath '${psDir}' -Force"`;
        
        exec(expandCommand, (expandError, expandStdout, expandStderr) => {
          if (expandError) {
            console.error('Expand-Archive也失败, 尝试使用tar...');
            
            // 尝试使用tar命令(Windows 10/11)
            const tarCommand = `tar -xf "${zipPath}" -C "${extractDir}"`;
            
            exec(tarCommand, (tarError, tarStdout, tarStderr) => {
              if (tarError) {
                console.error('所有解压方法都失败');
                console.error('PowerShell错误:', error);
                console.error('Expand-Archive错误:', expandError);
                console.error('Tar错误:', tarError);
                
                reject(new Error('无法解压文件, 所有方法都失败'));
              } else {
                console.log('使用tar命令解压成功');
                resolve(extractDir);
              }
            });
          } else {
            console.log('使用Expand-Archive解压成功');
            resolve(extractDir);
          }
        });
      } else {
        console.log('PowerShell解压成功');
        resolve(extractDir);
      }
    });
  });
}

// Mac/Linux平台使用unzip命令
function extractWithUnzip(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    const command = `unzip -o "${zipPath}" -d "${extractDir}"`;
    
    console.log('执行unzip命令解压');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('unzip解压失败, 尝试使用tar...');
        
        // 尝试使用tar命令
        const tarCommand = `tar -xf "${zipPath}" -C "${extractDir}"`;
        
        exec(tarCommand, (tarError, tarStdout, tarStderr) => {
          if (tarError) {
            console.error('所有解压方法都失败');
            console.error('Unzip错误:', error);
            console.error('Tar错误:', tarError);
            
            reject(new Error('无法解压文件, 所有方法都失败'));
          } else {
            console.log('使用tar命令解压成功');
            resolve(extractDir);
          }
        });
      } else {
        console.log('unzip命令解压成功');
        resolve(extractDir);
      }
    });
  });
}

// IPC处理函数
ipcMain.handle('extract-archive', async (_, archivePath) => {
  console.log('收到解压请求:', archivePath);
  try {
    const result = await extractArchive(archivePath);
    console.log('解压成功, 返回:', result);
    return result; // 直接返回解压目录路径，而不是包装在对象中
  } catch (error) {
    console.error('解压失败:', error);
    throw error; // 抛出错误让preload.js处理
  }
});

// 添加获取子目录的处理函数
ipcMain.handle('get-sub-directories', async (_, dirPath) => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return []
    }

    // 读取目录内容，只返回子目录
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const directories = []
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dirPath, entry.name)
        try {
          const stats = fs.statSync(fullPath)
          directories.push({
            path: fullPath,
            name: entry.name,
            mtime: stats.mtime.getTime()
          })
        } catch (error) {
          console.error(`读取目录信息失败: ${fullPath}`, error)
        }
      }
    }
    
    // 按修改时间排序
    directories.sort((a, b) => b.mtime - a.mtime)
    
    return directories
  } catch (error) {
    console.error('获取子目录失败:', error)
    return []
  }
})

// 添加获取目录中最大文件的处理函数
ipcMain.handle('get-max-file-path', async (_, dirPath) => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return null
    }

    // 递归查找目录中的.max文件
    function findMaxFiles(dir) {
      const results = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // 递归处理子目录
          results.push(...findMaxFiles(fullPath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.max')) {
          // 找到.max文件
          results.push(fullPath);
        }
      }
      
      return results;
    }

    // 获取所有.max文件
    const maxFiles = findMaxFiles(dirPath);
    
    if (maxFiles.length === 0) {
      return null;
    }
    
    // 按文件大小排序，通常最大的文件是主模型
    maxFiles.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.size - statA.size; // 大到小排序
    });
    
    // 返回最大的.max文件路径
    return maxFiles[0];
  } catch (error) {
    console.error('获取MAX文件失败:', error);
    return null;
  }
});

// 添加获取特定文件类型路径的函数
ipcMain.handle('get-specific-file-path', async (_, dirPath, fileType) => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return null;
    }

    console.log(`查找${fileType}类型文件，目录:`, dirPath);
    
    // 定义不同类型文件的查找逻辑
    switch (fileType) {
      case 'model':
        // 模型: 查找.max文件
        return findModelFile(dirPath);
      
      case 'material':
        // 材质: 查找贴图文件
        return findMaterialFile(dirPath);
      
      case 'light':
        // 灯光: 查找IES文件
        return findLightFile(dirPath);
      
      default:
        console.log('未知文件类型:', fileType);
        return dirPath; // 默认返回目录路径
    }
  } catch (error) {
    console.error(`查找${fileType}文件失败:`, error);
    return null;
  }
});

// 查找模型文件 - 优先查找.max格式
function findModelFile(basePath) {
  try {
    if (!fs.existsSync(basePath)) {
      console.error(`路径不存在: ${basePath}`);
      return basePath;
    }
    
    const stats = fs.statSync(basePath);
    if (!stats.isDirectory()) {
      // 如果是文件，直接返回
      return basePath;
    }
    
    // 读取目录内容，查找.max文件
    const files = fs.readdirSync(basePath);
    
    // 优先找.max文件
    const maxFile = files.find(file => file.toLowerCase().endsWith('.max'));
    if (maxFile) {
      return path.join(basePath, maxFile);
    }
    
    // 其次找.fbx文件
    const fbxFile = files.find(file => file.toLowerCase().endsWith('.fbx'));
    if (fbxFile) {
      return path.join(basePath, fbxFile);
    }
    
    // 再找.obj文件
    const objFile = files.find(file => file.toLowerCase().endsWith('.obj'));
    if (objFile) {
      return path.join(basePath, objFile);
    }
    
    // 没找到合适的文件，返回原路径
    console.warn(`在 ${basePath} 中未找到合适的模型文件`);
    return basePath;
  } catch (error) {
    console.error(`查找模型文件出错: ${error.message}`);
    return basePath;
  }
}

// 查找材质文件 - 优先查找.mat格式
function findMaterialFile(basePath) {
  try {
    if (!fs.existsSync(basePath)) {
      return basePath;
    }
    
    const stats = fs.statSync(basePath);
    if (!stats.isDirectory()) {
      return basePath;
    }
    
    // 读取目录内容，查找.mat文件
    const files = fs.readdirSync(basePath);
    
    // 优先找.mat文件
    const matFile = files.find(file => file.toLowerCase().endsWith('.mat'));
    if (matFile) {
      return path.join(basePath, matFile);
    }
    
    // 没找到合适的文件，返回原路径
    console.warn(`在 ${basePath} 中未找到合适的材质文件`);
    return basePath;
  } catch (error) {
    console.error(`查找材质文件出错: ${error.message}`);
    return basePath;
  }
}

// 查找灯光文件 - 优先查找.ies格式
function findLightFile(basePath) {
  try {
    if (!fs.existsSync(basePath)) {
      return basePath;
    }
    
    const stats = fs.statSync(basePath);
    if (!stats.isDirectory()) {
      return basePath;
    }
    
    // 读取目录内容，查找.ies文件
    const files = fs.readdirSync(basePath);
    
    // 优先找.ies文件
    const iesFile = files.find(file => file.toLowerCase().endsWith('.ies'));
    if (iesFile) {
      return path.join(basePath, iesFile);
    }
    
    // 没找到合适的文件，返回原路径
    console.warn(`在 ${basePath} 中未找到合适的灯光文件`);
    return basePath;
  } catch (error) {
    console.error(`查找灯光文件出错: ${error.message}`);
    return basePath;
  }
}

// 初始化应用资源目录
function initializeResourceDirectories() {
  try {
    const userDataPath = app.getPath('userData');
    const resourcesPath = path.join(userDataPath, 'resources');
    const scriptsPath = path.join(resourcesPath, 'scripts');
    
    // 创建必要的目录
    if (!fs.existsSync(resourcesPath)) {
      fs.mkdirSync(resourcesPath, { recursive: true });
    }
    
    if (!fs.existsSync(scriptsPath)) {
      fs.mkdirSync(scriptsPath, { recursive: true });
    }
    
    // 初始化脚本文件 - 使用最简单的版本
    const scriptFiles = {
      'Mol.ms': `messageBox "Run Mol ok"`,
      'Mat.ms': `messageBox "Run Mat ok"`,
      'ies.ms': `messageBox "Run ies ok"`
    };
    
    // 创建脚本文件(如果不存在)
    for (const [fileName, content] of Object.entries(scriptFiles)) {
      const scriptPath = path.join(scriptsPath, fileName);
      if (!fs.existsSync(scriptPath)) {
        fs.writeFileSync(scriptPath, content);
        console.log(`已创建脚本文件: ${fileName}`);
      }
    }
    
    return {
      resourcesPath,
      scriptsPath
    };
  } catch (error) {
    console.error('初始化资源目录失败:', error);
    throw error;
  }
}

// 在应用启动时初始化
app.whenReady().then(() => {
  try {
    // 初始化资源目录
    const { resourcesPath, scriptsPath } = initializeResourceDirectories();
    console.log('应用资源目录:', resourcesPath);
    console.log('脚本目录:', scriptsPath);
    
    // 创建窗口
    createWindow();
    
    // 显示启动信息
    console.log(`
      应用版本: ${app.getVersion()}
      Electron版本: ${process.versions.electron}
      Chromium版本: ${process.versions.chrome}
      Node版本: ${process.versions.node}
      操作系统: ${os.platform()} ${os.release()}
    `);
  } catch (error) {
    console.error('应用启动错误:', error);
    dialog.showErrorBox('启动错误', `应用启动时出现问题: ${error.message}`);
  }
  
  // macOS 应用程序激活时，如果没有窗口则创建新窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户使用 Cmd + Q 退出
  // 否则保持应用程序活动状态
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 准备并启动拖拽
ipcMain.handle('prepare-and-start-drag', async (event, basePath, fileType, txtFile) => {
  try {
    console.log(`准备拖拽操作: 路径 ${basePath}, 类型 ${fileType}, 数据文件 ${txtFile}`);
    
    // 特殊处理贴图类型 - 直接拖拽图片文件
    if (fileType === 'texture') {
      // 查找目录中的图片文件
      let imageFile = basePath;
      
      // 如果basePath是目录，则查找第一个图片文件
      if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
        const files = fs.readdirSync(basePath);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.gif'];
        
        // 查找第一个图片文件
        const imageFileName = files.find(file => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        });
        
        if (imageFileName) {
          imageFile = path.join(basePath, imageFileName);
          console.log(`在目录中找到图片文件: ${imageFile}`);
        } else {
          return { success: false, error: '在指定目录中未找到图片文件' };
        }
      }
      
      // 确认文件存在
      if (!fs.existsSync(imageFile)) {
        return { success: false, error: `图片文件不存在: ${imageFile}` };
      }
      
      try {
        // 创建空图标
        const tempDir = app.getPath('temp');
        const tempIconPath = path.join(tempDir, 'empty-icon.png');
        
        if (!fs.existsSync(tempIconPath)) {
          const emptyPNG = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
          ]);
          fs.writeFileSync(tempIconPath, emptyPNG);
        }
        
        // 隐藏窗口
        try {
          console.log('尝试隐藏窗口...');
          const sourceWindow = BrowserWindow.fromWebContents(event.sender);
          if (sourceWindow) {
            sourceWindow.minimize();
            sourceWindow.hide();
            
            // 3秒后恢复窗口显示
            setTimeout(() => {
              if (!sourceWindow.isDestroyed()) {
                sourceWindow.show();
              }
            }, 3000);
          } else {
            const allWindows = BrowserWindow.getAllWindows();
            for (const win of allWindows) {
              win.minimize();
            }
          }
        } catch (windowError) {
          console.error('隐藏窗口失败:', windowError);
        }
        
        // 直接拖拽图片文件
        event.sender.startDrag({
          file: imageFile,
          icon: tempIconPath
        });
        
        console.log(`开始拖拽图片文件: ${imageFile}`);
        return { success: true };
      } catch (dragError) {
        console.error('启动贴图拖拽失败:', dragError);
        return { success: false, error: dragError.message };
      }
    }
    
    // 以下是其他类型的常规处理流程
    
    // 1. 根据素材类型找到合适的文件
    let specificPath = basePath;
    
    if (fileType === 'model') {
      specificPath = findModelFile(basePath);
    } else if (fileType === 'material') {
      specificPath = findMaterialFile(basePath);
    } else if (fileType === 'light') {
      specificPath = findLightFile(basePath);
    }
    
    // 2. 设置对应的脚本文件
    let msScript = 'Mol.ms'; // 默认为模型脚本
    
    if (fileType === 'material') {
      msScript = 'Mat.ms';
    } else if (fileType === 'light') {
      msScript = 'ies.ms';
    }
    
    // 3. 处理重复路径问题 - 直接硬编码正确的路径
    const baseAppPath = app.getAppPath();
    console.log(`应用基础路径: ${baseAppPath}`);
    
    // 直接使用临时目录来避免所有路径问题
    const tempDir = app.getPath('temp');
    console.log(`临时目录: ${tempDir}`);
    
    // 临时文件路径
    const tempScriptPath = path.join(tempDir, msScript);
    const tempTxtPath = path.join(tempDir, txtFile);
    
    // 查找源脚本 - 尝试多种可能的路径
    const possibleScriptPaths = [
      path.join(baseAppPath, 'resources', 'scripts', msScript),
      path.join(baseAppPath, 'resources', 'resources', 'scripts', msScript),
      path.join(path.dirname(baseAppPath), 'resources', 'scripts', msScript)
    ];
    
    let sourceScriptPath = null;
    for (const scriptPath of possibleScriptPaths) {
      try {
        if (fs.existsSync(scriptPath)) {
          sourceScriptPath = scriptPath;
          console.log(`找到源脚本: ${scriptPath}`);
          break;
        }
      } catch (e) {
        console.log(`检查脚本路径失败: ${scriptPath}, 错误: ${e.message}`);
      }
    }
    
    // 4. 写入数据文件到临时目录
    const pathToWrite = specificPath.replace(/\//g, '\\');  // 确保使用Windows路径格式
    fs.writeFileSync(tempTxtPath, pathToWrite, 'utf8');
    console.log(`写入路径到临时文件: ${tempTxtPath}: ${pathToWrite}`);
    
    // 5. 复制或创建脚本
    if (sourceScriptPath) {
      fs.copyFileSync(sourceScriptPath, tempScriptPath);
      console.log(`复制脚本到临时目录: ${tempScriptPath}`);
    } else {
      // 如果找不到脚本，创建一个基本的默认脚本
      const basicScript = `
GLOBAL a44756d2e67e8c445 = GetFileNamePath(GetSourceFilename())
fn a${Math.random().toString(16).substring(2)} =
(
  try (
    file = OpenFile (a44756d2e67e8c445 + @"${txtFile}")
    if file != undefined then (
      str = readLine file
      close file
      if str != undefined and str != "" then (
        if "${fileType}" == "model" then (
          importFile str #noPrompt
          messageBox ("已导入模型: " + str) title:"导入成功"
        ) else (
          messageBox ("文件路径: " + str) title:"${fileType}加载"
        )
      ) else (
        messageBox "读取路径失败" title:"错误"
      )
    ) else (
      messageBox "无法打开文件" title:"错误"
    )
  ) catch (
    messageBox ("执行错误: " + (getCurrentException())) title:"错误"
  )
)
a${Math.random().toString(16).substring(2)}()
      `;
      fs.writeFileSync(tempScriptPath, basicScript);
      console.log(`创建默认脚本: ${tempScriptPath}`);
    }
    
    // 6. 创建一个空的临时图像文件作为拖拽图标
    const tempIconPath = path.join(tempDir, 'empty-icon.png');
    
    // 创建一个1x1像素的透明PNG (如果不存在)
    if (!fs.existsSync(tempIconPath)) {
      const emptyPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(tempIconPath, emptyPNG);
    }
    
    // 7. 隐藏窗口功能
    try {
      console.log('尝试隐藏窗口...');
      const sourceWindow = BrowserWindow.fromWebContents(event.sender);
      if (sourceWindow) {
        sourceWindow.minimize();
        sourceWindow.hide();
        
        // 3秒后恢复窗口显示
        setTimeout(() => {
          if (!sourceWindow.isDestroyed()) {
            sourceWindow.show();
          }
        }, 3000);
      } else {
        const allWindows = BrowserWindow.getAllWindows();
        for (const win of allWindows) {
          win.minimize();
        }
      }
    } catch (windowError) {
      console.error('隐藏窗口失败:', windowError);
    }
    
    // 8. 开始拖拽 - 使用临时目录中的脚本
    try {
      event.sender.startDrag({
        file: tempScriptPath,
        icon: tempIconPath
      });
      
      console.log(`开始拖拽: ${tempScriptPath}`);
      return { success: true };
    } catch (dragError) {
      console.error('启动拖拽失败:', dragError);
      return { success: false, error: dragError.message };
    }
  } catch (error) {
    console.error('准备拖拽失败:', error);
    return { success: false, error: error.message };
  }
});