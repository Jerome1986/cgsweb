<script setup>
import { onMounted, ref, watch, computed, onUnmounted, nextTick } from 'vue'
import { materialAllGet, searchMaterial } from '@/api/material'
import { useMaterialStore } from '@/stores/modules/material'
import { usePathStore, useUserStore } from '@/stores'
import { ElMessage } from 'element-plus'
import {
  useCoins,
  userDownLoadListAdd,
  userDownLoadListGet,
  userLoveListAdd,
  userLoveListGet
} from '@/api/users'
import { useRoute, useRouter } from 'vue-router'
import fs from 'fs'

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

// 在适当位置添加拖拽相关状态
const isDragging = ref(false)

// 获取所有素材
const allMaterialListGet = async () => {
  const res = await materialAllGet(
    materialStore.pages.pagesNum,
    materialStore.pages.pagesSize,
    props.type
  )
  allMaterial.value = res.data.list
  materialData.value = res.data.list
  // 存储返回的总条数
  materialStore.setMaterialTotal(res.data.total)
}

// 获取当前素材数据
const materialDataGet = async () => {
  await allMaterialListGet()
  if (!props.currentCateId) {
    materialStore.setSelectedMaterials(allMaterial.value)
  } else {
    const filteredData = allMaterial.value.filter(
      (item) =>
        item.top_id === props.currentCateId ||
        item.sub_id === props.currentCateId
    )
    materialStore.setSelectedMaterials(filteredData)
  }

  // 封面图预览列表
  currentCoverImg.value = materialStore.selectedMaterials.map(
    (item) => item.cover_url
  )

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
    filtered = filtered.filter((item) =>
      item.colors.includes(selectedColor.value)
    )
  }

  materialData.value = filtered
  currentCoverImg.value = filtered.map((item) => item.cover_url)
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
      '模型'
    )
    materialData.value = res.data
  }
}

// 处理下载成功后扣除用户金币或次数的函数
const handleUserCoinsOrTimes = async (material_id) => {
  // 重置用户下载列表
  await downLoadListGet()
  pathStore.setLocalDownloadPath(userDownLoadList.value)
  // 如果用户有金币则扣除金币，如果没有金币，但用户为会员，则检查当日是否有下载次数，如果有，则扣除-1，且记录当日剩余下载次数
  // 1.查询当前用户金币数量

  const res = await useCoins(userStore.userInfo._id, material_id)
  console.log('更新金币结果', res)
  if (res.coins) {
    userStore.setUserInfo({ coins: res.coins })
  }
}

/**
 * 处理点击下载
 * @param {materialModel} item - 当前素材对象信息
 * @returns {Promise<void>}
 */
