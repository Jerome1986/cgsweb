import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  // 设置当前素材
  const setSelectedMaterials = (val) => {
    selectedMaterials.value = val
  }

  // 显示素材信息
  const isShowTextName = ref(true)
  // 设置素信息
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
    isShowTextName,
    setShowTextName
  }
})
