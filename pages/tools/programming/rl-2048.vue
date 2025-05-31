<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <Game2048RLComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import Game2048RLComponent from '~/components/tools/programming/RL2048Component.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'], // 根据需要添加中间件
});

useHead({
  title: '2048强化学习版 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '一个基于强化学习的2048游戏演示或分析工具。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>