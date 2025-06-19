<script setup>
import Category from '@/components/Category.vue'
import Filter from '@/components/Filter.vue'
import MaterialTags from '@/components/MaterialTags.vue'
import SourceMaterial from '@/components/SourceMaterial.vue'
import SubCategory from '@/components/SubCategory.vue'
import ColorTags from '@/components/ColorTags.vue'

import { ref, onMounted } from 'vue'
import { useMaterialStore } from '@/stores'
import { cateDataGetAll } from '@/api/cate'

// 一级分类组件
const topCategoryRef = ref(null)
// 二级分类组件
const subCateRef = ref(null)
// 素材组件
const materialRef = ref(null)
// 标签组件
const tagsRef = ref(null)
// 筛选组件
const filterRef = ref(null)
// 素材状态管理
const materialStore = useMaterialStore()

/**
 * 一级分类
 * @type {import('vue').Ref<topCateModel[]>}
 */
const topCate = ref([])

/**
 * 二级分类
 * @type {import('vue').Ref<subCateModel[]>}
 */
const subCate = ref([])

// 一次性获取所有分类
const cateGetAll = async () => {
  const res = await cateDataGetAll()
  console.log(res.data.list)
  // 一级分类
  topCate.value = res.data.list.filter((item) => item.type === '材质')

  // 二级分类
  subCate.value = topCate.value.flatMap((item) => item.subCategories || [])
}
// 当前选择的分类id
const currentMapsCateId = ref('')

// 处理一级分类的点击事件
const currentSubCate = ref([])
const topCateId = ref('')
const handleTopCate = (id) => {
  console.log('一级分类id', id)
  topCateId.value = id
  currentMapsCateId.value = topCateId.value
  // 根据当前一级分类id筛选二级分类
  currentSubCate.value = subCate.value.filter((item) => item.parent_id === id)
  currentSubCate.value.unshift({ _id: 'ALL', en_name: 'all', name: '全部' })
  // 获取一级分类素材
  materialRef.value.materialDataGet('材质', currentMapsCateId.value)
  // 重置二级分类的高亮状态
  if (subCateRef.value) {
    subCateRef.value.subActiveIndex = null
  }
  // 重置标签高亮
  tagsRef.value.tagsActiveIndex = null
  // 重置颜色标签高亮
  colorsTagRef.value.colorActiveIndex = null
  //  重置筛选框
  filterRef.value.reset()
}

// 处理二级分类点击事件
const handleSubCate = (subCate) => {
  // 如果为全部则根据一级分类id来渲染素材--否则根据二级分类id来渲染素材
  if (subCate._id === 'ALL') {
    currentMapsCateId.value = topCateId.value
  } else {
    currentMapsCateId.value = subCate._id
  }

  // 利用素材组件暴露的方法来渲染
  materialRef.value.materialDataGet('材质', currentMapsCateId.value)

  // 重置标签高亮
  tagsRef.value.tagsActiveIndex = null

  // 重置颜色标签高亮
  colorsTagRef.value.colorActiveIndex = null

  //  重置筛选框
  filterRef.value.reset()
}

// 处理标签组件的点击事件
const handleChangeTags = (tag) => {
  console.log('当前标签', tag)
  materialRef.value.tagsGetMaterials(tag)
  //  重置筛选框
  filterRef.value.reset()
}

// 处理颜色标签
const colorsTagRef = ref(null)
const handleChangeColorsTag = (color) => {
  console.log('当前颜色下标', colorsTagRef.value.colorActiveIndex)
  if (colorsTagRef.value) {
    materialRef.value.colorGetMaterials(
      color,
      colorsTagRef.value.colorActiveIndex
    )
  }
  //  重置筛选框
  filterRef.value.reset()
}

// 处理搜索查询
const handleSearch = (value) => {
  console.log('搜索', value)

  // 查询获取素材
  materialRef.value.searchMaterial(value)

  // 只重置标签相关的高亮
  tagsRef.value.tagsActiveIndex = null
  colorsTagRef.value.colorActiveIndex = null
}

// 清空搜索
const handelClearSearch = () => {
  materialRef.value.searchMaterial('')
}

// 重置分类和标签和搜索框函数
const resetCateTag = () => {
  // 重置一级分类高亮
  topCategoryRef.value.cateActiveIndex = null
  // 重置二级分类高亮
  if (subCateRef.value) {
    subCateRef.value.subActiveIndex = null
    currentSubCate.value = []
  }
  // 重置标签高亮
  tagsRef.value.tagsActiveIndex = null
  // 重置颜色标签高亮
  colorsTagRef.value.colorActiveIndex = null
  // 重置搜索框
  filterRef.value.clearSearch()
}

// 处理其他筛选
const handleFilter = (checkListFilter) => {
  const hasDownload = checkListFilter.includes('download')
  const hasCollect = checkListFilter.includes('collect')
  const hasShowText = checkListFilter.includes('showText')
  // 单独控制文本显示
  if (hasShowText) {
    materialStore.setShowTextName(false)
  } else {
    materialStore.setShowTextName(true)
  }

  // 根据勾选状态筛选 -- 控制下载和收藏
  switch (true) {
    case hasDownload && hasCollect:
      console.log('下载、收藏')
      materialRef.value.localLoveListGet()
      resetCateTag()
      break
    case hasDownload:
      console.log('下载')
      materialRef.value.localMaterials()
      // 不再重置分类
      break
    case hasCollect:
      console.log('收藏')
      materialRef.value.loveMaterials()
      // 不再重置分类
      break
    // 无选择 - 显示当前分类的所有素材
    default:
      console.log('显示当前分类素材')
      materialRef.value.materialDataGet('材质', currentMapsCateId.value)
      break
  }
}

// 重置筛选
const handleReset = async () => {
  await materialRef.value.allMaterialListGet()
}

onMounted(() => {
  cateGetAll()
})
</script>

<template>
  <div class="materialPage">
    <el-affix position="top" :offset="50" target=".materialPage">
      <!--  分类  -->
      <div class="categoryPage">
        <!--   一级分类     -->
        <Category ref="topCategoryRef" title="" sub-title="new" :data-list="topCate" @changeCate="handleTopCate">
        </Category>
        <!--   二级分类     -->
        <SubCategory ref="subCateRef" v-if="currentSubCate.length > 0" :subCategoryData="currentSubCate"
          @changeSubCate="handleSubCate"></SubCategory>
        <!--    标签    -->
        <MaterialTags ref="tagsRef" @changeTags="handleChangeTags"></MaterialTags>
        <!--   颜色     -->
        <ColorTags ref="colorsTagRef" @changeColor="handleChangeColorsTag"></ColorTags>
      </div>
      <!--  筛选  -->
      <Filter ref="filterRef" @search="handleSearch" @clearSearch="handelClearSearch" @filter="handleFilter"
        @reset="handleReset"></Filter>
    </el-affix>

    <!--  素材  -->
    <SourceMaterial ref="materialRef" type="材质" :currentCateId="currentMapsCateId"></SourceMaterial>
  </div>
</template>

<style lang="scss" scoped>
.materialPage {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 110px);
  overflow: hidden;
  position: relative;

  .el-affix {

    /*分类组件*/
    .categoryPage {
      padding: 16px;
      background-color: #2f2f2f;
      flex-shrink: 0;
    }
  }
}
</style>
