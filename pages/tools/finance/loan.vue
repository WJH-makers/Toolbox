<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <LoanCalculatorComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import LoanCalculatorComponent from '~/components/tools/finance/LoanCalculatorComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'], // 根据您的需求决定是否需要认证
});

useHead({
  title: '贷款计算器 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的贷款计算器，精确计算等额本息、等额本金还款方式下的月供、总利息和还款计划。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>