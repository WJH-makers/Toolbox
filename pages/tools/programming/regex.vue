<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <RegexTesterComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import RegexTesterComponent from '~/components/tools/programming/regexComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});
useHead({
  title: '正则表达式测试工具 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的正则表达式测试工具，在线测试和验证您的正则表达式模式。'
    }
  ]
});
</script>
<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem; /* Consistent with your todos.vue page */
}
</style>