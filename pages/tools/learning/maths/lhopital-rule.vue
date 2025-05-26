<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <LhopitalRuleDemo/>
  </ContentCard>
</template>
<script lang="ts" setup>
import LhopitalRuleDemo from '~/components/tools/learning/math-logic/lhopital-rule.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({middleware: ['auth']});
useHead({
  title: '洛必达法则应用 - 数学与逻辑探索',
  meta: [{name: 'description', content: '学习使用洛必达法则求解不定型极限的实例。'}]
});
</script>
<style scoped>.card-internal-back-button {
  margin-bottom: 1.5rem;
}</style>