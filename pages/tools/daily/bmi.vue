<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <BMIComponent/>
  </ContentCard>
</template>

<script setup>
import BMIComponent from '~/components/tools/daily/BMIComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: 'BMI 指数计算器 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的BMI指数计算器，快速了解您的身体质量指数。'
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