<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <MathLogicExplorerComponent/>
  </ContentCard>
</template>
<script setup>
import MathLogicExplorerComponent from '~/components/tools/learning/MathLogicExplorerComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '数学与逻辑探索 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '通过交互式示例学习斐波那契数列、汉诺塔、勾股定理等有趣的数学概念和逻辑谜题。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>