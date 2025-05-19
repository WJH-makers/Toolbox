<template>
  <div class="site-container">
    <NuxtParticles
        id="tsparticles-background"
        :key="currentTheme"
        :options="currentParticlesOptions"
        @load="onParticlesLoaded"
    />
    <div class="content-wrapper">
      <NuxtPage/>
    </div>
    <HangingThemeToggle/>
    <UserProfileSettings v-if="isLoggedIn"/>
  </div>
</template>

<script setup lang="ts">
import {onMounted, computed} from 'vue'; // computed可能仍被其他地方使用
import {useThemeManager} from "~/composables/useThemeManager";
import {useDynamicParticles} from "~/composables/useDynamicParticles"; // 如果你还在用
import {useAuth} from "~/composables/useAuth"; // 导入你的全局认证 composable


const {currentTheme, initializeTheme} = useThemeManager();

const {currentParticlesOptions, onParticlesLoaded} = useDynamicParticles(currentTheme);

const {isLoggedIn, user: authUser, initializeAuthState, fetchCurrentUser} = useAuth();

onMounted(async () => {
  initializeTheme();
  await initializeAuthState();
});
</script>

<style scoped>
.site-container {
  position: relative;
  min-height: 100vh;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
</style>