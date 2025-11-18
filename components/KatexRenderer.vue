<template>
  <component
      :is="displayMode ? 'div' : 'span'"
      class="katex-wrapper"
      :class="{ 'katex-display-block': displayMode }"
      v-html="renderedHtml"
  ></component>
</template>

<script setup>
import { computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // 务必引入 CSS，否则公式会乱码

const props = defineProps({
  tex: { type: String, default: '' },
  displayMode: { type: Boolean, default: false },
  // 允许传入额外的 katex 配置
  options: { type: Object, default: () => ({}) }
});

const renderedHtml = computed(() => {
  const content = props.tex || '';

  try {
    return katex.renderToString(content, {
      throwOnError: false, // 遇到错误不抛出异常，而是渲染错误提示
      displayMode: props.displayMode,
      strict: false, // 忽略一些非严格语法的警告
      trust: true,   // 允许特定的命令（如 \url）
      ...props.options
    });
  } catch (error) {
    console.error('KaTeX Render Error:', error);
    // 发生灾难性错误时的降级处理
    return `<span style="color:red; font-family:monospace;">${content}</span>`;
  }
});
</script>

<style scoped>
/* 样式隔离，防止影响外部 */
.katex-wrapper {
  user-select: text;
}

.katex-display-block {
  display: block;
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
  overflow-y: hidden;
}

/* 错误信息的默认样式 */
:deep(.katex-error) {
  color: #cf222e;
  background-color: #ffebe9;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
</style>