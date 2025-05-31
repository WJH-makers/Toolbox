<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <ApiClientComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import ApiClientComponent from '~/components/tools/programming/api-clientComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});
useHead({
  title: 'API客户端 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '简单易用的HTTP API接口测试工具，支持自定义请求方法、URL、请求头和请求体，并查看详细响应。' // 更详细的描述
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>