<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <TimelineComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import TimelineComponent from '~/components/tools/learning/timelineComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '历史时间轴 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '探索从古至今的世界与中国历史事件，切换科技与人文视角。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>