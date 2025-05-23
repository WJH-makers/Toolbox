<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <TodoListComponent/>
  </ContentCard>
</template>

<script setup lang="ts">
import TodoListComponent from '~/components/tools/daily/TodoListComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue'; // 导入 BackButton

definePageMeta({
  middleware: ['auth'],
  layout: 'tool-page-layout', // 页面仍然使用外层布局
});

useHead({
  title: '我的待办清单 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的待办清单工具，高效管理您的所有任务和计划。'
    }
  ]
});

onMounted(() => {
  // 页面挂载后的逻辑
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>