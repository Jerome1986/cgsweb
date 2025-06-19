<script setup>
import { onMounted, ref, watch, computed, onUnmounted, nextTick } from 'vue'
import { materialAllGet, searchMaterial } from '@/api/material'
import { useMaterialStore } from '@/stores/modules/material'
import { usePathStore, useUserStore } from '@/stores'
import { ElMessage } from 'element-plus'
import {
  useCoins,
  userDownLoadLimits,
  userDownLoadListAdd,
  userDownLoadListGet,
  userLoveListAdd,
  userLoveListGet,
  usersGet
} from '@/api/users'
import { useRoute, useRouter } from 'vue-router'
import fs from 'fs'
import path from 'path'

const props = defineProps({
  type: String,
  currentCateId: {
    type: String,
    default: ''
  }
})

// 获取当前路由对象
const route = useRoute()
const router = useRouter()

// 用户状态管理
const userStore = useUserStore()

// 素材状态管理
const materialStore = useMaterialStore()

/**
 * 当前素材信息
 * @type {import('vue').Ref<materialModel[]>}
 */
const materialData = ref([])

// 当前封面图
const currentCoverImg = ref([])

// 下载状态管理
const pathStore = usePathStore()

// 当前选中的标签和颜色
const selectedTag = ref('全部')
const selectedColor = ref(null)

/**
 * 模型下的所有素材
 * @type {import('vue').Ref<materialModel[]>}
 */
const allMaterial = ref([])

// 添加素材尺寸控制
const itemSize = ref(405) // 默认尺寸
const minSize = 200 // 最小尺寸
const maxSize = 600 // 最大尺寸

// 拖拽状态
const isDragging = ref(false)

// 获取所有素材
const allMaterialListGet = async () => {
  // 获取所有数据，不使用分页
  const res = await materialAllGet(1, 999999, props.type)
  allMaterial.value = res.data.list
  materialData.value = res.data.list
  // 存储返回的总条数
  materialStore.setMaterialTotal(res.data.total)
}

// 获取当前素材数据
const materialDataGet = async () => {
  await allMaterialListGet()
  let filteredData = allMaterial.value

  // 根据当前分类过滤数据
  if (props.currentCateId) {
    // 如果是一级分类，需要包含其下所有二级分类的数据
    filteredData = allMaterial.value.filter(
      (item) => item.top_id === props.currentCateId || item.sub_id === props.currentCateId
    )
  }

  // 更新总数，用于分页计算
  materialStore.setMaterialTotal(filteredData.length)

  // 保存完整的过滤数据用于标签和颜色筛选
  materialStore.setSelectedMaterials(filteredData)

  // 计算当前页的数据
  const start = (materialStore.pages.pagesNum - 1) * materialStore.pages.pagesSize
  const end = start + materialStore.pages.pagesSize
  materialData.value = filteredData.slice(start, end)

  // 封面图预览列表
  currentCoverImg.value = materialData.value.map((item) => item.cover_url)

  // 标签筛选和颜色筛选
  updateTagsAndColors()
  applyFilters()
}

// 更新标签和颜色列表
const updateTagsAndColors = () => {
  const materials = materialStore.selectedMaterials

  if (materials.length > 0) {
    // 更新标签
    let tempTags = materials.flatMap((item) => item.tags)
    let currentTags = [...new Set(tempTags)]
    currentTags.unshift('全部')
    materialStore.setCurrentTags(currentTags)

    // 更新颜色
    let tempColorTags = materials.flatMap((item) => item.colors)
    let currentColorTags = [...new Set(tempColorTags)]
    materialStore.setColorTags(currentColorTags)
  } else {
    materialStore.setCurrentTags([])
    materialStore.setColorTags([])
  }
}

// 应用联合筛选
const applyFilters = () => {
  let filtered = [...materialStore.selectedMaterials]

  // 标签筛选
  if (selectedTag.value && selectedTag.value !== '全部') {
    filtered = filtered.filter((item) => item.tags.includes(selectedTag.value))
  }

  // 颜色筛选
  if (selectedColor.value) {
    filtered = filtered.filter((item) => item.colors.includes(selectedColor.value))
  }

  // 更新总数，用于分页计算
  materialStore.setMaterialTotal(filtered.length)

  // 计算当前页的数据
  const start = (materialStore.pages.pagesNum - 1) * materialStore.pages.pagesSize
  const end = start + materialStore.pages.pagesSize
  materialData.value = filtered.slice(start, end)

  // 更新预览图列表
  currentCoverImg.value = materialData.value.map((item) => item.cover_url)
}

