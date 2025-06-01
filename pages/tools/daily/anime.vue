<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <BMIComponent/>
  </ContentCard>
</template>

<script setup>
import BMIComponent from '~/components/tools/daily/AnimeComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: 'Anime 动漫搜图 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的动漫搜图，快速找到您想找的动漫番剧'
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