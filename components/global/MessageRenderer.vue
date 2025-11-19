<template>
  <div class="doc-viewer relative w-full">
    <div
        class="markdown-body prose prose-slate max-w-none dark:prose-invert"
        v-html="renderedContent"
    />
  </div>
</template>

<script setup>
import {computed} from 'vue';
// 关键修正：引入 markdown.js 中的渲染函数
// 请确保这个路径是正确的，如果你的 markdown.js 在 utils 目录下，可能需要改为 '@/utils/markdown.js' 或 '../utils/markdown.js'
import {renderMarkdown} from '../utils/markdown.js';

const props = defineProps({
  content: {type: String, default: ''}
});

// 直接调用 markdown.js 的强大渲染能力（包含 KaTeX 和 智能清洗）
const renderedContent = computed(() => {
  if (!props.content) return '';
  return renderMarkdown(props.content);
});
</script>

<style>
/* --- 1. Markdown 基础排版 --- */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: #334155;
  word-wrap: break-word;
}

/* --- 2. 代码块样式 (用于显示真正的代码，如 \documentclass) --- */
.markdown-body pre {
  background-color: #282c34 !important;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.markdown-body pre code {
  font-family: "Fira Code", "Consolas", monospace;
  background-color: transparent;
  color: #abb2bf;
  white-space: pre;
  font-size: 0.9em;
}

/* --- 3. KaTeX 公式样式 --- */
/* 隐藏 MathML 防止重影，只显示 HTML/SVG */
.katex-mathml {
  display: none;
}

/* 块级公式容器 */
.katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  margin: 1em 0;
  padding: 0.5em 0;
  text-align: center;
}

/* 行内公式 */
.katex {
  font-size: 1.1em;
}

/* --- 其他元素 --- */
.markdown-body ul, .markdown-body ol {
  padding-left: 1.5em;
  margin-bottom: 1em;
}

.markdown-body blockquote {
  border-left: 4px solid #2563EB;
  background: #F8FAFC;
  padding: 0.5em 1em;
  color: #64748B;
  margin: 1em 0;
}
</style>