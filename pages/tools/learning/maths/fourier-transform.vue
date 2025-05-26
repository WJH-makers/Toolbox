<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <FourierTransformDemo/>
  </ContentCard>
</template>

<script lang="ts" setup>
import FourierTransformDemo from '~/components/tools/learning/math-logic/fourier-transform.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'], // 根据您的需求决定是否需要认证
});

useHead({
  title: '傅里叶变换初探 - 数学与逻辑探索',
  meta: [
    {
      name: 'description',
      content: '通过可视化波形叠加与分解，初步了解傅里叶变换的基本概念和应用。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>