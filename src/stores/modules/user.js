import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore(
  'cgs-user',
  () => {
    const token = ref('')
    const setToken = (val) => (token.value = val || '')

    return { token, setToken }
  },
  {
    persist: true // 持久化
  }
)
