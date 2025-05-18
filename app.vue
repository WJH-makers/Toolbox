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

// --- 主题管理 ---
const {currentTheme, initializeTheme} = useThemeManager();

// --- 动态粒子效果 ---
const {currentParticlesOptions, onParticlesLoaded} = useDynamicParticles(currentTheme);

// --- 认证状态 ---
// isLoggedIn 和 user (authUser) 从全局 useAuth 获取
const {isLoggedIn, user: authUser, initializeAuthState, fetchCurrentUser} = useAuth();

onMounted(async () => {
  // 1. 初始化主题
  initializeTheme();
  // 2. 初始化认证状态
  // initializeAuthState 内部应该会调用 fetchCurrentUser 来尝试获取用户信息
  // 如果用户通过 httpOnly cookie 保持了登录状态
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