const handleDownload = async (item) => {
  console.log('下载', item)

  if (pathStore.downloadPath === '未设置') {
    ElMessage.error('请先设置下载路径')
    return
  }

  try {
    // 扣除用户金币和下载次数
    await handleUserCoinsOrTimes(item._id)

    // 提取必要的原始数据类型
    const downloadUrl = String(item.files_url)
    const fileName = `${String(item.name || 'file')}_${Date.now()}.zip`
    const itemType = String(item.type || props.type)
    const materialId = String(item._id)
    const basePath = String(pathStore.downloadPath)

    ElMessage.warning('已添加到下载列表')

    // 使用原始数据类型进行 IPC 通信
    const downloadedPath = await window.electronAPI.downloadFile(
      downloadUrl,
      basePath,
      itemType,
      fileName
    )

    if (!downloadedPath) {
      throw new Error('下载路径无效')
    }

    // 处理返回的路径 - 使用字符串方法
    const pathStr = String(downloadedPath)
    const lastBackslashIndex = pathStr.lastIndexOf('\\')
    const lastForwardSlashIndex = pathStr.lastIndexOf('/')
    const lastSlashIndex = Math.max(lastBackslashIndex, lastForwardSlashIndex)

    if (lastSlashIndex === -1) {
      throw new Error('无法解析下载路径')
    }

    // 提取目录路径
    const dirPath = pathStr.substring(0, lastSlashIndex)

    // 添加到本地下载路径列表 - 使用简单对象
    pathStore.setLocalDownloadPath({
      material_id: materialId,
      localPath: dirPath
    })

    // 下载成功后添加到用户的下载列表
    const addRes = await userDownLoadListAdd(userStore.userInfo._id, materialId)

    if (addRes.code === 200) {
      ElMessage.success(`${addRes.message},文件已下载到: ${pathStr}`)

      // 注释掉自动打开文件夹的功能
      // try {
      //   await window.electronAPI.openPath(basePath)
      // } catch (openError) {
      //   console.error('打开目录失败:', openError)
      // }

      // 刷新下载列表
      await downLoadListGet()
    }
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error(`下载失败: ${error?.message || '未知错误'}`)
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

// 获取用户下载列表标记下载状态
const isDownloaded = computed(() => (material_id) => {
  return userDownLoadList.value.some((item) => item.material_id === material_id)
})

// 本机有
const localMaterials = () => {
  const downloadIds = new Set(
    userDownLoadList.value.map((item) => item.material_id)
  )
  materialData.value = allMaterial.value.filter((material) =>
    downloadIds.has(material._id)
  )
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
const loveMaterials = () => {
  const userLoveListIds = new Set(
    userLoveList.value.map((item) => item.material_id)
  )
  materialData.value = allMaterial.value.filter((material) =>
    userLoveListIds.has(material._id)
  )
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
  materialData.value = allMaterial.value.filter((material) =>
    localLoveIds.has(material._id)
  )
}

// 根据当前选择素材打开本地下载路径
const openLocalMaterial = async (material_id) => {
  console.log(material_id)
  // 将素材进行匹配
  const filterLocal = pathStore.localDownloadPath.filter(
    (item) => item.material_id === material_id
  )
  if (!filterLocal.length) {
    return ElMessage.warning('当前素材还没有下载')
  }

  await window.electronAPI.openPath(filterLocal[0].localPath)
}

// 处理拖拽开始事件 - 使用原生拖拽
const handleDragStart = (e, item) => {
  console.log('dragstart event fired')

  // 阻止默认HTML5拖拽
  e.preventDefault()

  if (!isDownloaded.value(item._id)) {
    ElMessage.warning('请先下载素材后再拖拽')
    return
  }

  // 视觉反馈 - 立即添加拖拽中样式
  isDragging.value = true
  e.target.classList.add('dragging')

  // 查找本地下载信息
  const filterLocal = pathStore.localDownloadPath.filter(
    (path) => path.material_id === item._id
  )

  if (filterLocal.length) {
    const dirPath = filterLocal[0].localPath
    const namePattern = `${item.name}*.zip`

    // 获取文件后启动原生拖拽
    window.electronAPI
      .getFilesInDirectory(dirPath, namePattern)
      .then((files) => {
        if (files.length > 0) {
          // 找到最新的文件
          const sortedFiles = files.sort((a, b) => {
            try {
              const statA = fs.statSync(a)
              const statB = fs.statSync(b)
              return statB.mtime.getTime() - statA.mtime.getTime()
            } catch (error) {
              return 0
            }
          })

          const fullPath = sortedFiles[0]
          console.log('启动原生拖拽文件:', fullPath)

          // 使用原生拖拽API - 最小化窗口的逻辑移到了主进程中
          window.electronAPI.startFileDrag(fullPath)

          // 设置一个定时器来恢复样式，因为dragend可能不会触发
          setTimeout(() => {
            isDragging.value = false
            const items = document.querySelectorAll('.materialItem')
            items.forEach((item) => item.classList.remove('dragging'))
          }, 1000) // 1秒后恢复正常样式
        } else {
          // 如果没有找到文件，恢复正常样式
          isDragging.value = false
          e.target.classList.remove('dragging')
          ElMessage.warning('在下载文件夹中找不到匹配的文件')
        }
      })
      .catch((error) => {
        // 出错时恢复正常样式
        isDragging.value = false
        e.target.classList.remove('dragging')
        console.error('拖拽错误:', error)
        ElMessage.error('准备拖拽文件时出错')
      })
  } else {
    // 找不到文件信息时恢复正常样式
    isDragging.value = false
    e.target.classList.remove('dragging')
    ElMessage.warning('找不到素材的本地文件信息')
  }
}

// 拖拽结束处理
const handleDragEnd = (e) => {
  isDragging.value = false
  e.target.classList.remove('dragging')
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
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('wheel', handleWheel)
})
</script>

<template>
  <div class="sourceMaterial">
    <div class="materialItem" v-for="(item, index) in materialData" :key="item._id"
      :class="{ 'can-drag': isDownloaded(item._id), dragging: isDragging }" draggable="true" @dragstart="
        isDownloaded(item._id)
          ? handleDragStart($event, item)
          : $event.preventDefault()
        " @dragend="handleDragEnd($event)" :style="{ width: `${itemSize}px`, height: `${itemSize}px` }">
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
          <i v-else class="iconfont icon-aixin" @click="handleFunction('love', item._id)"></i>
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
      border: 4px solid #427b02 !important;
      transform: scale(0.95);
    }
  }
}
</style>
