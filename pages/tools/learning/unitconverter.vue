<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <UnitConverterComponent/>
  </ContentCard>
</template>

<script setup>
import UnitConverterComponent from '~/components/tools/learning/UnitconverterComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'], // 根据您的需求决定是否需要认证
});

useHead({
  title: '单位换算器 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的单位换算器，轻松进行各种常用物理量的换算。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>