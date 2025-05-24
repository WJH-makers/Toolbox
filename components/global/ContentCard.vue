<template>
  <div class="content-card-container">
    <slot/>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.content-card-container {
  max-width: 1000px; /* 或者根据需要调整，也可以设为可配置的 prop */
  min-width: 800px;
  margin: 1rem auto; /* 上下边距可以调整，左右 auto 用于居中 */
  padding: 1.5rem 2rem;
  background-color: var(--content-box-background, #fff);
  border-radius: 12px;
  box-shadow: var(--shadow-elevation-high, 0 8px 25px rgba(0, 0, 0, 0.1));
}
</style>