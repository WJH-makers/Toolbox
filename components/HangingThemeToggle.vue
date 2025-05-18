<template>
  <div
      class="hanging-toggle-container"
      :class="[currentTheme === 'dark' ? 'theme-dark' : 'theme-light', { 'is-pulled': isPulled }]"
      @click="handleToggleClick"
  >
    <div class="hanging-line"/>
    <button class="round-toggle-button" aria-label="Toggle Theme">
      <ClientOnly>
        <Vue3Lottie
            :key="currentLottieAnimation"
            :animation-link="currentLottieAnimation"
            :autoplay="true"
            :loop="true"
            :width="28"
            :height="28"
        />
        <template #fallback>
          <span>{{ currentTheme === 'light' ? '🌙' : '☀️' }}</span>
        </template>
      </ClientOnly>
    </button>
  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import {useThemeManager} from '~/composables/useThemeManager';
import {Vue3Lottie} from 'vue3-lottie';

const {currentTheme, toggleTheme} = useThemeManager();
const isPulled = ref(false);

const currentLottieAnimation = computed(() => {
  return currentTheme.value === 'light' ? '/lottie/moon-animation.json' : '/lottie/sun-animation.json';
});

const handleToggleClick = () => {
  if (isPulled.value) return; // 防止在动画期间重复触发

  isPulled.value = true;
  toggleTheme(); // 切换主题，Lottie图标会因此更新

  // 动画结束后恢复状态
  setTimeout(() => {
    isPulled.value = false;
  }, 450); // 这个时间应略大于CSS中transition的持续时间
};
</script>

<style scoped>
.hanging-toggle-container {
  position: fixed;
  top: 10px;
  left: 30px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  /* 定义主题颜色变量的默认值 (亮色主题) */
  --hanging-line-color: #cbd5e1; /* 更柔和的线条颜色 */
  --round-toggle-bg: #ffffff;
  --round-toggle-shadow: rgba(0, 0, 0, 0.1);
  --round-toggle-shadow-hover: rgba(0, 0, 0, 0.15);
  --lottie-fallback-color: #334155;
}

.hanging-toggle-container.theme-dark {
  --hanging-line-color: #4b5563;
  --round-toggle-bg: #374151;
  --round-toggle-shadow: rgba(0, 0, 0, 0.25);
  --round-toggle-shadow-hover: rgba(0, 0, 0, 0.35);
  --lottie-fallback-color: #e5e7eb;
}

.hanging-line {
  width: 2.5px; /* 线条略粗一点 */
  height: 25px;
  background-color: var(--hanging-line-color);
  border-radius: 2px; /* 线条末端略圆润 */
  transition: height 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6), background-color 0.3s ease; /* 弹性效果 */
}

.hanging-toggle-container.is-pulled .hanging-line {
  height: 32px; /* 拉动时线条伸长一点 */
}

.round-toggle-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--round-toggle-bg);
  border: none; /* 通常不需要边框，阴影效果更好 */
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 6px var(--round-toggle-shadow);
  outline: none;
  margin-top: -1px; /* 使按钮和线条连接更紧密 */
  transform-origin: top center; /* 使变换围绕顶部中心点，模拟悬挂感 */
  transition: transform 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6), /* 弹性效果 */ box-shadow 0.2s ease-out,
  background-color 0.3s ease;
}

.hanging-toggle-container:hover .round-toggle-button:not(.is-pulled .round-toggle-button) {
  /* is-pulled 类不在按钮上，在父容器上 */
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 12px var(--round-toggle-shadow-hover);
}

.hanging-toggle-container.is-pulled .round-toggle-button {
  transform: translateY(8px) scale(0.92) rotate(5deg); /* 拉动时按钮下沉、缩小并轻微旋转 */
}

.round-toggle-button > :deep(div:first-child),
.round-toggle-button > :deep(span) { /* 同时为 Lottie 和 fallback span 设置颜色 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--lottie-fallback-color); /* Fallback 文字颜色也使用变量 */
}
</style>