// 标签筛选
const handleTagSelect = (tag) => {
  selectedTag.value = tag
  applyFilters()
}

// 颜色筛选
const handleColorSelect = (color) => {
  if (selectedColor.value === color) {
    selectedColor.value = null // 取消选中
  } else {
    selectedColor.value = color // 选中新颜色
  }
  applyFilters()
}

// 通过搜索查询素材
const handleSearch = async (searchValue) => {
  if (!searchValue) {
    await materialDataGet()
  } else {
    const res = await searchMaterial(
      searchValue,
      materialStore.pages.pagesNum,
      materialStore.pages.pagesSize,
      props.type
    )
    let searchResults = res.data

    // 如果有分类选择，过滤搜索结果
    if (props.currentCateId) {
      searchResults = searchResults.filter(
        (item) => item.top_id === props.currentCateId || item.sub_id === props.currentCateId
      )
    }

    // 更新总数，用于分页计算
    materialStore.setMaterialTotal(searchResults.length)

    // 计算当前页的数据
    const start = (materialStore.pages.pagesNum - 1) * materialStore.pages.pagesSize
    const end = start + materialStore.pages.pagesSize
    materialData.value = searchResults.slice(start, end)

    // 更新预览图列表
    currentCoverImg.value = materialData.value.map((item) => item.cover_url)
  }
}

// 处理下载成功后扣除用户金币
const handleUserCoinsOrTimes = async (material_id) => {
  // 重置用户下载列表
  await downLoadListGet()
  pathStore.setLocalDownloadPath(userDownLoadList.value)
  const res = await useCoins(userStore.userInfo._id, material_id)
  console.log('更新金币结果', res)
  if (res.coins) {
    userStore.setUserInfo({ coins: res.coins })
  }
}

// 处理下载成功后扣除用户下载次数
const handleUserDownLimits = async (material_id) => {
  // 重置用户下载列表
  await downLoadListGet()
  pathStore.setLocalDownloadPath(userDownLoadList.value)
  const res = await userDownLoadLimits(userStore.userInfo._id, material_id)
  console.log('更新剩余下载次数结果', res)
  if (res.code === 200) {
    ElMessage.success(res.message)
  } else {
    throw ElMessage.error(res.message)
  }
}

/**
 * 完全修复的下载处理函数
 * @param {materialModel} item - 当前素材对象信息
 * @returns {Promise<void>}
 */
