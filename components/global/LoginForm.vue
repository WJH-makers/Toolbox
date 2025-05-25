<template>
  <div class="login-form-content">
    <h2 class="title">用户登录</h2>

    <div
        v-if="serverMessage"
        :class="['server-message', messageType === 'error' ? 'error-message' : 'success-message']">
      {{ serverMessage }}
    </div>

    <form class="form" @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="username">用户名或邮箱</label>
        <input
            id="username" v-model="username" type="text" :disabled="auth.isLoadingAuth.value" required
            placeholder="请输入用户名或邮箱">
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input
            id="password" v-model="password" type="password" :disabled="auth.isLoadingAuth.value" required
            placeholder="请输入密码">
      </div>
      <button type="submit" class="submit-button" :disabled="auth.isLoadingAuth.value">
        {{ auth.isLoadingAuth.value ? '登录中...' : '登录' }}
      </button>
    </form>
    <div class="secondary-action">
      <p>
        还没有账户？
        <router-link to="/register" class="register-link">马上注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue';
import {useRouter} from '#imports';
import {useAuth} from '~/composables/useAuth.js';

const username = ref('');
const password = ref('');
const serverMessage = ref('');
const messageType = ref('');

const router = useRouter();
const auth = useAuth(); // 获取全局 useAuth 实例

const handleLogin = async () => {
  serverMessage.value = '';
  messageType.value = '';

  if (!username.value || !password.value) {
    serverMessage.value = '用户名/邮箱和密码不能为空';
    messageType.value = 'error';
    return;
  }
  // 调用 useAuth 中的 login 函数
  const result = await auth.login(username.value, password.value);
  if (result.success) {
    serverMessage.value = result.message || '登录成功！正在跳转...';
    messageType.value = 'success';
    setTimeout(() => {
      router.push('/toolbox'); // 登录成功后跳转
    }, 1500);
  } else {
    serverMessage.value = result.error || '登录失败，请检查您的凭据。';
    messageType.value = 'error';
  }
};
</script>

<style scoped>
.login-form-content {
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
  margin-bottom: 1rem;
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
  background-color: var(--input-disabled-bg, #e9ecef);
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
  background-color: var(--button-disabled-bg, #cccccc);
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

.register-link {
  color: var(--link-color, var(--color-primary));
  text-decoration: none;
  font-weight: 500;
}

.register-link:hover {
  text-decoration: underline;
}

.server-message {
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.4;
}

.error-message {
  background-color: var(--error-bg);
  color: var(--error-text-color);
  border: 1px solid var(--error-border-color);
}

.success-message {
  background-color: var(--success-bg);
  color: var(--success-text-color);
  border: 1px solid var(--success-border-color);
}
</style>