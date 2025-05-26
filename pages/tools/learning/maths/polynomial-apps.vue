<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <PolynomialAppsDemo/>
  </ContentCard>
</template>
<script lang="ts" setup>
import PolynomialAppsDemo from '~/components/tools/learning/math-logic/polynomial-apps.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({middleware: ['auth']});
useHead({
  title: '多项式函数应用 - 数学与逻辑探索',
  meta: [{name: 'description', content: '探索多项式函数的求根、插值、拟合等应用。'}]
});
</script>
<style scoped>.card-internal-back-button {
  margin-bottom: 1.5rem;
}</style>