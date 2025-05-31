<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <JsonFormatterComponent/>
  </ContentCard>
</template>

<script lang="ts" setup>
import JsonFormatterComponent from '~/components/tools/programming/jsonComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: 'JSON 工具 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '使用万能工具箱中的JSON工具，轻松格式化、校验和查看JSON数据。'
    }
  ]
});
</script>
<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>