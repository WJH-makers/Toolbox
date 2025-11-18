<template>
  <ContentBox>
    <div class="text-center landing-page-content">
      <div v-if="isLoading" class="loading-placeholder">
        <USkeleton class="h-8 w-48 mb-4"/>
        <USkeleton class="h-4 w-64 mb-2"/>
        <USkeleton class="h-4 w-56 mb-6"/>
        <USkeleton class="h-12 w-32"/>
        <p class="mt-4 text-sm text-gray-500">正在加载，请稍候...</p>
      </div>

      <div v-else-if="!auth.isLoggedIn.value" class="welcome-message">
        <h1 class="text-4xl font-bold mb-6 text-primary-500 dark:text-primary-400">
          欢迎来到万能工具箱 🛠️
        </h1>
        <p class="mb-4 text-lg text-gray-700 dark:text-gray-300">
          本站基于 Nuxt 3 和 Tailwind CSS (通过 Nuxt UI) 构建，旨在提供一个现代、高效的用户体验。
        </p>
        <p class="mb-8 text-lg text-gray-700 dark:text-gray-300">
          您可以免费使用本站提供的所有便捷工具！
        </p>
        <UButton
to="/login" label="登录 / 注册" size="xl" icon="i-heroicons-arrow-right-start-on-rectangle-20-solid"
                 trailing/>
      </div>

      <div v-else class="loading-placeholder">
        <USkeleton class="h-8 w-48 mb-4"/>
        <p class="mt-4 text-sm text-gray-500">认证成功，正在跳转到您的工具箱...</p>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import {ref, onMounted, watch} from 'vue';
import {useHead} from '#imports'; // Nuxt 3 自动导入
import {useAuth} from '~/composables/useAuth'; // 假设您的 useAuth 在这里

// 页面元数据
useHead({
  title: '首页 | 万能工具箱'
});

const auth = useAuth();
const isLoading = ref(true); // 用于控制整体加载状态的显示

onMounted(async () => {
  if (!auth.authStatusResolved.value) {
    await auth.initializeAuthState(); // 等待状态解析完成
  }
  if (auth.isLoggedIn.value) {
    await navigateTo('/toolbox', {replace: true});
  } else {
    isLoading.value = false; // 用户未登录，显示欢迎信息
  }
});

watch(() => auth.isLoggedIn.value, (newValue, _oldValue) => {
  if (auth.authStatusResolved.value && newValue === true) {
    navigateTo('/toolbox', {replace: true});
  }
}, {immediate: false});

watch(() => auth.authStatusResolved.value, (resolved) => {
  if (resolved && !auth.isLoggedIn.value) {
    isLoading.value = false; // 如果状态已解析且用户未登录，停止加载动画
  } else if (resolved && auth.isLoggedIn.value && isLoading.value) {
    // 跳转逻辑应由 onMounted 或 isLoggedIn watch 处理
  }
});
</script>

<style scoped>
.landing-page-content {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.loading-placeholder {
  min-height: 250px; /* 增加高度以容纳骨架屏 */
  display: flex;
  flex-direction: column; /* 垂直排列骨架屏元素 */
  align-items: center;
  justify-content: center;
}

.welcome-message h1 {
  /* 可以在这里添加额外的 H1 特定样式 */
}
</style>