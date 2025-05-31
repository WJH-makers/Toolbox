<template>
  <ContentCard>
    <BackButton class="card-internal-back-button" default-path="/toolbox"/>
    <StockScreenerComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import StockScreenerComponent from '~/components/tools/finance/StockScreenerComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '股票行情与K线查询 - 万能工具箱', // 更新标题
  meta: [
    {
      name: 'description',
      content: '查询沪深A股、港股、美股的实时行情和K线数据。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>