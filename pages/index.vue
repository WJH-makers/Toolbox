<template>
  <ContentBox>
    <div class="text-center">
      <div v-if="!auth.authStatusResolved.value" class="loading-placeholder">
        <p class="mb-4">正在加载认证状态，请稍候...</p>
      </div>

      <div v-else-if="auth.authStatusResolved.value && !auth.isLoggedIn.value">
        <h1 class="text-3xl font-bold mb-6 text-[var(--color-primary)]">欢迎来到首页</h1>
        <p class="mb-4">
          该网站使用nuxt3和tailwindcss构建，提供了一个现代化的用户界面。
        </p>
        <p class="mb-8">
          你可以免费使用该网站中任意的功能
        </p>
        <UButton to="/login" label="前往登录" size="lg" icon="i-heroicons-arrow-right-start-on-rectangle"/>
      </div>

      <div v-else-if="auth.authStatusResolved.value && auth.isLoggedIn.value">
        <p class="mb-4">用户已登录，正在跳转到您的工具箱...</p>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import {watchEffect, onMounted} from 'vue'; // 确保 onMounted 已导入
import {useRouter} from '#imports';
import {useAuth} from '~/composables/useAuth';

useHead({
  title: '首页 | 万能工具箱'
});

const router = useRouter();
const auth = useAuth();

// 在组件挂载后，立即初始化/检查认证状态
onMounted(async () => {
  // 确保只在客户端执行，并且如果状态尚未解析
  if (import.meta.client && !auth.authStatusResolved.value) {
    console.log('index.vue onMounted: 调用 auth.initializeAuthState()');
    await auth.initializeAuthState();
  }
});

watchEffect(() => {
  console.log(`watchEffect: authStatusResolved=${auth.authStatusResolved.value}, isLoggedIn=${auth.isLoggedIn.value}`);
  if (auth.authStatusResolved.value) {
    if (auth.isLoggedIn.value) {
      console.log('用户已登录，正在重定向到 /toolbox ...');
      router.push('/toolbox');
    } else {
      console.log('用户未登录，停留在首页。');
    }
  } else {
    console.log('等待认证状态解析...');
  }
});

</script>

<style scoped>
.text-center h1 {
}

.loading-placeholder {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--color-text-muted, #6c757d); /* 添加一个默认颜色 */
}
</style>