<script setup>
import { onMounted, ref, watch, computed } from 'vue'
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
import { useRoute } from 'vue-router'

const props = defineProps({
  type: String,
  currentCateId: {
    type: String,
    default: ''
  }
})

// 获取当前路由对象
const route = useRoute()

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

  // 扣除用户金币和下载次数
  await handleUserCoinsOrTimes(item._id)

  const downloadUrl = item.files_url
  const fileName = `${item.name || 'file'}_${Date.now()}.zip`

  try {
    ElMessage.warning('已添加到下载列表')

    const downloadedPath = await window.electronAPI.downloadFile(
      downloadUrl,
      pathStore.downloadPath, // 基础路径（如 app.getPath('downloads')）
      item.type, // 分类目录名（如"模型"）
      fileName // 文件名
    )
    // 找到文件名前的最后一个反斜杠位置
    const lastSlashIndex = downloadedPath.lastIndexOf('\\')
    // 提取文件名前的所有路径
    const dirPath = downloadedPath.substring(0, lastSlashIndex)
    // 构建信息
    const pathValue = {
      material_id: item._id,
      localPath: dirPath
    }
    // 添加到本地下载路径列表
    pathStore.setLocalDownloadPath(pathValue)

    // 下载成功后添加到用户的下载列表
    const addRes = await userDownLoadListAdd(userStore.userInfo._id, item._id)
    if (addRes.code === 200) {
      ElMessage.success(`${addRes.message},文件已下载到: ${downloadedPath}`)
      await window.electronAPI.openPath(pathStore.downloadPath)
      await downLoadListGet()
    }
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + error.message)
  }
}

/**
 * 用户下载列表
 * @type {import('vue').Ref<downloadListModel[]>}
 */
const userDownLoadList = ref([])
const downLoadListGet = async () => {
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
  // 将素材进行匹配
  const filterLocal = pathStore.localDownloadPath.filter(
    (item) => item.material_id === material_id
  )
  if (!filterLocal.length) {
    return ElMessage.warning('当前素材还没有下载')
  }

  await window.electronAPI.openPath(filterLocal[0].localPath)
}

// 平铺贴图
const coverMaps = (material_id) => {
  if (route.path === '/maps') {
    // 跳转到贴图平铺页面，并传入当前素材的id
    console.log('平铺贴图', material_id)
  }
}

// 处理素材功能
const handleFunction = (value, material_id) => {
  console.log(value, material_id)
  switch (value) {
    case 'searchPic':
      console.log('以图搜图')
      ElMessage.warning('暂未开放')
      break
    case 'full':
      console.log('平铺')
      coverMaps(material_id)
      break
    case 'openFile':
      console.log('打开文件夹')
      openLocalMaterial(material_id)
      break
    case 'love':
      console.log('收藏')
      addMaterialLoveList(material_id)
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
  console.log('路径', route)
})
</script>

<template>
  <div class="sourceMaterial">
    <div
      class="materialItem"
      v-for="(item, index) in materialData"
      :key="index"
    >
      <!-- 使用 el-image 替换背景图 -->
      <el-image
        class="material-image"
        :src="item.cover_url"
        show-progress
        :preview-teleported="true"
        :preview-src-list="currentCoverImg"
        fit="cover"
        hide-on-click-modal
        :initial-index="index"
      />
      <!--   下载    -->
      <div
        class="download"
        :class="{ downloadActive: !isDownloaded(item._id) }"
        style="color: #427b02"
        @click.stop
      >
        <i
          class="iconfont icon-xiazaichenggong"
          style="font-size: 20px"
          v-if="isDownloaded(item._id)"
        ></i>
        <i
          class="iconfont icon-xiazai_xiazai"
          style="font-size: 17px; color: #ffffff; cursor: pointer"
          @click="handleDownload(item)"
        ></i>
      </div>
      <!--   素材信息和功能区   -->
      <div class="InfoFunction" @click.stop>
        <!--   路径信息    -->
        <div class="routeText">{{ item.cate_path }}</div>
        <!--   素材名字    -->
        <div class="name" v-if="materialStore.isShowTextName">
          {{ item.name }}
        </div>
        <!--   功能图标    -->
        <div class="functionIcon">
          <!--  以图搜图   -->
          <i
            class="iconfont icon-fangdajing1"
            @click="handleFunction('searchPic', item._id)"
          ></i>
          <!--  平铺贴图   -->
          <i
            v-if="route.path === '/maps'"
            class="iconfont icon-quanping"
            @click="handleFunction('full', item._id)"
          ></i>
          <!--  打开本地文件   -->
          <i
            class="iconfont icon-wj-wjj"
            @click="handleFunction('openFile', item._id)"
          ></i>
          <!--  收藏  -->
          <i
            v-if="isLove(item._id)"
            class="iconfont icon-aixin1"
            style="color: #fb4409"
            @click="handleFunction('love', item._id)"
          ></i>
          <!--  未收藏  -->
          <i
            v-else
            class="iconfont icon-aixin"
            @click="handleFunction('love', item._id)"
          ></i>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/base' as *;

/*素材*/
.sourceMaterial {
  display: grid;
  grid-template-columns: repeat(auto-fit, 405px);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;

  /*每一项*/
  .materialItem {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8px;
    width: 405px;
    height: 405px;
    border: 4px solid #2f2f2f;
    border-radius: 4px;
    transition: border 0.2s ease;
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

    /*鼠标悬停*/
    &:hover {
      border: 2px solid #999999;
      transition: 0.3s;
      scale: 1.02;
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
  }
}
</style>
