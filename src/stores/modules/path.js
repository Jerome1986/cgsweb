import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePathStore = defineStore(
  'path',
  () => {
    /**
     * 默认下载路径
     * @type {import('vue').Ref<string>}
     */
    const downloadPath = ref('未设置')

    /**
     * 设置下载路径
     * @param {string} path - 需要传的路径值
     * @return {void} 无返回
     */
    const setDownloadPath = (path) => {
      downloadPath.value = path
    }

    /**
     * 清除路径
     */
    const closeDownloadPath = () => {
      downloadPath.value = '未设置'
    }

    /**
     * 本地素材路径列表
     * @type {import('vue').Ref<localPathModel[]>}
     */
    const localDownloadPath = ref([])

    /**
     * 保存本地下载路径列表
     * @param {localPathModel} pathValue - 每次下载添加的素材和本地路径
     */
    const setLocalDownloadPath = (pathValue) => {
      localDownloadPath.value.push(pathValue)
    }

    return {
      downloadPath,
      setDownloadPath,
      closeDownloadPath,
      localDownloadPath,
      setLocalDownloadPath
    }
  },
  {
    persist: true
  }
)
