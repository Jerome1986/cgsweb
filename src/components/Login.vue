<script setup>
import { ref, watch } from 'vue'
import { generateCaptchaCode } from '@/utils/captcha'
import { ElMessage } from 'element-plus'
import { login, register } from '@/api/login'
import { useUserStore } from '@/stores'

// 弹窗开关
const dialogVisible = ref(false)
// 表单类型
const loginType = ref('登录')
// 注册/登录表单
const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  captcha: ''
})

// 用户全局状态
const userStore = useUserStore()

// 生成随机验证码
const captchaCode = ref('')
const generateCaptcha = () => {
  captchaCode.value = generateCaptchaCode()
}

// 初始化生成验证码
generateCaptcha()

// 表单规则
const rules = ref({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 6, max: 12, message: '用户名是6-12位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码最小位6位数', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.value.password && loginType.value === '注册') {
          callback(new Error('两次输入密码不一致!'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码长度为4位', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== captchaCode.value && loginType.value === '注册') {
          callback(new Error('验证码输入错误!'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

// 监听弹框开关-关闭弹框时切回登录显示
watch(dialogVisible, (newValue) => {
  loginType.value = newValue ? loginType.value : '登录'
})

// 打开弹窗
const open = () => {
  dialogVisible.value = true
}

const loginForm = ref()
// 提交表单
const submitForm = async () => {
  await loginForm.value.validate()
  // 注册
  if (loginType.value === '注册') {
    const res = await register(form.value.username, form.value.password)
    console.log(res)
    if (res.code === 200) {
      //   注册成功 返回登录
      ElMessage.success('注册成功')
      loginType.value = '登录'
      loginForm.value.resetFields()
    }
  }
  // 登录
  if (loginType.value === '登录') {
    const res = await login(form.value.username, form.value.password)
    console.log(res)
    if (res.code === 200) {
      ElMessage.success('登录成功')
      dialogVisible.value = false
      userStore.setUserInfo(res.data)
      loginForm.value.resetFields()
    }
  }
}

// 将弹窗打开的方法暴露给父组件
defineExpose({
  open
})
</script>

<template>
  <div class="login">
    <el-dialog v-model="dialogVisible" width="400" top="30vh">
      <!-- 登录 -->
      <el-form
        ref="loginForm"
        class="loginForm"
        :model="form"
        :rules="rules"
        label-width="auto"
        v-if="loginType === '登录'"
      >
        <h1 style="color: #ffffff; font-size: 30px">用户登录</h1>
        <p style="margin: 12px 0; color: #b2b0b0">欢迎回来</p>
        <el-form-item label="用户名" style="width: 300px" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" style="width: 300px" prop="password">
          <el-input
            v-model="form.password"
            placeholder="请输入密码"
            type="password"
          />
        </el-form-item>
        <el-button
          @click="submitForm"
          size="large"
          style="
            width: 300px;
            background-color: #427b02;
            color: #ffffff;
            border: none;
            margin-bottom: 8px;
          "
          >登录</el-button
        >
        <p>
          没有账号？<span
            style="color: #427b02; cursor: pointer"
            @click="loginType = '注册'"
            >去注册</span
          >
        </p>
      </el-form>
      <!--  注册    -->
      <el-form
        ref="loginForm"
        class="loginForm"
        :model="form"
        label-width="auto"
        :rules="rules"
        v-else
      >
        <h1 style="color: #ffffff; font-size: 30px">用户注册</h1>
        <p style="margin: 12px 0; color: #b2b0b0">创建新账号</p>
        <el-form-item label="用户名" style="width: 300px" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" style="width: 300px" prop="password">
          <el-input
            v-model="form.password"
            placeholder="请输入密码"
            type="password"
          />
        </el-form-item>
        <el-form-item
          label="确认密码"
          style="width: 300px"
          prop="confirmPassword"
        >
          <el-input
            v-model="form.confirmPassword"
            placeholder="请再次输入密码"
            type="password"
          />
        </el-form-item>
        <el-form-item label="验证码" style="width: 300px" prop="captcha">
          <div style="display: flex; width: 300px">
            <el-input
              style="flex: 1"
              v-model="form.captcha"
              placeholder="请输入验证码"
            />
            <span
              @click="generateCaptcha"
              style="
                margin-left: 8px;
                background-color: #666666;
                color: #ffffff;
                width: 90px;
                height: 36px;
                border-radius: 4px;
                text-align: center;
                font-size: 18px;
                cursor: pointer;
              "
              >{{ captchaCode }}</span
            >
          </div>
        </el-form-item>
        <el-button
          @click="submitForm"
          size="large"
          style="
            width: 300px;
            background-color: #427b02;
            color: #ffffff;
            border: none;
            margin-bottom: 8px;
          "
          >注册</el-button
        >
        <p>
          已有账号？<span
            style="color: #427b02; cursor: pointer"
            @click="loginType = '登录'"
            >去登录</span
          >
        </p>
      </el-form>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.login {
  :deep(.el-dialog) {
    background-color: #2f2f2f;

    /*表单*/
    .loginForm {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      .el-form-item__label {
        color: white;
      }
    }
  }
}
</style>