const handleDownload = async (item) => {
  console.log('下载', item)

  // 从 pathStore 获取下载路径
  const basePath = pathStore.downloadPath

  // 如果下载路径未设置或显示为"未设置"
  if (!basePath || basePath === '未设置') {
    ElMessage.error('请先设置下载路径')
    return
  }

  try {
    // 需要先检查用户是否有下载权限，要么金币>5,要么是会员且有下载次数
    const userRes = await usersGet(userStore.userInfo._id)
    if (userRes.data.coins > 5) {
      // 扣除用户金币
      await handleUserCoinsOrTimes(item._id)
    } else {
      // 扣除下载次数
      await handleUserDownLimits(item._id)
    }
    // 改进类型判断逻辑
    let category = 'model' // 默认为模型

    // 基于路由路径判断类型
    if (route.path.includes('/material')) {
      category = 'material'
    } else if (route.path.includes('/lighting')) {
      category = 'light'
    } else if (route.path.includes('/maps')) {
      category = 'texture'
    }

    // 然后基于item.type进一步判断，如果有的话
    if (item.type) {
      if (item.type.includes('材质')) category = 'material'
      else if (item.type.includes('灯光')) category = 'light'
      else if (item.type.includes('贴图')) category = 'texture'
      else if (item.type.includes('模型')) category = 'model'
    }

    console.log('使用类别:', category)

    // 提取必要的原始数据类型并确保获取正确的URL
    let downloadUrl = ''

    // 验证文件URL数组
    if (Array.isArray(item.files_url) && item.files_url.length > 0) {
      downloadUrl = item.files_url[0]
    } else if (typeof item.files_url === 'string') {
      // 如果files_url是字符串而不是数组
      downloadUrl = item.files_url
    } else {
      throw new Error('无效的文件URL')
    }

    // 验证URL格式
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      throw new Error(`无效的下载URL: ${downloadUrl}`)
    }

    console.log('下载URL:', downloadUrl)

    const fileName = item.name || downloadUrl.split('/').pop() || `file_${Date.now()}.zip`
    const itemType = String(item.type || props.type)
    const materialId = String(item._id)

    ElMessage.warning('已添加到下载列表')

    // 使用带类别信息的路径构建
    const savePath = await window.electronAPI.joinPaths(basePath, fileName, category)
    console.log('保存路径:', savePath)

    // 执行下载，传递所有需要的参数
    const result = await window.electronAPI.downloadFile(downloadUrl, savePath, category, fileName)

    if (!result) {
      throw new Error('下载失败: 未收到下载结果')
    }

    if (result.success) {
      // 下载成功，尝试解压
      try {
        console.log('尝试自动解压文件:', result.path)
        const extractResult = await window.electronAPI.extractArchive(result.path)
        console.log('解压完成，返回结果:', extractResult)

        if (extractResult) {
          ElMessage.success(`下载并解压成功`)

          // 添加到本地下载路径列表
          pathStore.setLocalDownloadPath({
            material_id: materialId,
            localPath: extractResult
          })

          // 下载成功后添加到用户的下载列表
          const addRes = await userDownLoadListAdd(userStore.userInfo._id, materialId)

          if (addRes.code === 200) {
            ElMessage.success(`${addRes.message}`)

            // 刷新下载列表
            await downLoadListGet()
          }

          // 解压成功后删除原始 zip 文件
          try {
            console.log('尝试删除原始 zip 文件:', result.path)
            await window.electronAPI.deleteFile(result.path)
            console.log('原始压缩文件已删除')
          } catch (deleteError) {
            console.warn('删除原始压缩文件失败:', deleteError)
          }

          return {
            success: true,
            downloadPath: result.path,
            extractPath: extractResult
          }
        } else {
          throw new Error('解压返回结果为空')
        }
      } catch (extractError) {
        console.error('解压过程出错:', extractError)
        ElMessage.warning(`文件已下载，但解压失败: ${extractError.message || '未知错误'}`)

        // 即使解压失败，也添加到下载列表
        pathStore.setLocalDownloadPath({
          material_id: materialId,
          localPath: path.dirname(result.path)
        })

        // 下载成功后添加到用户的下载列表
        const addRes = await userDownLoadListAdd(userStore.userInfo._id, materialId)
        if (addRes.code === 200) {
          ElMessage.success(`${addRes.message}`)
          await downLoadListGet()
        }

        return {
          success: true,
          downloadPath: result.path,
          extractError
        }
      }
    } else {
      throw new Error(result.error || '下载失败')
    }
  } catch (error) {
    console.error('下载出错:', error)
    ElMessage.error(`下载失败: ${error.message || '未知错误'}`)
    return {
      success: false,
      error
    }
  }
}

/**
 * 用户下载列表
 * @type {import('vue').Ref<downloadListModel[]>}
 */
const userDownLoadList = ref([])
const downLoadListGet = async () => {
  if (!userStore.userInfo._id) return
  const res = await userDownLoadListGet(userStore.userInfo._id)
  userDownLoadList.value = res.data
}

// 检查素材是否已下载
const isDownloaded = computed(() => {
  return (materialId) => {
    return pathStore.localDownloadPath.some((item) => item.material_id === materialId)
  }
})

// 本机有
const localMaterials = async () => {
  // 先获取当前类型的所有素材
  const res = await materialAllGet(1, 999999, props.type)
  allMaterial.value = res.data.list

  // 过滤出已下载的素材
  const downloadIds = new Set(pathStore.localDownloadPath.map((item) => item.material_id))
  let filteredMaterials = allMaterial.value.filter((material) => downloadIds.has(material._id))

  // 如果有选中的分类，根据分类进行过滤
  if (props.currentCateId) {
    filteredMaterials = filteredMaterials.filter(
      (item) => item.top_id === props.currentCateId || item.sub_id === props.currentCateId
    )
  }

  // 更新总数，用于分页计算
  materialStore.setMaterialTotal(filteredMaterials.length)

  // 保存完整的过滤数据用于标签和颜色筛选
  materialStore.setSelectedMaterials(filteredMaterials)

  // 计算当前页的数据
  const start = (materialStore.pages.pagesNum - 1) * materialStore.pages.pagesSize
  const end = start + materialStore.pages.pagesSize
  materialData.value = filteredMaterials.slice(start, end)

  // 更新预览图列表
  currentCoverImg.value = materialData.value.map((item) => item.cover_url)
}

// 将素材添加到收藏列表
const addMaterialLoveList = async (material_id) => {
  const res = await userLoveListAdd(userStore.userInfo._id, material_id)
  console.log('收藏结果', res)
  if (res.code === 200) ElMessage.success(res.message)
  await getUsersLoveList()
}

