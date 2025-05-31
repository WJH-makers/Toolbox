<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <HtmlRendererAiComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import HtmlRendererAiComponent from '~/components/tools/programming/HtmlRenderedAiComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: 'HTML渲染 (AI辅助版) - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '输入HTML代码，通过AI辅助进行渲染预览和智能分析。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>