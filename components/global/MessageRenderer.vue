<template>
  <div class="doc-viewer relative w-full">
    <transition name="fade">
      <div v-if="isProcessing"
           class="absolute top-0 right-0 bg-white/90 px-2 py-1 rounded text-xs text-blue-500 z-10 border border-blue-100">
        渲染中...
      </div>
    </transition>

    <div
        ref="containerRef"
        class="markdown-body prose prose-slate max-w-none break-words mjx-container"
        v-html="renderedHtml"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
// 请确保路径与您的目录结构一致
import { mathJaxService } from '~/utils/MathJaxBootstrap.js';
import { LatexTransformer } from '~/utils/LatexTransformer.js';

const props = defineProps({
  content: { type: String, default: '' }
});

const containerRef = ref(null);
const renderedHtml = ref('');
const isProcessing = ref(false);
let debounceTimer = null;

// === 渲染管道 ===
const executeRender = async () => {
  if (!props.content) {
    renderedHtml.value = '';
    return;
  }

  isProcessing.value = true;

  try {
    // 1. 转换: LaTeX/Markdown -> HTML
    // 这是一个同步操作 (CPU 密集)
    const transformer = new LatexTransformer(props.content);
    const html = transformer.process();

    renderedHtml.value = html;

    // 2. 等待 Vue 更新 DOM
    await nextTick();

    // 3. MathJax 排版
    // 这是一个异步操作，会寻找 .mjx-process 类的元素进行渲染
    if (containerRef.value) {
      await mathJaxService.typeset(containerRef.value);
    }
  } catch (error) {
    console.error('Render Pipeline Failed:', error);
    renderedHtml.value += `<div class="text-red-500 text-sm mt-2">渲染错误: ${error.message}</div>`;
  } finally {
    isProcessing.value = false;
  }
};

// === 防抖监听 ===
// 避免在流式输出时过于频繁地触发重排版
watch(() => props.content, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(executeRender, 150); // 150ms 防抖
}, { immediate: true });

onMounted(() => {
  // 预加载 MathJax 脚本
  mathJaxService.load();
});
</script>

<style scoped>
/* DeepSeek 默认输出 Markdown，推荐引入 github-markdown-css 或 Tailwind Typography
  以下是针对 MathJax 的必要微调
*/

.doc-viewer :deep(.mjx-process) {
  display: inline-block;
  overflow-x: auto;
  max-width: 100%;
  vertical-align: middle;
}

/* 块级公式样式修正 */
.doc-viewer :deep(div.mjx-process) {
  display: block;
  margin: 1rem 0;
  text-align: center;
}

/* 修复表格在某些 CSS reset 下的显示问题 */
.doc-viewer :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>