<template>
  <div class="todo-page-container">
    <TodoListComponent/>
  </div>
</template>

<script setup lang="ts">
import TodoListComponent from '~/components/tools/daily/TodoListComponent.vue';


definePageMeta({
  middleware: ['auth'],
});

// 3. (可选) 设置页面的头部信息 (用于SEO和浏览器标签页)
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
});
</script>

<style scoped>
.todo-page-container {
  width: 100%;
  padding: 1rem;
}

</style>