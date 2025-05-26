<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <CollisionSimComponent/>
  </ContentCard>
</template>

<script setup>
import CollisionSimComponent from '~/components/tools/learning/CollisionSimComponent.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'], // 根据需要决定是否需要认证
});

useHead({
  title: '小球碰撞模拟 - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '探索二维小球碰撞的物理规律，包括弹性、非弹性碰撞和不同摩擦条件。'
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}
</style>