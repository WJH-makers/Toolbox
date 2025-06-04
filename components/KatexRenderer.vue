<template>
  <span ref="katexOutputElement" :class="{ 'katex-display-mode': displayMode }"></span>
</template>

<script setup lang="ts">
import {ref, watch, onMounted, toRefs, nextTick} from 'vue';
import katex from 'katex';

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
const katexOutputElement = ref<HTMLElement | null>(null);

const render = async () => {
  if (katexOutputElement.value) {
    const currentTex = String(tex.value).trim();
    if (currentTex) {
      try {
        katex.render(currentTex, katexOutputElement.value, {
          throwOnError: false, // 在生产中可以设置为 true 以捕获错误
          displayMode: displayMode.value,
          output: "htmlAndMathml", // 推荐，为了可访问性
          strict: (errorCode) => { // 更灵活的 strict 模式处理
            if (errorCode === 'unicodeTextInMathMode') {
              return 'ignore'; // 忽略特定类型的 "错误" (例如，在数学模式中使用普通文本)
            }
            return 'warn';
          },
          ...options.value,
        });
      } catch (e) {
        console.error('KaTeX rendering error in KatexRenderer component:', e, 'for tex:', currentTex);
        katexOutputElement.value.textContent = `[KaTeX Error]`;
        if (katexOutputElement.value.style) {
          katexOutputElement.value.style.color = 'red';
          katexOutputElement.value.style.border = '1px dashed red';
          katexOutputElement.value.style.padding = '2px';
        }
      }
    } else {
      katexOutputElement.value.innerHTML = '';
    }
  }
};

onMounted(async () => {
  await nextTick(); // 确保 DOM 元素已准备好
  render();
});

watch([tex, displayMode, options], async () => {
  await nextTick(); // 确保在 props 更新后 DOM 也准备好
  render();
}, {deep: true}); // deep: true 用于监视 options 对象的深度变化
</script>

<style scoped>
.katex-display-mode {
  display: block;
  width: 100%;
  text-align: center;
}

span:empty {
  display: none;
}
</style>