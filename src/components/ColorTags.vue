<script setup>
import { ref } from 'vue'
import { useMaterialStore } from '@/stores'

// 素材状态管理
const materialStore = useMaterialStore()
// 当前激活的颜色下标
const colorActiveIndex = ref(null)

// 提交处理颜色标签事件
const emits = defineEmits(['changeColor'])
// 处理颜色标签
const handleColor = (color, index) => {
  if (colorActiveIndex.value === index) {
    // 点击已选中的标签，取消高亮
    colorActiveIndex.value = null
  } else {
    // 点击新标签，高亮新标签
    colorActiveIndex.value = index
  }
  emits('changeColor', color)
}

// 将激活下标表露给父组件
defineExpose({
  colorActiveIndex
})
</script>

<template>
  <div class="colorTag">
    <div class="title colorBox">颜色</div>
    <div
      class="colorItem"
      :class="{ colorActive: colorActiveIndex === index }"
      v-for="(item, index) in materialStore.colorTags"
      :key="`${item}-${index}`"
      :style="{ backgroundColor: item }"
      @click="handleColor(item, index)"
    ></div>
  </div>
</template>

<style scoped lang="scss">
/* 原有样式保持不变 */
.colorTag {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;

  .title {
    padding: 4px 8px;
    margin-right: 10px;
    text-align: center;
    width: 60px;
    color: #999999;
  }

  .colorItem {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
  }

  .colorActive {
    border: 1px solid #ffffff;
  }
}
</style>
