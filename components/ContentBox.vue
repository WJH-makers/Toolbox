<template>
  <div class="content-box">
    <router-link v-if="showBackLink" to="/" class="back-link" aria-label="返回首页">
      &larr; 返回首页
    </router-link>
    <slot/>
  </div>
</template>

<script setup lang="ts">
defineProps({
  showBackLink: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.content-box {
  background-color: var(--content-box-background);
  padding: 2rem 2.5rem; /* 上下内边距 2rem, 左右内边距 2.5rem */
  border-radius: var(--content-box-border-radius);
  box-shadow: var(--content-box-shadow);
  width: 100%;
  max-width: 500px;
  min-width: 400px; /* 这是你新添加的属性 */
  margin: 2rem auto;
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative; /* 添加此行，为返回链接的绝对定位提供基准 */
}

.back-link {
  position: absolute;
  top: 1rem; /* 距离 ContentBox 顶部边缘 1rem */
  left: 1.5rem; /* 距离 ContentBox 左侧边缘 1.5rem */
  color: var(--color-text); /* 使用自定义的链接颜色或默认文字颜色 */
  text-decoration: none;
  font-size: 0.9rem; /* 稍小一点的字体 */
  z-index: 10; /* 确保在其他内容之上（如果需要） */
}

.back-link:hover {
  text-decoration: underline;
  color: var(--button-hover-bg); /* 鼠标悬停时的颜色 */
}

@media (max-width: 640px) {
  .content-box {
    padding: 1.5rem 1rem;
    margin: 1rem auto;
    max-width: calc(100% - 2rem); /* 保持你原有的响应式设置 */
    min-width: auto; /* 在小屏幕上可以取消最小宽度限制或设为更小值 */
  }

  .back-link {
    top: 0.75rem;
    left: 0.75rem;
    font-size: 0.85rem;
  }
}
</style>