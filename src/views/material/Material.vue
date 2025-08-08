<script setup>
import Category from '@/components/Category.vue'
import Filter from '@/components/Filter.vue'
import MaterialTags from '@/components/MaterialTags.vue'
import SourceMaterial from '@/components/SourceMaterial.vue'
import SubCategory from '@/components/SubCategory.vue'
import ColorTags from '@/components/ColorTags.vue'

import { ref, onMounted } from 'vue'
import { useMaterialStore } from '@/stores'
import { useCateStore } from '@/stores/modules/cate'
import { filterMaterialApi, searchMaterial } from '@/api/material'

// 一级分类组件
const topCategoryRef = ref(null)
// 二级分类组件
const subCateRef = ref(null)
// 素材组件
const materialRef = ref(null)
// 标签组件
const tagsRef = ref(null)
// 颜色组件
const colorsTagRef = ref(null)
// 筛选组件
const filterRef = ref(null)
// 素材状态管理
const materialStore = useMaterialStore()
const cateStore = useCateStore()

// 当前选择的分类id
const currentMapsCateId = ref('NEW')
const topCateId = ref('')
// 处理一级分类的点击事件
const currentSubCate = ref([])
const handleTopCate = async (id) => {
  console.log('一级分类id', id)
  topCateId.value = id
  currentMapsCateId.value = id
  await cateStore.cateSubGet(id)

  currentSubCate.value = cateStore.cateSubList
  // 如果二级分类存在追加一个全部
  if (currentSubCate.value?.length > 0) {
    currentSubCate.value.unshift({ _id: 'ALL', en_name: 'all', name: '全部' })
  }

  // 切换分类时先将页码重新设置为第一页
  materialStore.setPages({ pagesNum: 1 })
  // 点击一级分类对应的素材
  await materialStore.selectedMaterialGet(
    '材质',
    currentMapsCateId.value,
    materialStore.pages.pagesNum,
    materialStore.pages.pagesSize
  )

  console.log('隐藏信息', materialStore.isShowTextName)

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
const handleSubCate = async (subCate) => {
  // 如果为全部则根据一级分类id来渲染素材--否则根据二级分类id来渲染素材
  if (subCate._id === 'ALL') {
    currentMapsCateId.value = topCateId.value
  } else {
    currentMapsCateId.value = subCate._id
  }

  // 切换分类时先将页码重新设置为第一页
  materialStore.setPages({ pagesNum: 1 })
  // 利用素材组件暴露的方法来渲染
  await materialStore.selectedMaterialGet(
    '材质',
    currentMapsCateId.value,
    materialStore.pages.pagesNum,
    materialStore.pages.pagesSize
  )

  // 重置标签高亮
  tagsRef.value.tagsActiveIndex = null

  // 重置颜色标签高亮
  colorsTagRef.value.colorActiveIndex = null

  //  重置筛选框
  filterRef.value.reset()
}

// 处理标签组件的点击事件
const selectedTag = ref('')
const handleChangeTags = async (tag) => {
  console.log('当前标签', tag)
  //  重置筛选框
  filterRef.value.reset()
  // 切换时先将页码重新设置为第一页
  materialStore.setPages({ pagesNum: 1 })
  selectedTag.value = tag
  await fetchFilteredMaterials(materialStore.pages.pagesNum, materialStore.pages.pagesSize)
}

// 处理颜色标签
const selectedColor = ref('')
const handleChangeColorsTag = async (color) => {
  console.log('当前颜色下标', color)
  //  重置筛选框
  filterRef.value.reset()
  // 切换时先将页码重新设置为第一页
  materialStore.setPages({ pagesNum: 1 })
  selectedColor.value = color
  await fetchFilteredMaterials(materialStore.pages.pagesNum, materialStore.pages.pagesSize)
}

// 标签和颜色联合筛选
const fetchFilteredMaterials = async (pagesNum, pagesSize) => {
  console.log('当前分类', currentMapsCateId.value)
  if (currentMapsCateId.value === 'NEW') {
    // 当前页面类型下的所有素材
    const res = await filterMaterialApi('材质', '', selectedTag.value, selectedColor.value, pagesNum, pagesSize)
    materialStore.setSelectedMaterials(res.data.list)
    materialStore.setMaterialTotal(res.data.total)
  } else {
    const res = await filterMaterialApi(
      '材质',
      currentMapsCateId.value,
      selectedTag.value,
      selectedColor.value,
      pagesNum,
      pagesSize
    )
    materialStore.setSelectedMaterials(res.data.list)
    materialStore.setMaterialTotal(res.data.total)
  }
}

// 搜索函数
const searchFunction = async (value) => {
  // 切换时先将页码重新设置为第一页
  materialStore.setPages({ pagesNum: 1 })
  // 请求搜索后的数据
  const res = await searchMaterial(
    currentMapsCateId.value,
    '材质',
    selectedTag.value,
    selectedColor.value,
    value,
    materialStore.pages.pagesNum,
    materialStore.pages.pagesSize
  )
  materialStore.setSelectedMaterials(res.data)
  materialStore.setMaterialTotal(res.total)

  // 重置筛选框，但保留显示信息的状态
  const isShowText = materialStore.isShowTextName
  filterRef.value.reset()
  materialStore.setShowTextName(isShowText)
}

// 处理搜索查询
const searchValue = ref('')
const handleSearch = async (value) => {
  searchValue.value = value
  await searchFunction(value)
}

// 清空搜索
const handelClearSearch = async () => {
  console.log('清空搜索')
  searchValue.value = ''
  // 切换时先将页码重新设置为第一页
  materialStore.setPages({ pagesNum: 1 })
  if (!searchValue.value) {
    await fetchFilteredMaterials(materialStore.pages.pagesNum, materialStore.pages.pagesSize)
  }
}

// 处理其他筛选
let hasCollect
let hasDownload
let lastHasShowText = false
let lastFilterConditions = {}

const handleFilter = async (checkListFilter) => {
  const hasDownload = checkListFilter.includes('download')
  const hasCollect = checkListFilter.includes('collect')
  const hasShowText = checkListFilter.includes('showText')

  // 筛选条件
  const filterConditions = { hasDownload, hasCollect, tag: selectedTag.value, color: selectedColor.value }
  const isFilterChanged = JSON.stringify(filterConditions) !== JSON.stringify(lastFilterConditions)
  lastFilterConditions = filterConditions

  // 如果只是切文字
  if (!isFilterChanged) {
    materialStore.setShowTextName(hasShowText)
    return
  }

  // 重置页码
  materialStore.setPages({ pagesNum: 1 })
  filterRef.value.clearSearch()
  searchValue.value = ''

  // 一次性执行（等数据回来再切文字）
  await doFilterData(filterConditions)
  materialStore.setShowTextName(hasShowText)
}

// 筛选函数
async function doFilterData({ hasDownload, hasCollect, tag, color }) {
  switch (true) {
    case hasDownload && hasCollect:
      await materialRef.value.bothLocalAndLoved('材质', currentMapsCateId.value, tag, color)
      break
    case hasDownload:
      await materialRef.value.localMaterials('材质', currentMapsCateId.value, tag, color)
      break
    case hasCollect:
      await materialRef.value.loveMaterials('材质', currentMapsCateId.value, tag, color)
      break
    default:
      if (tag || color) {
        await fetchFilteredMaterials(materialStore.pages.pagesNum, materialStore.pages.pagesSize)
      } else {
        await materialStore.selectedMaterialGet(
          '材质',
          currentMapsCateId.value,
          materialStore.pages.pagesNum,
          materialStore.pages.pagesSize
        )
      }
  }
}

// 重置筛选
const handleReset = async () => {
  console.log('reset')
  if (selectedTag.value || selectedColor.value) {
    await fetchFilteredMaterials(materialStore.pages.pagesNum, materialStore.pages.pagesSize)
  } else {
    await materialStore.selectedMaterialGet(
      '材质',
      currentMapsCateId.value,
      materialStore.pages.pagesNum,
      materialStore.pages.pagesSize
    )
  }
}

// 处理分页
const handleNum = async (num) => {
  console.log(searchValue.value, selectedTag.value, selectedColor.value, currentMapsCateId.value)
  if (searchValue.value) {
    // 搜索模式
    await searchFunction(searchValue.value)
  } else if (selectedTag.value || selectedColor.value) {
    //  只要有一个存在说明是筛选模式
    await fetchFilteredMaterials(num, materialStore.pages.pagesSize)
  } else if (hasCollect) {
    await materialRef.value.loveMaterials('材质', currentMapsCateId.value, selectedTag.value, selectedColor.value)
  } else if (hasDownload) {
    await materialRef.value.localMaterials('材质', currentMapsCateId.value, selectedTag.value, selectedColor.value)
  } else if (hasCollect || hasDownload) {
    await materialRef.value.bothLocalAndLoved('材质', currentMapsCateId.value, selectedTag.value, selectedColor.value)
  } else if (currentMapsCateId.value) {
    console.log('分类分页')
    await materialStore.selectedMaterialGet('材质', currentMapsCateId.value, num, materialStore.pages.pagesSize)
  }
}

const handleSize = async (size) => {
  if (searchValue.value) {
    // 搜索模式
    await searchFunction(searchValue.value)
  } else if (selectedTag.value || selectedColor.value) {
    //  只要有一个存在说明是筛选模式
    await fetchFilteredMaterials(materialStore.pages.pagesNum, size)
  } else if (hasCollect) {
    await materialRef.value.loveMaterials('材质', currentMapsCateId.value, selectedTag.value, selectedColor.value)
  } else if (hasDownload) {
    await materialRef.value.localMaterials('材质', currentMapsCateId.value, selectedTag.value, selectedColor.value)
  } else if (hasCollect || hasDownload) {
    await materialRef.value.bothLocalAndLoved('材质', currentMapsCateId.value, selectedTag.value, selectedColor.value)
  } else if (currentMapsCateId.value) {
    console.log('分类分页')
    await materialStore.selectedMaterialGet('材质', currentMapsCateId.value, materialStore.pages.pagesNum, size)
  }
}

onMounted(async () => {
  await Promise.all([
    // 获取一级分类
    cateStore.cateFirstGet('材质'),
    // 根据页面类型或者分类显示素材
    materialStore.selectedMaterialGet(
      '材质',
      currentMapsCateId.value,
      materialStore.pages.pagesNum,
      materialStore.pages.pagesSize
    )
  ])
})
</script>

<template>
  <div class="materialPage">
    <el-affix position="top" :offset="50" target=".materialPage">
      <!--  分类  -->
      <div class="categoryPage">
        <!--   一级分类     -->
        <Category ref="topCategoryRef" title="" :data-list="cateStore.cateFirstList" @changeCate="handleTopCate">
        </Category>
        <!--   二级分类     -->
        <SubCategory
          ref="subCateRef"
          v-if="currentSubCate?.length > 0"
          :subCategoryData="currentSubCate"
          @changeSubCate="handleSubCate"
        ></SubCategory>
        <!--    标签    -->
        <MaterialTags ref="tagsRef" @changeTags="handleChangeTags"></MaterialTags>
        <!--   颜色     -->
        <ColorTags ref="colorsTagRef" @changeColor="handleChangeColorsTag"></ColorTags>
      </div>
      <!--  筛选  -->
      <Filter
        ref="filterRef"
        @search="handleSearch"
        @clearSearch="handelClearSearch"
        @filter="handleFilter"
        @reset="handleReset"
        @changeSize="handleSize"
        @changeNum="handleNum"
      ></Filter>
    </el-affix>

    <!--  素材  -->
    <SourceMaterial ref="materialRef"></SourceMaterial>
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
