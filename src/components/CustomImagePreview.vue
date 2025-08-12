<script setup>
import { ref, watch, defineProps, defineEmits, onMounted, onBeforeUnmount } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  src: { type: String, required: true },
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
let lastMouseX = 0
let lastMouseY = 0

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (!val) resetTransform()
  }
)

const resetTransform = () => {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
}

const handleClose = () => {
  visible.value = false
  emit('update:modelValue', false)
}

const handleWheel = (e) => {
  e.preventDefault()
  const zoomSpeed = 0.1
  if (e.deltaY < 0) {
    scale.value = Math.min(scale.value + zoomSpeed, 7)
  } else {
    scale.value = Math.max(scale.value - zoomSpeed, 0.2)
  }
}

const handleMouseDown = (e) => {
  dragging.value = true
  lastMouseX = e.clientX
  lastMouseY = e.clientY
}

const handleMouseMove = (e) => {
  if (dragging.value) {
    offsetX.value += e.clientX - lastMouseX
    offsetY.value += e.clientY - lastMouseY
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  }
}

const handleMouseUp = () => {
  dragging.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handleMouseMove)
})

function onKeyDown(e) {
  if (e.key === 'Escape' && visible.value) {
    handleClose()
  }
}
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="el-image-viewer__wrapper" @click.self="handleClose" @wheel="handleWheel">
      <!-- 图片 + 水印容器 -->
      <div
        class="image-with-watermark"
        :style="{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
        }"
        @mousedown.prevent="handleMouseDown"
      >
        <img v-if="src" :src="src" alt="预览图" class="el-image-viewer__img" draggable="false" />
        <!-- 水印层 -->
        <div class="watermark-layer"></div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.el-image-viewer__wrapper {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.image-with-watermark {
  position: relative;
  transform-origin: center center;
}

.el-image-viewer__img {
  display: block;
  max-width: 90vw;
  max-height: 90vh;
  user-select: none;
  pointer-events: none;
}

.watermark-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: var(--watermark-url);
  background-repeat: no-repeat;
  background-position: center;
  background-size: 30%;
  pointer-events: none;
  opacity: 0.3;
}
</style>
