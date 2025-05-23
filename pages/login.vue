<template>
  <div>
    <ContentBox show-back-link>
      <LoginForm/>
    </ContentBox>
  </div>
</template>

<script setup>
import ContentBox from '~/components/global/ContentBox.vue'; // 确保路径正确
import LoginForm from '~/components/global/LoginForm.vue';   // 确保路径正确
</script>

<style>
</style>