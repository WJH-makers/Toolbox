<template>
  <div>
    <ContentBox show-back-link>
      <LoginForm/>
    </ContentBox>
  </div>
</template>

<script setup>
import ContentBox from '~/components/ContentBox.vue'; // 确保路径正确
import LoginForm from '~/components/LoginForm.vue';   // 确保路径正确
</script>

<style>
</style>