/**
 * 用户收藏列表
 * @type {import('vue').Ref<loveListModel[]>}
 */
const userLoveList = ref([])
// 获取用户收藏列表
const getUsersLoveList = async () => {
  if (!userStore.userInfo._id) return ElMessage.warning('当前用户未登录')
  const res = await userLoveListGet(userStore.userInfo._id)
  console.log(res)
  userLoveList.value = res.data
}

// 标记是否收藏
const isLove = computed(() => (material_id) => {
  return userLoveList.value.some((item) => item.material_id === material_id)
})

// 已收藏
const loveMaterials = async () => {
  // 先获取当前类型的所有素材
  const res = await materialAllGet(1, 999999, props.type)
  allMaterial.value = res.data.list

  // 过滤出已收藏的素材
  const loveIds = new Set(userLoveList.value.map((item) => item.material_id))
  let filteredMaterials = allMaterial.value.filter((material) => loveIds.has(material._id))

  // 如果有选中的分类，根据分类进行过滤
  if (props.currentCateId) {
    filteredMaterials = filteredMaterials.filter(
      (item) => item.top_id === props.currentCateId || item.sub_id === props.currentCateId
    )
  }

  // 更新总数，用于分页计算
  materialStore.setMaterialTotal(filteredMaterials.length)

  // 保存完整的过滤数据用于标签和颜色筛选
  materialStore.setSelectedMaterials(filteredMaterials)

  // 计算当前页的数据
  const start = (materialStore.pages.pagesNum - 1) * materialStore.pages.pagesSize
  const end = start + materialStore.pages.pagesSize
  materialData.value = filteredMaterials.slice(start, end)

  // 更新预览图列表
  currentCoverImg.value = materialData.value.map((item) => item.cover_url)
}

/**
 * 本地+收藏列表
 * @type {import('vue').Ref<loveListModel[]>}
 */
const localLove = ref([])
// 本机有和已收藏叠加筛选
const localLoveListGet = () => {
  localLove.value = [...userLoveList.value, ...userDownLoadList.value]
  const localLoveIds = new Set(localLove.value.map((item) => item.material_id))
  let filteredMaterials = allMaterial.value.filter((material) => localLoveIds.has(material._id))

  // 如果有选中的分类，根据分类进行过滤
  if (props.currentCateId) {
    filteredMaterials = filteredMaterials.filter(
      (item) => item.top_id === props.currentCateId || item.sub_id === props.currentCateId
    )
  }

  // 更新总数，用于分页计算
  materialStore.setMaterialTotal(filteredMaterials.length)

  // 保存完整的过滤数据用于标签和颜色筛选
  materialStore.setSelectedMaterials(filteredMaterials)

  // 计算当前页的数据
  const start = (materialStore.pages.pagesNum - 1) * materialStore.pages.pagesSize
  const end = start + materialStore.pages.pagesSize
  materialData.value = filteredMaterials.slice(start, end)

  // 更新预览图列表
  currentCoverImg.value = materialData.value.map((item) => item.cover_url)
}

// 根据当前选择素材打开本地下载路径
const openLocalMaterial = async (material_id) => {
  console.log(material_id)
  // 将素材进行匹配
  const filterLocal = pathStore.localDownloadPath.filter((item) => item.material_id === material_id)
  if (!filterLocal.length) {
    return ElMessage.warning('当前素材还没有下载')
  }

  await window.electronAPI.openPath(filterLocal[0].localPath)
}

