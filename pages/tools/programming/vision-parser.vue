<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <MachineVisionAnalyzerComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import MachineVisionAnalyzerComponent from '~/components/tools/programming/MachineVisionAnalyzerComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '机器学习可视化讲解 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '可视化机器学习模型的工作原理，帮助你更好地理解机器学习算法。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>