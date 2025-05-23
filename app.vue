<template>
  <div class="site-container">
    <NuxtParticles
        id="tsparticles-background"
        :key="currentTheme"
        :options="currentParticlesOptions"
        @load="onParticlesLoaded"
    />

    <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
      <n-message-provider>
        <n-dialog-provider>
          <n-notification-provider>
            <n-loading-bar-provider>
              <div class="content-wrapper">
                <NuxtPage/>
              </div>
            </n-loading-bar-provider>
          </n-notification-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-config-provider>

    <HangingThemeToggle/>
    <UserProfileSettings v-if="isLoggedIn"/>
  </div>
</template>

<script setup lang="ts">
import {onMounted} from 'vue'; // computed 已被您的代码使用
import {useThemeManager} from "~/composables/useThemeManager";
import {useDynamicParticles} from "~/composables/useDynamicParticles";
import {useAuth} from "~/composables/useAuth";


import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NLoadingBarProvider,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides,
} from 'naive-ui';

// --- 您原有的脚本逻辑 ---
const {currentTheme, initializeTheme} = useThemeManager(); // currentTheme 来自您的 useThemeManager
const {currentParticlesOptions, onParticlesLoaded} = useDynamicParticles(currentTheme);
const {isLoggedIn, initializeAuthState} = useAuth(); // 移除了未使用的 fetchCurrentUser

onMounted(async () => {
  initializeTheme();
  await initializeAuthState();
});

const naiveTheme = ref(null); // null 代表亮色主题，或者导入 darkTheme 用于暗色

const themeOverrides: GlobalThemeOverrides = {}
</script>

<style scoped>
.site-container {
  position: relative;
  min-height: 100vh;
  display: flex; /* 使 n-config-provider 等能正确撑开 */
  flex-direction: column; /* 使 n-config-provider 等能正确撑开 */
}

/*
  让 Naive UI Providers 及其子元素 (content-wrapper)
  能够正确地填充 site-container 的空间。
  n-config-provider 等组件默认可能不会自动撑满父容器，
  除非其内容本身具有撑满特性。
*/
.n-config-provider,
.n-message-provider, /* 通常这些 provider 自身是不可见的，不会影响布局 */
.n-dialog-provider,
.n-notification-provider,
.n-loading-bar-provider {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}


.content-wrapper {
  position: relative;
  z-index: 1;
  min-height: 100vh; /* 如果希望内容区撑满，可以考虑 flex-grow: 1; */
  flex-grow: 1; /* 让内容区域在 provider 内部也能够撑开 */
  display: flex; /* 确保 NuxtPage 在内部可以正确布局 */
  flex-direction: column;
}

/*
  NuxtParticles 通常是绝对定位或固定定位作为背景，
  确保它的 z-index 低于 .content-wrapper 和其他前景元素。
  您可能已经在 NuxtParticles 组件或其选项中处理了这些。
*/
#tsparticles-background {
  position: fixed; /* 或者 absolute, 取决于您的期望 */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0; /* 确保在最底层 */
}

/* HangingThemeToggle 和 UserProfileSettings 的样式需要确保它们在正确的层级 */
/* 例如，HangingThemeToggle 可能需要 position: fixed 和较高的 z-index */
</style>