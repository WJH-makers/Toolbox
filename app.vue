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
import {onMounted} from 'vue';
import {useThemeManager} from "~/composables/useThemeManager";
import {useDynamicParticles} from "~/composables/useDynamicParticles";
import {useAuth} from "~/composables/useAuth";

const {currentTheme, initializeTheme} = useThemeManager();
const {currentParticlesOptions, onParticlesLoaded} = useDynamicParticles(currentTheme);
const {isLoggedIn, initializeAuthState} = useAuth();

onMounted(async () => {
  initializeTheme();
  await initializeAuthState();
});

</script>

<style scoped>
.site-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

#tsparticles-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

</style>