// 处理拖拽开始事件 - 使用原生拖拽
const handleDragStart = async (e, item) => {
  console.log('dragstart event fired')

  // 阻止默认HTML5拖拽
  e.preventDefault()

  if (!isDownloaded.value(item._id)) {
    return
  }

  // 视觉反馈 - 立即添加拖拽中样式
  isDragging.value = true
  e.target.classList.add('dragging')

  try {
    // 查找本地下载信息
    const localPathInfo = pathStore.localDownloadPath.find((path) => path.material_id === item._id)

    if (!localPathInfo) {
      throw new Error('找不到素材的本地文件信息')
    }

    // 获取基础目录路径
    const basePath = localPathInfo.localPath
    if (!basePath) {
      throw new Error('素材路径不存在')
    }

    // 确定素材类型
    let fileType = 'model'
    if (route.path === '/material') {
      fileType = 'material'
    } else if (route.path === '/lighting') {
      fileType = 'light'
    } else if (route.path === '/maps') {
      fileType = 'texture'
    }

    // 根据类型选择不同的txt文件
    let txtFile = 'moldata.txt' // 默认为模型数据

    if (fileType === 'material') {
      txtFile = 'matdata.txt'
    } else if (fileType === 'light') {
      txtFile = 'iesdata.txt'
    }

    console.log(`准备拖拽: 类型=${fileType}, 路径=${basePath}, 数据文件=${txtFile}`)

    // 将路径写入文件并获取对应的脚本文件路径
    const result = await window.electronAPI.prepareAndStartDrag(basePath, fileType, txtFile)

    if (!result.success) {
      throw new Error(result.error || '拖拽准备失败')
    }
  } catch (error) {
    // 错误处理
    console.error('拖拽准备失败:', error)
    ElMessage.warning(error.message || '拖拽准备失败')
    isDragging.value = false
    e.target.classList.remove('dragging')
  }
}

// 拖拽结束处理
const handleDragEnd = (e) => {
  console.log('拖拽结束')
  isDragging.value = false
}

// 添加全局拖拽状态重置函数
const resetDragState = () => {
  if (isDragging.value) {
    isDragging.value = false
    console.log('全局重置拖拽状态')
  }
}

// 平铺贴图
const coverMaps = (materialValue) => {
  if (route.path === '/maps') {
    // 跳转到贴图平铺页面，并传入当前素材的id
    console.log('平铺贴图', materialValue)
    router.push(`/full/${encodeURIComponent(materialValue)}`)
  }
}

// 处理素材功能
const handleFunction = (value, materialValue) => {
  console.log(value, materialValue)
  switch (value) {
    case 'searchPic':
      console.log('以图搜图')
      ElMessage.warning('暂未开放')
      break
    case 'full':
      console.log('平铺')
      coverMaps(materialValue)
      break
    case 'openFile':
      console.log('打开文件夹')
      openLocalMaterial(materialValue)
      break
    case 'love':
      console.log('收藏')
      addMaterialLoveList(materialValue)
      break
  }
}

// 监听分页参数变化
watch(
  () => [materialStore.pages.pagesNum, materialStore.pages.pagesSize],
  ([newPageNum, newPageSize], [oldPageNum, oldPageSize]) => {
    // 当页码或每页条数变化时重新加载数据
    // 变化时重置为第一页（如果只是条数变化）
    if (newPageSize !== oldPageSize) {
      materialStore.setPages({
        pagesNum: 1, // 条数变化时重置到第一页
        pagesSize: newPageSize
      })
    }
    materialDataGet()
  },
  { deep: true }
)

// 监听分类ID变化
watch(
  () => props.currentCateId,
  (newVal) => {
    // 切换分类时重置页码为1
    materialStore.setPages({
      ...materialStore.pages,
      pagesNum: 1
    })
    materialDataGet()
    // 重置筛选状态
    selectedTag.value = '全部'
    selectedColor.value = null
  }
)

// 监视 isDragging 状态变化
watch(isDragging, (newValue) => {
  console.log('拖拽状态变化:', newValue)
})

// 处理鼠标滚轮事件
const handleWheel = (e) => {
  // 检查是否按下 Ctrl 键
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault() // 阻止默认滚动行为

    // 根据滚轮方向调整尺寸
    const delta = e.deltaY > 0 ? -20 : 20
    const newSize = Math.max(minSize, Math.min(maxSize, itemSize.value + delta))

    // 只有当尺寸变化时才更新
    if (newSize !== itemSize.value) {
      itemSize.value = newSize
    }
  }
}

// 定义文件拖拽处理函数
const handleStartFileDrag = (scriptPath, fileType) => {
  // 调用 Electron 的文件拖拽 API
  window.electronAPI.startFileDrag(scriptPath, fileType)
}

defineExpose({
  materialDataGet,
  tagsGetMaterials: handleTagSelect,
  colorGetMaterials: handleColorSelect,
  searchMaterial: handleSearch,
  localMaterials,
  loveMaterials,
  localLoveListGet,
  allMaterialListGet
})

onMounted(() => {
  materialDataGet()
  downLoadListGet()
  getUsersLoveList()

  // 添加滚轮事件监听
  document.addEventListener('wheel', handleWheel, { passive: false })

  // 添加全局鼠标释放事件监听，确保拖拽状态重置
  window.addEventListener('mouseup', resetDragState)

  // 监听 dragend 事件以防止元素处理不到
  document.addEventListener('dragend', resetDragState)

  // 添加拖拽处理监听
  window.electronAPI.onStartFileDrag(handleStartFileDrag)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('wheel', handleWheel)
  window.removeEventListener('mouseup', resetDragState)
  document.removeEventListener('dragend', resetDragState)

  // 移除拖拽监听
  window.electronAPI.removeStartFileDragListener()
})
</script>

