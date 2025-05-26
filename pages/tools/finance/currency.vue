<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <CurrencyConverterComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import CurrencyConverterComponent from '~/components/tools/finance/CurrencyConverterComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '汇率转换与查询 - 万能工具箱', // 更新标题以反映新功能
  meta: [
    {
      name: 'description',
      content: '实时汇率转换计算，并查询全球主要货币相对基准货币的汇率表。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>