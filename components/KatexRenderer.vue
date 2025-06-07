<template>
  <span :class="{ 'katex-display-mode': displayMode }" v-html="renderedTex"></span>
</template>

<script setup lang="ts">
import {computed, toRefs} from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // 确保引入 KaTeX 样式

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

const renderedTex = computed(() => {
  const currentTex = String(tex.value).trim();
  if (!currentTex) {
    return '';
  }

  const cacheKey = currentTex + (displayMode.value ? '_display' : '_inline');

  if (RENDER_CACHE.has(cacheKey)) {
    return RENDER_CACHE.get(cacheKey);
  }

  try {
    const finalOptions = {
      throwOnError: false,
      displayMode: displayMode.value,
      output: "html", // 修复 `output` 属性类型不兼容问题
      strict: (errorCode: string) => (errorCode === 'unicodeTextInMathMode' ? 'ignore' : 'warn'),
      ...options.value,
    };

    const renderedHtml = katex.renderToString(currentTex, finalOptions);
    RENDER_CACHE.set(cacheKey, renderedHtml);
    return renderedHtml;

  } catch (e: unknown) { // 修复 `any` 类型问题
    const error = e as Error; // 类型断言为 `Error`
    console.error('KaTeX rendering error:', error);
    const errorHtml = `<span class="katex-error" title="${error.message}">渲染出错: ${currentTex}</span>`;
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
  overflow-x: auto;
}

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