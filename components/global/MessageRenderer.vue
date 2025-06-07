<template>
  <div class="message-content-renderer">
    <template v-for="(segment, index) in segments" :key="index">
      <span v-if="segment.type === 'markdown'" v-html="renderMarkdown(segment.content)"></span>
      <KatexLatex v-else-if="segment.type === 'latex'" :tex="segment.content" :display-mode="segment.displayMode"/>
    </template>
  </div>
</template>

<script setup>
import {computed} from 'vue';
import {marked} from 'marked';
import KatexLatex from '../KatexRenderer.vue';

const props = defineProps({
  content: {type: String, required: true},
});

// 使用正则表达式查找 $$...$$ (块级) 和 $...$ (行内) 公式
const LATEX_REGEX = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;

const segments = computed(() => {
  const text = props.content || '';
  const parts = text.split(LATEX_REGEX).filter(Boolean); // 切分文本

  return parts.map(part => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return {type: 'latex', content: part.slice(2, -2).trim(), displayMode: true};
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return {type: 'latex', content: part.slice(1, -1).trim(), displayMode: false};
    }
    return {type: 'markdown', content: part};
  });
});

const renderMarkdown = (markdown) => {
  if (!markdown) return '';
  return marked.parse(markdown, {breaks: true, gfm: true, headerIds: false});
};
</script>