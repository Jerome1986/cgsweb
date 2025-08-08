/**
 * utils.js - 工具函数集合
 */
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

/**
 * 创建一个空图标文件用于拖拽操作
 * @param {string} tempDir - 临时目录路径
 * @returns {string} - 创建的图标文件路径
 */
function createEmptyIcon(tempDir) {
  // 创建一个1x1像素的透明图标
  const iconPath = path.join(tempDir, 'drag_icon.png');
  // 创建一个最小的PNG图标
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  fs.writeFileSync(iconPath, minimalPng);
  return iconPath;
}

/**
 * 处理窗口可见性
 * 注意：该函数在main.js中被导入但未使用
 * @param {BrowserWindow} window - 要处理的窗口
 * @param {boolean} visible - 是否可见
 */
function handleWindowVisibility(window, visible) {
  if (window && !window.isDestroyed()) {
    if (visible) {
      window.show();
    } else {
      window.hide();
    }
  }
}

/**
 * 查找模型文件
 * @param {string} dirPath - 目录路径
 * @returns {string} - 找到的模型文件路径或原目录路径
 */
function findModelFile(dirPath) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return dirPath;
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
      return dirPath;
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
    console.error('查找MAX文件失败:', error);
    return dirPath;
  }
}

/**
 * 查找材质文件
 * @param {string} dirPath - 目录路径
 * @returns {string} - 找到的材质文件路径或原目录路径
 */
function findMaterialFile(dirPath) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return dirPath;
    }

    // 查找材质文件，通常是图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.exr', '.hdr'];
    const files = fs.readdirSync(dirPath);

    // 查找材质文件
    for (const ext of imageExtensions) {
      const matchingFiles = files.filter(file => file.toLowerCase().endsWith(ext));
      if (matchingFiles.length > 0) {
        // 返回第一个匹配的文件
        return path.join(dirPath, matchingFiles[0]);
      }
    }

    return dirPath; // 如果没有找到，返回原目录
  } catch (error) {
    console.error('查找材质文件失败:', error);
    return dirPath;
  }
}

/**
 * 查找灯光文件
 * @param {string} dirPath - 目录路径
 * @returns {string} - 找到的灯光文件路径或原目录路径
 */
function findLightFile(dirPath) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return dirPath;
    }

    // 查找IES灯光文件
    const files = fs.readdirSync(dirPath);
    const iesFile = files.find(file => file.toLowerCase().endsWith('.ies'));

    if (iesFile) {
      return path.join(dirPath, iesFile);
    }

    return dirPath; // 如果没有找到，返回原目录
  } catch (error) {
    console.error('查找灯光文件失败:', error);
    return dirPath;
  }
}

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @param {string} message - 错误消息
 * @param {Object} returnValue - 可选的返回值
 * @returns {Object} - 返回值或包含错误信息的对象
 */
function handleError(error, message, returnValue = null) {
  console.error(`${message}:`, error);

  // 可以选择显示错误对话框
  dialog.showErrorBox(message, error.message || '未知错误');

  // 如果提供了返回值，则返回它；否则返回一个包含错误信息的对象
  return returnValue || { success: false, error: error.message || '操作失败' };
}

/**
 * 创建基本脚本
 * @param {string} txtFile - 文本文件名
 * @param {string} fileType - 文件类型
 * @returns {string} - 生成的脚本内容
 */
function createBasicScript(txtFile, fileType) {
  // 获取系统临时目录
  const tempDir = require('os').tmpdir();
  const dataFilePath = path.join(tempDir, txtFile).replace(/\\/g, '\\\\');

  // 根据不同类型生成不同的脚本
  switch (fileType) {
    case 'model':
      return `
-- 模型导入脚本
fn importModel = (
  -- 读取文件路径
  local filePath = getFilenamePath "${dataFilePath}"
  local f = openFile filePath "r"
  local modelPath = readLine f
  close f

  -- 导入模型
  importFile modelPath #noPrompt
  messageBox ("已导入模型: " + modelPath)
)

-- 执行导入
importModel()
`;

    case 'material':
      return `
-- 材质导入脚本
fn importMaterial = (
  -- 读取文件路径
  local filePath = getFilenamePath "${dataFilePath}"
  local f = openFile filePath "r"
  local materialPath = readLine f
  close f

  -- 创建材质
  local m = Standard()
  m.diffuseMap = Bitmaptexture filename:materialPath
  showTextureMap m true

  messageBox ("已导入材质: " + materialPath)
)

-- 执行导入
importMaterial()
`;

    case 'light':
      return `
-- 灯光导入脚本
fn importLight = (
  -- 读取文件路径
  local filePath = getFilenamePath "${dataFilePath}"
  local f = openFile filePath "r"
  local lightPath = readLine f
  close f

  -- 创建灯光
  local l = FreeSpot()
  l.projectorMap = Bitmaptexture filename:lightPath

  messageBox ("已导入灯光: " + lightPath)
)

-- 执行导入
importLight()
`;

    default:
      return `messageBox "未知类型: ${fileType}"`;
  }
}

module.exports = {
  createEmptyIcon,
  handleWindowVisibility,
  findModelFile,
  findMaterialFile,
  findLightFile,
  handleError,
  createBasicScript
};