<template>
  <div class="sourceMaterial">
    <div class="materialItem" v-for="(item, index) in materialData" :key="item._id"
      :class="{ 'can-drag': isDownloaded(item._id), dragging: isDragging }" draggable="true"
      @dragstart="isDownloaded(item._id) ? handleDragStart($event, item) : $event.preventDefault()"
      @dragend="handleDragEnd($event)" :style="{ width: `${itemSize}px`, height: `${itemSize}px` }">
      <!-- 使用 el-image 替换背景图 -->
      <el-image class="material-image" :src="item.cover_url" :zoom-rate="1.2" :max-scale="7" :min-scale="0.2"
        show-progress :preview-teleported="true" :preview-src-list="currentCoverImg" fit="cover" hide-on-click-modal
        :initial-index="index" />
      <!--   下载    -->
      <div class="download" :class="{ downloadActive: !isDownloaded(item._id) }" style="color: #427b02" @click.stop>
        <i class="iconfont icon-xiazaichenggong" style="font-size: 20px" v-if="isDownloaded(item._id)"></i>
        <i class="iconfont icon-xiazai_xiazai hover-visible" style="font-size: 17px; color: #ffffff; cursor: pointer"
          @click="handleDownload(item)"></i>
      </div>
      <!--   素材信息和功能区   -->
      <div class="InfoFunction" @click.stop>
        <!--   路径信息    -->
        <div class="routeText hover-visible">{{ item.cate_path }}</div>
        <!--   素材名字    -->
        <div class="name" v-if="materialStore.isShowTextName">
          {{ item.name }}
        </div>
        <!--   功能图标    -->
        <div class="functionIcon">
          <!--  以图搜图   -->
          <i class="iconfont icon-fangdajing1 hover-visible" @click="handleFunction('searchPic', item._id)"></i>
          <!--  平铺贴图   -->
          <i v-if="route.path === '/maps'" class="iconfont icon-quanping hover-visible"
            @click="handleFunction('full', item.cover_url)"></i>
          <!--  打开本地文件   -->
          <i class="iconfont icon-wj-wjj hover-visible" @click="handleFunction('openFile', item._id)"></i>
          <!--  收藏  -->
          <i v-if="isLove(item._id)" class="iconfont icon-aixin1" style="color: #fb4409"
            @click="handleFunction('love', item._id)"></i>
          <!--  未收藏  -->
          <i v-else class="iconfont icon-aixin hover-visible" @click="handleFunction('love', item._id)"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/base' as *;

/*素材*/
.sourceMaterial {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  padding: 8px;
  overflow-y: auto;

  /*每一项*/
  .materialItem {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8px;
    /* 宽高由动态样式控制 */
    border: 4px solid #2f2f2f;
    border-radius: 4px;
    transition:
      border 0.2s ease,
      width 0.3s ease,
      height 0.3s ease;
    position: relative;

    // 图片样式
    .material-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      cursor: pointer;
    }

    // 默认隐藏需要悬停才显示的元素
    .hover-visible {
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    /*鼠标悬停*/
    &:hover {
      border: 2px solid #999999;
      transition: 0.3s;
      scale: 1.02;

      // 悬停时显示隐藏的元素
      .hover-visible {
        opacity: 1;
      }
    }

    /*下载区域*/
    .download {
      position: relative;
      z-index: 2; // 提高层级
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .downloadActive {
      justify-content: flex-end;
    }

    /*素材信息和功能*/
    .InfoFunction {
      position: relative;
      z-index: 2; // 提高层级
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 14px;
      color: #fff;

      .name {
        max-width: 200px;
        @include textShenglue(1);
      }

      /*功能图标
      */
      .functionIcon {
        display: flex;
        flex-direction: column;
        gap: 20px;

        .iconfont {
          font-size: 20px;
          cursor: pointer;
        }
      }
    }

    /* 可拖拽项的样式 */
    &.can-drag {
      cursor: grab;

      &:active {
        cursor: grabbing;
      }
    }

    /* 拖拽中的样式 */
    &.dragging {
      opacity: 0.7;
      cursor: grabbing;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      transform: scale(1.05);
    }
  }
}
</style>
