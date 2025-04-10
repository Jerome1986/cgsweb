<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subTitle: String,
  dataList: {
    type: Array,
    default: () => {}
  }
})

// 向父组件提交点击事件
const emits = defineEmits(['changeCate', 'allCate'])

// 激活分类下标
const cateActiveIndex = ref(null)
// 点击分类
const handleChangeCate = (item, index) => {
  console.log(item)
  cateActiveIndex.value = index
  if (cateActiveIndex.value !== null) {
    isAll.value = false
  }
  emits('changeCate', item._id)
}

// 点击全部
const isAll = ref(false)
const handleAll = () => {
  if (props.subTitle === 'new') return

  isAll.value = true
  if (isAll.value) {
    cateActiveIndex.value = null
  }
  emits('allCate')
}

// 暴露组件内部变量
defineExpose({
  cateActiveIndex,
  isAll
})
</script>

<template>
  <div class="cate">
    <div class="title cateBox">{{ title }}</div>
    <div
      @click="handleAll"
      :class="{ cateActive: isAll }"
      class="subtitle cateBox"
    >
      {{ subTitle }}
    </div>
    <div
      class="cateItem cateBox"
      :class="{ cateActive: cateActiveIndex === index }"
      v-for="(item, index) in dataList"
      :key="index"
      @click="handleChangeCate(item, index)"
    >
      {{ item.name }}
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
    color: #999999;
  }

  .cateBox {
    padding: 4px 8px;
    text-align: center;
    width: 60px;
    cursor: pointer;
  }

  .cateActive {
    background-color: #437a02;
    border-radius: 8px;
  }
}
</style>
