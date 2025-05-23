<template>
  <ContentBox>
    <div class="text-center">
      <div v-if="!auth.authStatusResolved.value || (auth.isLoggedIn.value && auth.authStatusResolved.value)">
        <p class="mb-4">正在加载，请稍候...</p>
      </div>
      <div v-else-if="!auth.isLoggedIn.value">
        <h1 class="text-3xl font-bold mb-6 text-[var(--color-primary)]">欢迎来到首页</h1>
        <p class="mb-4">
          该网站使用nuxt3和tailwindcss构建，提供了一个现代化的用户界面。
        </p>
        <p class="mb-8">
          你可以免费使用该网站中任意的功能
        </p>
        <UButton to="/login" label="前往登录" size="lg" icon="i-heroicons-arrow-right-start-on-rectangle"/>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import {watchEffect} from 'vue';
import {useRouter} from '#imports';
import {useAuth} from '~/composables/useAuth';
useHead({
  title: '首页 | 万能工具箱'
});

const router = useRouter();
const auth = useAuth();

watchEffect(() => {
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
  /* 你可以保留或移除此空规则 */
}

/* 可以为加载状态添加样式 */
.loading-placeholder {
  min-height: 200px; /* 示例高度，避免页面跳动 */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--color-text-muted);
}
</style>