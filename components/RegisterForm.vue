<template>
  <div class="register-form-content">
    <h2 class="title">用户注册</h2>

    <div
v-if="serverMessage"
         :class="['server-message', messageType === 'error' ? 'error-message' : 'success-message']">
      {{ serverMessage }}
    </div>

    <form class="form" @submit.prevent="handleRegister">
      <div class="form-group">
        <label for="username">用户名</label>
        <input id="username" v-model="username" type="text" :disabled="isLoading" required placeholder="请输入用户名">
      </div>
      <div class="form-group">
        <label for="email">邮箱地址</label>
        <input id="email" v-model="email" type="email" :disabled="isLoading" required placeholder="请输入邮箱地址">
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input
id="password" v-model="password" type="password" :disabled="isLoading" required
               placeholder="大小写字母、数字、特殊符号，至少8位">
      </div>
      <div class="form-group">
        <label for="confirmPassword">确认密码</label>
        <input
id="confirmPassword" v-model="confirmPassword" type="password" :disabled="isLoading" required
               placeholder="请再次输入密码">
      </div>
      <button type="submit" class="submit-button" :disabled="isLoading">
        {{ isLoading ? '注册中...' : '注册' }}
      </button>
    </form>
    <div class="secondary-action">
      <p>
        已经有账户了？
        <router-link to="/login" class="nav-link">返回登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import axios from 'axios'; // 确保你已经安装并导入了 axios

const router = useRouter();
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const serverMessage = ref(''); // 新增：用于存储服务器返回的消息
const messageType = ref('');   // 新增：用于标记消息类型 ('success' 或 'error')
const isLoading = ref(false);  // 新增：用于处理加载状态

const handleRegister = async () => {
  serverMessage.value = '';
  messageType.value = '';
  isLoading.value = true;

  if (!username.value || !email.value || !password.value || !confirmPassword.value) {
    serverMessage.value = '所有字段均为必填项';
    messageType.value = 'error';
    isLoading.value = false;
    return;
  }
  if (password.value !== confirmPassword.value) {
    serverMessage.value = '两次输入的密码不一致';
    messageType.value = 'error';
    isLoading.value = false;
    return;
  }
  if (password.value.length < 8) {
    serverMessage.value = '密码长度至少需要8位';
    messageType.value = 'error';
    isLoading.value = false;
    return;
  }

  try {
    const response = await axios.post('/api/auth/register', { // 确保 API 端点正确
      username: username.value,
      email: email.value,
      password: password.value,
    });

    if (response.data && response.data.success) {
      serverMessage.value = response.data.message || '注册成功！即将跳转到登录页面...';
      messageType.value = 'success';
      username.value = '';
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
      setTimeout(() => {
        router.push('/login');
      }, 2000); // 2秒后跳转
    } else {
      serverMessage.value = response.data.message || '注册失败，请检查您填写的信息。';
      messageType.value = 'error';
    }
  } catch (error) {
    console.error('注册请求失败:', error);
    if (error.response && error.response.data && error.response.data.message) {
      serverMessage.value = error.response.data.message;
    } else if (error.request) {
      serverMessage.value = '无法连接到服务器，请检查您的网络。';
    } else {
      serverMessage.value = '注册过程中发生未知错误，请稍后再试。';
    }
    messageType.value = 'error';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.register-form-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
  justify-content: space-between;
}

.title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem; /* 稍微减少一点，给消息区域留空间 */
}

.form {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-muted, var(--color-text));
  margin-bottom: 0.5rem;
  text-align: left;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background-color: var(--input-bg);
  border: 1px solid var(--input-border-color);
  border-radius: 6px;
  box-sizing: border-box;
  color: var(--input-text-color);
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.form-group input:disabled {
  background-color: var(--input-disabled-bg);
  cursor: not-allowed;
}

.form-group input::placeholder {
  color: var(--input-placeholder-color);
}

.form-group input:focus {
  outline: none;
  border-color: var(--input-focus-border-color);
  box-shadow: 0 0 0 2px var(--input-focus-shadow-color);
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  background-color: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  margin-top: 0.75rem;
}

.submit-button:disabled {
  background-color: var(--button-disabled-bg);
  cursor: not-allowed;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.submit-button:active:not(:disabled) {
  background-color: var(--button-active-bg);
}

.secondary-action {
  text-align: center;
  margin-top: 1rem;
  padding-bottom: 0.5rem;
}

.secondary-action p {
  font-size: 0.875rem;
  color: var(--color-text-muted, var(--color-text));
  margin: 0;
}

.nav-link {
  color: var(--link-color, var(--color-primary));
  text-decoration: none;
  font-weight: 500;
}

.nav-link:hover {
  text-decoration: underline;
}


.server-message {
  padding: 0.8rem 1rem;
  margin-bottom: 1rem; /* 在表单上方显示消息，并与表单保持间距 */
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.4;
}

.error-message {
  background-color: var(--error-bg, #f8d7da);
  color: var(--error-text-color, #721c24);
  border: 1px solid var(--error-border-color, #f5c6cb);
}

.success-message {
  background-color: var(--success-bg);
  color: var(--success-text-color);
  border: 1px solid var(--success-border-color);
}
</style>