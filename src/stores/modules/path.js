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
     * 本地素材路径列表
     * @type {import('vue').Ref<localPathModel[]>}
     */
    const localDownloadPath = ref([])

    /**
     * 设置下载路径
     * @param {string} path - 需要传的路径值
     * @return {void} 无返回
     */
    const setDownloadPath = (path) => {
      downloadPath.value = path
      localStorage.setItem('downloadPath', path)
    }

    /**
     * 清除路径
     */
    const closeDownloadPath = () => {
      downloadPath.value = '未设置'
      localStorage.removeItem('downloadPath')
    }

    /**
     * 保存本地下载路径列表
     * @param {localPathModel} pathValue - 每次下载添加的素材和本地路径
     */
    const setLocalDownloadPath = (pathValue) => {
      const existIndex = localDownloadPath.value.findIndex(
        item => item.material_id === pathValue.material_id
      )
      
      if (existIndex !== -1) {
        localDownloadPath.value[existIndex] = pathValue
      } else {
        localDownloadPath.value.push(pathValue)
      }
      
      localStorage.setItem(
        'localDownloadPaths',
        JSON.stringify(localDownloadPath.value)
      )
    }

    /**
     * 获取特定素材的本地路径
     * @param {string} materialId - 素材的ID
     * @return {string | null} 本地路径或null
     */
    const getLocalPath = (materialId) => {
      const found = localDownloadPath.value.find(
        item => item.material_id === materialId
      )
      return found ? found.localPath : null
    }

    return {
      downloadPath,
      setDownloadPath,
      closeDownloadPath,
      localDownloadPath,
      setLocalDownloadPath,
      getLocalPath
    }
  },
  {
    persist: true
  }
)
