<template>
  <span :class="{ 'katex-display-mode': displayMode }" v-html="renderedTex"></span>
</template>

<script setup lang="ts">
import {computed, toRefs} from 'vue';
import katex from 'katex';

const RENDER_CACHE = new Map<string, string>();

const props = defineProps({
  tex: {
    type: String,
    required: true,
    default: '',
  },
  displayMode: {
    type: Boolean,
    default: false,
  },
  options: {
    type: Object,
    default: () => ({}),
  }
});

const {tex, displayMode, options} = toRefs(props);

// 使用 computed 属性代替 watch 和 onMounted，代码更简洁且符合 Vue 的理念
const renderedTex = computed(() => {
  const currentTex = String(tex.value).trim();
  if (!currentTex) {
    return '';
  }

  // 使用 props 生成唯一的缓存键
  const cacheKey = currentTex + (displayMode.value ? '_display' : '_inline');

  // 1. 检查缓存
  if (RENDER_CACHE.has(cacheKey)) {
    return RENDER_CACHE.get(cacheKey);
  }

  // 2. 如果缓存未命中，则渲染并存入缓存
  try {
    const finalOptions = {
      throwOnError: false,
      displayMode: displayMode.value,
      output: "htmlAndMathml",
      strict: (errorCode: string) => (errorCode === 'unicodeTextInMathMode' ? 'ignore' : 'warn'),
      ...options.value,
    };

    const renderedHtml = katex.renderToString(currentTex, finalOptions);
    RENDER_CACHE.set(cacheKey, renderedHtml); // 存入缓存
    return renderedHtml;

  } catch (e: any) {
    console.error('KaTeX rendering error:', e);
    const errorHtml = `<span class="katex-error" title="${e.message}">渲染出错: ${currentTex}</span>`;
    // 错误结果也缓存起来，避免对错误的表达式反复尝试渲染
    RENDER_CACHE.set(cacheKey, errorHtml);
    return errorHtml;
  }
});
</script>

<style scoped>
.katex-display-mode {
  display: block;
  width: 100%;
  text-align: center;
  padding: 1em 0;
}

/* 使用 :deep() 以便样式能应用到 v-html 内部的 .katex-error */
:deep(.katex-error) {
  color: #cc0000;
  font-family: monospace;
  border: 1px dashed #cc0000;
  padding: 4px 6px;
  border-radius: 4px;
  background-color: #fcebeb;
  cursor: help;
}
</style>