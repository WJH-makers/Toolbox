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
  title: '机器视觉解析 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '上传图片或视频，进行机器视觉分析，如对象识别、场景理解等。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>