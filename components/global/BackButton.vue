<template>
  <button class="universal-back-button" @click="goBack">
    <slot>← 返回</slot>
  </button>
</template>

<script setup lang="ts">
import {useRouter} from 'vue-router';

const router = useRouter();

const goBack = () => {
  if (window.history.length > 2 && document.referrer.includes(window.location.origin)) {
    router.back();
  } else {
    router.push('/toolbox');
  }
};
</script>

<style scoped>
:root {
  /* 这些是示例值，请根据您的项目主题进行调整 */
  --back-button-text-color: #333333; /* 深灰色文字 */
  --back-button-bg-color: #f0f0f0; /* 浅灰色背景 */
  --back-button-border-color: #cccccc; /* 边框颜色 */
  --back-button-bg-hover-color: #e0e0e0; /* 悬停背景色 */
  --back-button-bg-active-color: #d5d5d5; /* 点击背景色 */
  --back-button-focus-ring-color: #007bff; /* 焦点环颜色 (例如主色调) */
}

.universal-back-button {
  /* 基础样式 */
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 8px; /* 稍微圆润一点的边角 */
  cursor: pointer;
  text-decoration: none; /* 如果用 <a> 标签并应用此样式 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem; /* 图标和文字的间距 */
  white-space: nowrap; /* 防止文字换行 */

  /* 颜色与边框 - 使用 CSS 变量，如果变量未定义则使用后备值 */
  color: var(--back-button-text-color, #333333);
  background-color: var(--back-button-bg-color, #f0f0f0);
  border: 1px solid var(--back-button-border-color, #cccccc);

  /* 过渡效果 - 平滑的交互动画 */
  transition: background-color 0.2s ease-in-out,
  border-color 0.2s ease-in-out,
  transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1), /* 更自然的缓动函数 */ box-shadow 0.2s ease-in-out;

  /* 细微的阴影增加层次感 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
}

.universal-back-button:hover {
  background-color: var(--back-button-bg-hover-color, #e0e0e0);
  border-color: var(--back-button-border-color, #bbbbbb);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
}

.universal-back-button:active {
  background-color: var(--back-button-bg-active-color, #d5d5d5); /* 点击时背景色再深一点 */
  transform: translateY(0.5px); /* 轻微下沉效果 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); /* 点击时阴影减弱或改变 */
}

/* 可访问性：键盘导航时的焦点样式 */
.universal-back-button:focus {
  /* 移除默认的outline，因为我们将使用box-shadow作为焦点指示 */
  outline: none;
}

.universal-back-button:focus-visible {
  outline: none; /* 同样移除默认outline */
  box-shadow: 0 0 0 3px var(--back-button-bg-color, #f0f0f0), /* 内层阴影，与按钮背景色相同，形成一个“间隙” */ 0 0 0 5px var(--back-button-focus-ring-color, #007bff); /* 外层焦点环颜色 */
}
</style>