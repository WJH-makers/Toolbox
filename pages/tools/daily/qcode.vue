<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <BMIComponent/>
  </ContentCard>
</template>

<script setup>
import BMIComponent from '~/components/tools/daily/QcodeComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: 'QCode 二维码扫描 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的二维码扫描，快速解析二维码。'
    }
  ]
});

onMounted(() => {
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>