<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <RecipesComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import RecipesComponent from '~/components/tools/daily/RecipesComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '我的食谱收藏 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的食谱收藏功能，轻松管理和查找您的美食创意。'
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