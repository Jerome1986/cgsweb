<script setup>
import { ref } from 'vue'
import { useMaterialStore } from '@/stores'

// 标签状态管理
const materialStore = useMaterialStore()

// 激活下标
const tagsActiveIndex = ref(null)
// 提交处理标签事件
const emits = defineEmits(['changeTags'])

// 处理标签点击
const changeTags = (item, index) => {
  // 如果点击的是当前已选中的标签，则取消选中
  if (tagsActiveIndex.value === index) {
    tagsActiveIndex.value = null
    // 传递"全部"给父组件，表示取消筛选
    emits('changeTags', '')
  } else {
    // 否则选中新标签
    tagsActiveIndex.value = index
    // 传递选中的标签给父组件
    emits('changeTags', item)
  }
}

defineExpose({
  tagsActiveIndex
})
</script>

<template>
  <div class="cate">
    <div class="title">标签</div>
    <div
      class="cateItem cateBox"
      :class="{ tagsActive: tagsActiveIndex === index }"
      v-for="(item, index) in materialStore.currentTags"
      :key="`${item}-${index}`"
      @click="changeTags(item, index)"
    >
      {{ item }}
    </div>
  </div>
</template>

<style scoped lang="scss">
/*分类*/
.cate {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;

  .title {
    padding: 4px 8px;
    width: 60px;
    text-align: center;
  }

  .cateBox {
    padding: 4px 8px;
    text-align: center;
    width: fit-content;
    cursor: pointer;
  }

  .tagsActive {
    background-color: #437a02;
    border-radius: 8px;
  }
}
</style>
