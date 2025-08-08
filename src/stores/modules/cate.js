import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cateFirstGetApi, cateSubGetApi } from '@/api/cate'

export const useCateStore = defineStore('cate', () => {
  //  一级分类
  const cateFirstList = ref([])

  //   获取一级分类
  const cateFirstGet = async (pageType) => {
    const res = await cateFirstGetApi(pageType)
    console.log('一级分类', res)
    cateFirstList.value = res.data
    cateFirstList.value.unshift({ _id: 'NEW', en_name: 'new', name: 'new' })
  }

  // 二级分类
  const cateSubList = ref([])

  // 根据一级分类id获取二级分类
  const cateSubGet = async (cateId) => {
    const res = await cateSubGetApi(cateId)
    console.log('二级分类', res)
    cateSubList.value = res.data[0]?.subCategories
  }

  return {
    cateFirstList,
    cateFirstGet,
    cateSubList,
    cateSubGet
  }
})
