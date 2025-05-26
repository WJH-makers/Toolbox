<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <ConvexLensSimComponent/>
  </ContentCard>
</template>

<script setup>
import ConvexLensSimComponent from '~/components/tools/learning/ConvexLensSimComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '凸透镜聚焦模拟 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '交互式模拟平行光线通过凸透镜的汇聚过程，探索焦距对聚焦效果的影响。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>