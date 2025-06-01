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
.universal-back-button {
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--back-button-color); /* 按钮文字颜色，深灰色 */
  background-color: var(--color-background-mute); /* 按钮背景色，浅灰色 */
  border: 1px solid var(--color-border); /* 按钮边框 */
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.universal-back-button:hover {
  background-color: #e0e0e0; /* 鼠标悬停时按钮背景色变深一点 */
  transform: translateY(-1px);
}

.universal-back-button:active {
  transform: translateY(0px);
}
</style>