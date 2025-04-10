/**
 * @typedef {Object} topCateModel - 分类
 * @property {string} _id - 当前分类id
 * @property {string} name - 分类名称
 * @property {string} en_name - 分类英文名
 * @property {string} type - 所属类型
 * @property {string} parentId - 父级id
 * @property  {Array} subCategories - 二级分类
 */

/**
 * @typedef {Object} subCateModel - 分类
 * @property {string} _id - 二级分类id
 * @property {string} name - 分类名称
 * @property {string} en_name - 分类英文名
 * @property {string} type - 所属类型
 * @property {string} parent_id - 父级id
 * @property  {Array} parent_name  - 父级分类名字
 */
