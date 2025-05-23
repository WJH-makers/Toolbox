<template>
  <div>
    <ContentBox show-back-link>
      <RegisterForm/>
    </ContentBox>
  </div>
</template>

<script setup>
import ContentBox from '~/components/global/ContentBox.vue'; // 确保路径正确
import RegisterForm from '~/components/global/RegisterForm.vue';   // 确保路径正确
</script>

<style>
</style>