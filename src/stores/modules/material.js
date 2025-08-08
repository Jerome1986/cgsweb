import { defineStore } from 'pinia'
import { ref } from 'vue'
import { materialByCateIdGetApi } from '@/api/material'

export const useMaterialStore = defineStore('material', () => {
  //  当前素材下的所有标签
  const currentTags = ref([])

  // 设置当前素材下的所有标签
  const setCurrentTags = (val) => {
    currentTags.value = val
  }

  // 当前素材下的颜色标签
  const colorTags = ref([])

  // 设置当前素材下的颜色标签
  const setColorTags = (val) => {
    colorTags.value = val
  }

  // 分页
  const pages = ref({
    pagesNum: 1,
    pagesSize: 10
  })

  // 设置页码
  const setPages = (val) => {
    pages.value = { ...pages.value, ...val }
  }

  // 总条数
  const materialTotal = ref(0)

  // 设置总条数
  const setMaterialTotal = (val) => {
    materialTotal.value = val
  }

  /**
   * 当前所渲染的素材
   * @type {import('vue').Ref<materialModel[]>}
   */
  const selectedMaterials = ref([])

  // 当前选择的封面图
  const currentCoverImg = ref([])

  // 设置当前素材
  const setSelectedMaterials = (val) => {
    selectedMaterials.value = val
    // 封面图
    currentCoverImg.value = selectedMaterials.value.map((item) => item.cover_url)
  }

  // 根据页面类型或者分类来渲染素材
  const selectedMaterialGet = async (pageType, cate_id, pagesNum, pagesSize) => {
    const res = await materialByCateIdGetApi(pageType, cate_id, pagesNum, pagesSize)
    console.log('素材结果', res)
    selectedMaterials.value = res.data.list
    materialTotal.value = res.data.total
    // 封面图
    currentCoverImg.value = selectedMaterials.value.map((item) => item.cover_url)
    // 标签
    currentTags.value = res.data.tags
    console.log('标签', currentTags.value)

    //  颜色标签
    colorTags.value = res.data.colors
  }

  // 显示素材信息
  const isShowTextName = ref(false)
  // 设置素材信息
  const setShowTextName = (val) => {
    isShowTextName.value = val
  }

  return {
    currentTags,
    setCurrentTags,
    colorTags,
    setColorTags,
    pages,
    setPages,
    materialTotal,
    setMaterialTotal,
    selectedMaterials,
    setSelectedMaterials,
    selectedMaterialGet,
    currentCoverImg,
    isShowTextName,
    setShowTextName
  }
})
