<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <TranscendentalEqDemo/>
  </ContentCard>
</template>
<script lang="ts" setup>
import TranscendentalEqDemo from '~/components/tools/learning/math-logic/transcendental-eq.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({middleware: ['auth']});
useHead({
  title: '超越方程求解 - 数学与逻辑探索',
  meta: [{name: 'description', content: '了解并尝试数值方法（如二分法、牛顿法）求解超越方程。'}]
});
</script>
<style scoped>.card-internal-back-button {
  margin-bottom: 1.5rem;
}</style>